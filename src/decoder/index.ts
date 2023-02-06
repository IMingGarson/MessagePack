import { prettyByte } from "../utils/prettyByte";
import { ExtensionCodec, ExtensionCodecType } from "../ExtensionCodec";
import { getInt64, getUint64, UINT32_MAX } from "../utils/Int";
import { utf8Decode, TEXT_DECODER_THRESHOLD } from "../utils/utf8";
import { createDataView, ensureUint8Array } from "../utils/typedArrays";
import { DecodeError } from "../DecodeError";

const STATE_ARRAY = "array";
const STATE_MAP_KEY = "map_key";
const STATE_MAP_VALUE = "map_value";
const isValidMapKeyType = (key: unknown): key is MapKeyType => {
    const keyType = typeof key;
    return keyType === "string" || keyType === "number";
};

type MapKeyType = string | number;

type StackMapState = {
    type: typeof STATE_MAP_KEY | typeof STATE_MAP_VALUE;
    size: number;
    key: MapKeyType | null;
    readCount: number;
    map: Record<string, unknown>;
};
  
type StackArrayState = {
    type: typeof STATE_ARRAY;
    size: number;
    array: Array<unknown>;
    position: number;
};

type StackState = StackArrayState | StackMapState;

const HEAD_BYTE_REQUIRED = -1;
const EMPTY_VIEW = new DataView(new ArrayBuffer(0));
const EMPTY_BYTES = new Uint8Array(EMPTY_VIEW.buffer);

export class Decoder<ContextType = undefined> {
    private totalPos = 0;
    private pos = 0;

    private view = EMPTY_VIEW;
    private bytes = EMPTY_BYTES;
    private headByte = -1;
    private readonly stack: Array<StackState> = [];

    public constructor(
        private readonly extensionCodec: ExtensionCodecType<ContextType> = ExtensionCodec.defaultCodec as any,
        private readonly context: ContextType = undefined as any,
        private readonly maxStrLength = UINT32_MAX,
        private readonly maxBinLength = UINT32_MAX,
        private readonly maxArrayLength = UINT32_MAX,
        private readonly maxMapLength = UINT32_MAX,
        private readonly maxExtLength = UINT32_MAX,
        // private readonly keyDecoder: KeyDecoder | null = sharedCachedKeyDecoder,
    ) {}

    private reinitializeState(): void
    {
        this.totalPos = 0;
        this.headByte = HEAD_BYTE_REQUIRED;
        this.stack.length = 0;
    }

    private setBuffer(buffer: ArrayLike<number> | BufferSource): void 
    {
        this.bytes = ensureUint8Array(buffer);
        this.view = createDataView(this.bytes);
        this.pos = 0;
    }

    public decode(buffer: ArrayLike<number> | BufferSource): unknown 
    {
        this.reinitializeState();
        this.setBuffer(buffer);

        const object = this.doDecodeSync();
        if (this.hasRemaining(1)) {
            throw this.createExtraByteError(this.pos);
        }

        return object;
    }

