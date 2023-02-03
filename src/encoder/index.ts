import { setUint64, setInt64 } from '../utils/Int';

export const DEFAULT_MAX_DEPTH = 100;
export const DEFAULT_INITIAL_BUFFER_SIZE = 2048;

export class Encoder<ContextType = undefined> {
    // current butter positionS
    private pos = 0;
    private view = new DataView(new ArrayBuffer(this.initialBufferSize));
    private bytes = new Uint8Array(this.view.buffer);

    public constructor (
        private readonly maxDepth = DEFAULT_MAX_DEPTH,
        private readonly initialBufferSize = DEFAULT_INITIAL_BUFFER_SIZE 
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
        } 
        // else if (typeof object === "string") {
        //     this.encodeString(object);
        // } 
        // else {
        //     this.encodeObject(object, depth);
        // }
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
        if (!Number.isSafeInteger(object)) {
            throw new Error('Unsafe Integer Detected.');
        }
        // Handle Uint
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
            return;
        }

        // Handle Int with sign
        if (object >= -0x20) { // -32
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

    private encodeString(object: string): void
    {

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

    private writeI8(value: number): void {
        this.ensureBufferSizeToWrite(1);

        this.view.setInt8(this.pos, value);
        this.pos++;
    }

    private writeI16(value: number): void {
        this.ensureBufferSizeToWrite(2);
    
        this.view.setInt16(this.pos, value);
        this.pos += 2;
    }

    private writeI32(value: number): void {
        this.ensureBufferSizeToWrite(4);

        this.view.setInt32(this.pos, value);
        this.pos += 4;
    }

    private writeI64(value: number) {
        this.ensureBufferSizeToWrite(8);

        setInt64(this.view, this.pos, value);
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