import { setUint64, setInt64 } from '../utils/Int';
import { getStringSizeInByte, utf8Encode } from '../utils/utf8';
import { ExtensionCodec, ExtensionCodecType } from "../ExtensionCodec";
import type { ExtData } from "../ExtData";
import { ensureUint8Array } from "../utils/typedArrays";

export const DEFAULT_MAX_DEPTH = 100;
export const DEFAULT_INITIAL_BUFFER_SIZE = 2048;

export class Encoder<ContextType = undefined> {
    // current butter positionS
    private pos = 0;
    private view = new DataView(new ArrayBuffer(this.initialBufferSize));
    private bytes = new Uint8Array(this.view.buffer);

    public constructor (
        private readonly extensionCodec: ExtensionCodecType<ContextType> = ExtensionCodec.defaultCodec as any,
        private readonly context: ContextType = undefined as any,
        private readonly maxDepth = DEFAULT_MAX_DEPTH,
        private readonly initialBufferSize = DEFAULT_INITIAL_BUFFER_SIZE,
        private readonly sortKeys = false,
        private readonly forceFloat32 = false,
        private readonly ignoreUndefined = false,
        private readonly forceIntegerToFloat = false,
    ) {}

    private reinitializeState() 
    {
        this.pos = 0;
    }
      
    public encode(object: unknown): Uint8Array 
    {
        this.reinitializeState();
        this.encodeByType(object, 1);
        return this.bytes.subarray(0, this.pos);
    }

    private encodeByType(object: unknown, depth: number): void
    {
        if (depth > this.maxDepth) {
            throw new Error(`Reach maximum depth: ${depth}`);
        }

        if (object == null) {
            this.encodeNil();
        } else if (typeof object === "boolean") {
            this.encodeBoolean(object);
        } else if (typeof object === "number") {
            this.encodeNumber(object);
        } else if (typeof object === "string") {
            this.encodeString(object);
        } else {
            this.encodeObject(object, depth);
        }
    }

    private encodeNil(): void
    {
        this.writeU8(0xc0);
    }

    private encodeBoolean(object: boolean): void
    {
        if (object === false) {
            this.writeU8(0xc2);
        } else {
            this.writeU8(0xc3);
        }
    }

    private encodeNumber(object: number): void
    {
        // Handle Integer number
        if (Number.isSafeInteger(object)) {
            // Handle Uint number
            if (object >= 0) {
                // positive fixint - stores 7-bit positive integer, ranging from -128 to 127
                if (object < 0x80) {
                    this.writeU8(object);
                }
                // uint 8 stores a 8-bit unsigned integer, ranging from 0 to 255
                else if (object < 0x100) {
                    this.writeU8(0xcc);
                    this.writeU8(object);
                }
                // uint 16 stores a 16-bit big-endian unsigned integer, raning from 0 to 65535
                else if (object < 0x10000) {
                    this.writeU8(0xcd);
                    this.writeU16(object);
                }
                // uint 32 stores a 32-bit big-endian unsigned integer, raning from 0 to 4294967295
                else if (object < 0x100000000) {
                    this.writeU8(0xce);
                    this.writeU32(object);
                }
                // uint 64 stores a 64-bit big-endian unsigned integer, raning from 0 to 4503599627370496
                else {
                    this.writeU8(0xcf);
                    this.writeU64(object);
                }
            } else {
                // Handle Signed Int
                if (object >= -0x20) { // -32
                    // 0xe0 is a 3 leading-one mask
                    this.writeU8(0xe0 | (object + 0x20));
                }
                // int 8, ranging from -128 to 127
                else if (object >= -0x80) {
                    this.writeU8(0xd0);
                    this.writeI8(object);
                }
                // int 16, ranging from -32768 to 32767
                else if (object >= -0x8000) {
                    this.writeU8(0xd1);
                    this.writeI16(object);
                }
                // int 32, ranging from -2147483648 to 2147483647
                else if (object >= -0x80000000) {
                    this.writeU8(0xd2);
                    this.writeI32(object);
                } else {
                    this.writeU8(0xd3);
                    this.writeI64(object);
                }
            }
            return;
        }

        // Handle Non-integer number
        if (this.forceFloat32) {
            this.writeU8(0xca);
            this.writeF32(object);
        } else {
            this.writeU8(0xcb);
            this.writeF64(object);
        }
    }

    private encodeString(object: string): void
    {
        const maxHeaderSize = 5;
        const byteLen = getStringSizeInByte(object);
        this.ensureBufferSizeToWrite(maxHeaderSize + byteLen);
        // Write string header
        this.writeStringHeader(byteLen);
        // Write string data
        utf8Encode(object, this.bytes, this.pos);
        
        this.pos += byteLen;
    }

    private encodeObject(object: object, depth: number): void
    {
        // try to encode objects with custom codec first of non-primitives
        const ext = this.extensionCodec.tryToEncode(object, this.context);
        if (ext != null) {
            this.encodeExtension(ext);
        } else if (Array.isArray(object)) {
            this.encodeArray(object, depth);
        } else if (ArrayBuffer.isView(object)) {
            this.encodeBinary(object);
        }
    }