    private doDecodeSync(): unknown
    {
        DECODE: while (true) {
            // Get header bytes first
            const headByte = this.readHeadByte();
            let object: unknown;

            if (headByte >= 0xe0) {
                // negative fixint (111x xxxx) 0xe0 - 0xff
                object = headByte - 0x100;
            } else if (headByte < 0xc0) {
                if (headByte < 0x80) {
                    // positive fixint (0xxx xxxx) 0x00 - 0x7f
                    object = headByte;
                } else if (headByte < 0x90) {
                    // fixmap (1000 xxxx) 0x80 - 0x8f
                    const size = headByte - 0x80;
                    if (size !== 0) {
                        this.pushMapState(size);
                        this.complete();
                        continue DECODE;
                    } else {
                        object = {};
                    }
                } else if (headByte < 0xa0) {
                    // fixarray (1001 xxxx) 0x90 - 0x9f
                    const size = headByte - 0x90;
                    if (size !== 0) {
                        this.pushArrayState(size);
                        this.complete();
                        continue DECODE;
                    } else {
                        object = [];
                    }
                } else {
                    // fixstr (101x xxxx) 0xa0 - 0xbf
                    const byteLength = headByte - 0xa0;
                    object = this.decodeUtf8String(byteLength, 0);
                }
            } else if (headByte === 0xc0) {
                object = null;
            } else if (headByte === 0xc2) {
                // false
                object = false;
            } else if (headByte === 0xc3) {
                // true
                object = true;
            } else if (headByte === 0xca) {
                // float 32
                object = this.readF32();
            } else if (headByte === 0xcb) {
                // float 64
                object = this.readF64();
            } else if (headByte === 0xcc) {
                // uint 8
                object = this.readU8();
            } else if (headByte === 0xcd) {
                // uint 16
                object = this.readU16();
            } else if (headByte === 0xce) {
                // uint 32
                object = this.readU32();
            } else if (headByte === 0xcf) {
                // uint 64
                object = this.readU64();
            } else if (headByte === 0xd0) {
                // int 8
                object = this.readI8();
            } else if (headByte === 0xd1) {
                // int 16
                object = this.readI16();
            } else if (headByte === 0xd2) {
                // int 32
                object = this.readI32();
            } else if (headByte === 0xd3) {
                // int 64
                object = this.readI64();
            } else if (headByte === 0xd9) {
                // str 8
                const byteLength = this.lookU8();
                object = this.decodeUtf8String(byteLength, 1);
            } else if (headByte === 0xda) {
                // str 16
                const byteLength = this.lookU16();
                object = this.decodeUtf8String(byteLength, 2);
            } else if (headByte === 0xdb) {
                // str 32
                const byteLength = this.lookU32();
                object = this.decodeUtf8String(byteLength, 4);
            } else if (headByte === 0xdc) {
                // array 16
                const size = this.readU16();
                if (size !== 0) {
                    this.pushArrayState(size);
                    this.complete();
                    continue DECODE;
                } else {
                    object = [];
                }
            } else if (headByte === 0xdd) {
                 // array 32
                const size = this.readU32();
                if (size !== 0) {
                    this.pushArrayState(size);
                    this.complete();
                    continue DECODE;
                } else {
                    object = [];
                }
            } else if (headByte === 0xde) {
                // map 16
                const size = this.readU16();
                if (size !== 0) {
                    this.pushMapState(size);
                    this.complete();
                    continue DECODE;
                } else {
                    object = {};
                }
            } else if (headByte === 0xdf) {
                // map 32
                const size = this.readU32();
                if (size !== 0) {
                    this.pushMapState(size);
                    this.complete();
                    continue DECODE;
                } else {
                    object = {};
                }
            }  else if (headByte === 0xc4) {
                // bin 8
                const size = this.lookU8();
                object = this.decodeBinary(size, 1);
            } else if (headByte === 0xc5) {
                // bin 16
                const size = this.lookU16();
                object = this.decodeBinary(size, 2);
            } else if (headByte === 0xc6) {
                // bin 32
                const size = this.lookU32();
                object = this.decodeBinary(size, 4);
            } else if (headByte === 0xd4) {
                // fixext 1
                object = this.decodeExtension(1, 0);
            } else if (headByte === 0xd5) {
                // fixext 2
                object = this.decodeExtension(2, 0);
            } else if (headByte === 0xd6) {
                // fixext 4
                object = this.decodeExtension(4, 0);
            } else if (headByte === 0xd7) {
                // fixext 8
                object = this.decodeExtension(8, 0);
            } else if (headByte === 0xd8) {
                // fixext 16
                object = this.decodeExtension(16, 0);
            } else if (headByte === 0xc7) {
                 // ext 8
                const size = this.lookU8();
                object = this.decodeExtension(size, 1);
            } else if (headByte === 0xc8) {
                // ext 16
                const size = this.lookU16();
                object = this.decodeExtension(size, 2);
            } else if (headByte === 0xc9) {
                // ext 32
                const size = this.lookU32();
                object = this.decodeExtension(size, 4);
            } else {
                throw new DecodeError(`Unrecognized type byte: ${prettyByte(headByte)}`);
            }

            this.complete();
            const stack = this.stack;
            while (stack.length > 0) {
                // start decoding array and maps
                const state = stack[stack.length - 1]!;
                if (state.type === STATE_ARRAY) {
                    state.array[state.position] = object;
                    state.position++;
                    if (state.position === state.size) {
                        stack.pop();
                        object = state.array;
                    } else {
                        continue DECODE;
                    }
                } else if (state.type === STATE_MAP_KEY) {
                    if (!isValidMapKeyType(object)) {
                        throw new DecodeError("The type of key must be string or number but " + typeof object);
                    }
                    if (object === "__proto__") {
                        throw new DecodeError("The key __proto__ is not allowed");
                    }
                    state.key = object;
                    state.type = STATE_MAP_VALUE;
                    continue DECODE;
                } else {
                    state.map[state.key!] = object;
                    state.readCount++;

                    if (state.readCount === state.size) {
                        stack.pop();
                        object = state.map;
                    } else {
                        state.key = null;
                        state.type = STATE_MAP_KEY;
                        continue DECODE;
                    }
                }
            }
            return object;
        }
    }

    private createExtraByteError(posToShow: number): Error 
    {
        const { view, pos } = this;
        return new RangeError(`Extra ${view.byteLength - pos} of ${view.byteLength} byte(s) found at buffer[${posToShow}]`);
    }

