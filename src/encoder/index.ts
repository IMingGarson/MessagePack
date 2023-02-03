
export const DEFAULT_MAX_DEPTH = 100;
export const DEFAULT_INITIAL_BUFFER_SIZE = 2048;

export class Encoder<ContextType = undefined> {
    // current butter position
    private pos = 0;
    private view = new DataView(new ArrayBuffer(this.initialBufferSize));
    private bytes = new Uint8Array(this.view.buffer);

    public constructor (
        private readonly context: ContextType = undefined as any,
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
        return this.bytes.slice(0, this.pos);
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
        } 
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
        // We take care of non-negative number first
        if (object >= 0) {

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