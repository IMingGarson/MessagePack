import { Encoder } from "./encoder/index";

export function encode(value: unknown): Uint8Array {
    const encoder = new Encoder();
    return encoder.encode(value);
}