    private decodeExtension(size: number, headOffset: number): unknown {
        if (size > this.maxExtLength) {
            throw new DecodeError(`Max length exceeded: ext length (${size}) > maxExtLength (${this.maxExtLength})`);
        }

        const extType = this.view.getInt8(this.pos + headOffset);
        const data = this.decodeBinary(size, headOffset + 1 /* extType */);
        return this.extensionCodec.decode(data, extType, this.context);
    }

    private decodeBinary(byteLength: number, headOffset: number): Uint8Array {
        if (byteLength > this.maxBinLength) {
            throw new DecodeError(`Max length exceeded: bin length (${byteLength}) > maxBinLength (${this.maxBinLength})`);
        }

        // if (!this.hasRemaining(byteLength + headOffset)) {
        //     throw new DecodeError("Insufficient data");
        // }

        const offset = this.pos + headOffset;
        const object = this.bytes.subarray(offset, offset + byteLength);
        this.pos += headOffset + byteLength;
        return object;
    }

    private decodeUtf8String(byteLength: number, headerOffset: number): string
    {
        if (byteLength > this.maxStrLength) {
            throw new DecodeError(
                `Max length exceeded: UTF-8 byte length (${byteLength}) > maxStrLength (${this.maxStrLength})`,
            );
        }

        // if (this.bytes.byteLength < this.pos + headerOffset + byteLength) {
        //     throw new DecodeError("Insufficient data");
        // }

        const offset = this.pos + headerOffset;
        let object: string;
        // if (this.stateIsMapKey() && this.keyDecoder?.canBeCached(byteLength)) {
        //     object = this.keyDecoder.decode(this.bytes, offset, byteLength);
        // } else if (byteLength > TEXT_DECODER_THRESHOLD) {
        //     object = utf8DecodeTD(this.bytes, offset, byteLength);
        // } else {
        //     object = utf8Decode(this.bytes, offset, byteLength);
        // }
        // TODO
        object = utf8Decode(this.bytes, offset, byteLength);
        this.pos += headerOffset + byteLength;

        return object;
    }

    private pushArrayState(size: number): void 
    {
        if (size > this.maxArrayLength) {
            throw new DecodeError(`Max length exceeded: array length (${size}) > maxArrayLength (${this.maxArrayLength})`);
        }

        this.stack.push({
            type: STATE_ARRAY,
            size,
            array: new Array<unknown>(size),
            position: 0,
        });
    }

    private pushMapState(size: number): void
    {
        if (size > this.maxMapLength) {
            throw new DecodeError(`Max length exceeded: map length (${size}) > maxMapLengthLength (${this.maxMapLength})`);
        }

        this.stack.push({
            type: STATE_MAP_KEY,
            size,
            key: null,
            readCount: 0,
            map: {},
        });
    }

    private complete(): void 
    {
        this.headByte = HEAD_BYTE_REQUIRED;
    }

    private readHeadByte(): number 
    {
        if (this.headByte === HEAD_BYTE_REQUIRED) {
            this.headByte = this.readU8();
        }

        return this.headByte;
    }

    private readU8(): number 
    {
        const value = this.view.getUint8(this.pos);
        this.pos++;
        return value;
    }

    private readI8(): number {
        const value = this.view.getInt8(this.pos);
        this.pos++;
        return value;
    }

    private readU16(): number {
        const value = this.view.getUint16(this.pos);
        this.pos += 2;
        return value;
    }
    
    private readI16(): number {
        const value = this.view.getInt16(this.pos);
        this.pos += 2;
        return value;
    }
    
    private readU32(): number {
        const value = this.view.getUint32(this.pos);
        this.pos += 4;
        return value;
    }
    
    private readI32(): number {
        const value = this.view.getInt32(this.pos);
        this.pos += 4;
        return value;
    }
    
    private readU64(): number {
        const value = getUint64(this.view, this.pos);
        this.pos += 8;
        return value;
    }
    
    private readI64(): number {
        const value = getInt64(this.view, this.pos);
        this.pos += 8;
        return value;
    }
    
    private readF32(): number {
        const value = this.view.getFloat32(this.pos);
        this.pos += 4;
        return value;
    }
    
    private readF64(): number {
        const value = this.view.getFloat64(this.pos);
        this.pos += 8;
        return value;
    }

    private lookU8(): number {
        return this.view.getUint8(this.pos);
    }
    
    private lookU16(): number {
        return this.view.getUint16(this.pos);
    }
    
    private lookU32(): number {
        return this.view.getUint32(this.pos);
    }

    private hasRemaining(size: number) {
        return this.view.byteLength - this.pos >= size;
    }
}