    private encodeBinary(object: ArrayBufferView): void
    {
        const size = object.byteLength;
        if (size < 0x100) {
            // bin 8
            this.writeU8(0xc4);
            this.writeU8(size);
        } else if (size < 0x10000) {
            // bin 16
            this.writeU8(0xc5);
            this.writeU16(size);
        } else if (size < 0x100000000) {
            // bin 32
            this.writeU8(0xc6);
            this.writeU32(size);
        } else {
            throw new Error(`Too large binary: ${size}`);
        }
        const bytes = ensureUint8Array(object);
        this.writeU8a(bytes);
    } 

    private encodeArray(object: Array<unknown>, depth: number): void 
    {
        const size = object.length;
        if (size < 16) {
            // fixarray
            this.writeU8(0x90 + size);
        } else if (size < 0x10000) {
            // array 16
            this.writeU8(0xdc);
            this.writeU16(size);
        } else if (size < 0x100000000) {
            // array 32
            this.writeU8(0xdd);
            this.writeU32(size);
        } else {
            throw new Error(`Too large array: ${size}`);
        }
        for (const item of object) {
            this.encodeByType(item, depth + 1);
        }
    }

    private encodeExtension(ext: ExtData): void
    {
        const size = ext.data.length;
        if (size === 1) {
            // fixext 1
            this.writeU8(0xd4);
        } else if (size === 2) {
            // fixext 2
            this.writeU8(0xd5);
        } else if (size === 4) {
            // fixext 4
            this.writeU8(0xd6);
        } else if (size === 8) {
            // fixext 8
            this.writeU8(0xd7);
        } else if (size === 16) {
            // fixext 16
            this.writeU8(0xd8);
        } else if (size < 0x100) {
            // ext 8
            this.writeU8(0xc7);
            this.writeU8(size);
        } else if (size < 0x10000) {
            // ext 16
            this.writeU8(0xc8);
            this.writeU16(size);
        } else if (size < 0x100000000) {
            // ext 32
            this.writeU8(0xc9);
            this.writeU32(size);
        } else {
            throw new Error(`Too large extension object: ${size}`);
        }
        this.writeI8(ext.type);
        this.writeU8a(ext.data);
    }

    private writeU8a(values: ArrayLike<number>) {
        const size = values.length;
        this.ensureBufferSizeToWrite(size);

        this.bytes.set(values, this.pos);
        this.pos += size;
    }

    private writeStringHeader(byteLen: number): void
    {
        if (byteLen < 32) {
            // fixstr 0xa0 = 10100000 in binary
            this.writeU8(0xa0 + byteLen);
        } else if (byteLen < 0x100) {
            // str 8 stores a byte array whose length is upto (2^8)-1 bytes
            this.writeU8(0xd9)
            this.writeU8(byteLen);
        } else if (byteLen < 0x10000) {
            // str 16 stores a byte array whose length is upto (2^16)-1 bytes:
            this.writeU8(0xda)
            this.writeU16(byteLen);
        } else if (byteLen < 0x100000000) {
            // str 32 stores a byte array whose length is upto (2^32)-1 bytes
            this.writeU8(0xdb)
            this.writeU32(byteLen);
        } else {
            throw new Error(`Maximum length encountered. ${byteLen} bytes in UTF-8`);
        }
    }

    private writeU8(value: number): void 
    {
        this.ensureBufferSizeToWrite(1);

        this.view.setUint8(this.pos, value);
        this.pos++;
    }

    private writeU16(value: number): void
    {
        this.ensureBufferSizeToWrite(2);

        this.view.setUint16(this.pos, value);
        this.pos += 2;
    }

    private writeU32(value: number): void
    {
        this.ensureBufferSizeToWrite(4);

        this.view.setInt32(this.pos, value);
        this.pos += 4;
    }

    private writeU64(value: number): void
    {
        this.ensureBufferSizeToWrite(8);

        setUint64(this.view, this.pos, value);
        this.pos += 8;
    }

    private writeI8(value: number): void 
    {
        this.ensureBufferSizeToWrite(1);

        this.view.setInt8(this.pos, value);
        this.pos++;
    }

    private writeI16(value: number): void 
    {
        this.ensureBufferSizeToWrite(2);
    
        this.view.setInt16(this.pos, value);
        this.pos += 2;
    }

    private writeI32(value: number): void 
    {
        this.ensureBufferSizeToWrite(4);

        this.view.setInt32(this.pos, value);
        this.pos += 4;
    }

    private writeI64(value: number): void 
    {
        this.ensureBufferSizeToWrite(8);

        setInt64(this.view, this.pos, value);
        this.pos += 8;
    }

    private writeF32(value: number): void 
    {
        this.ensureBufferSizeToWrite(4);

        this.view.setFloat32(this.pos, value);
        this.pos += 4;
    }

    private writeF64(value: number): void 
    {
        this.ensureBufferSizeToWrite(8);
        
        this.view.setFloat64(this.pos, value);
        this.pos += 8;
    }

    private ensureBufferSizeToWrite(neededSize: number): void
    {
        const requiredSize = this.pos + neededSize;
        if (this.bytes.byteLength < requiredSize) {
            this.resizeBuffer(requiredSize * 2);
        }
    }

    private resizeBuffer(newSize: number): void
    {
        const newBuffer = new ArrayBuffer(newSize);
        const newBytes = new Uint8Array(newBuffer);
        const newView = new DataView(newBuffer);

        newBytes.set(this.bytes);

        this.view = newView;
        this.bytes = newBytes;
    }
}