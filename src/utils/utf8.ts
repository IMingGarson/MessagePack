import { UINT32_MAX } from "./Int";

export function getStringSizeInByte(str: string): number
{
    let len = str.length;
    for (let i = len - 1; i >= 0; i--) {
        let code = str.charCodeAt(i);
        if (code > 0x7f && code <= 0x7ff) {
            len++;
        } else if (code > 0x7ff && code <= 0xffff) {
            len += 2
        }
        // trail surrogate pair
        if (code >= 0xDC00 && code <= 0xDFFF) {
            len--;
        }
    }
    return len;
}

export function utf8Encode(str: string, output: Uint8Array, outputOffset: number): void
{
    const strLen = str.length;
    let offset = outputOffset;
    let pos = 0;
    while (pos < strLen) {
        let value = str.charCodeAt(pos++);
        // 1-byte
        if ((value & 0xffffff80) == 0) {
            output[offset++] = value;
            continue;
        } 
        if ((value & 0xfffff800) == 0) {
            // 2-byte
            output[offset++] = ((value >> 6) & 0x1f) | 0xc0;
            output[offset++] = (value & 0x3f) | 0x80;
            continue;
        }

        // handle surrogate pair
        if (value >= 0xd800 && value <= 0xdbff)  {
            // high surrogate
            if (pos < strLen) {
                const extra = str.charCodeAt(pos);
                if ((extra & 0xfc00) === 0xdc00) {
                    ++pos;
                    value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
                }
            }
        }

        // 3-byte
        if ((value & 0xffff0000) === 0) {
            output[offset++] = ((value >> 12) & 0x0f) | 0xe0;
            output[offset++] = ((value >> 6) & 0x3f) | 0x80;
        } else {
            // 4-byte
            output[offset++] = ((value >> 18) & 0x07) | 0xf0;
            output[offset++] = ((value >> 12) & 0x3f) | 0x80;
            output[offset++] = ((value >> 6) & 0x3f) | 0x80;
        }

        output[offset++] = (value & 0x3f) | 0x80;
    }
}

const CHUNK_SIZE = 0x1_000;

export function utf8Decode(bytes: Uint8Array, inputOffset: number, byteLength: number): string {
    let offset = inputOffset;
    const end = offset + byteLength;

    const units: Array<number> = [];
    let result = "";
    while (offset < end) {
        const byte1 = bytes[offset++]!;
        if ((byte1 & 0x80) === 0) {
            // 1 byte
            units.push(byte1);
        } else if ((byte1 & 0xe0) === 0xc0) {
            // 2 bytes
            const byte2 = bytes[offset++]! & 0x3f;
            units.push(((byte1 & 0x1f) << 6) | byte2);
        } else if ((byte1 & 0xf0) === 0xe0) {
            // 3 bytes
            const byte2 = bytes[offset++]! & 0x3f;
            const byte3 = bytes[offset++]! & 0x3f;
            units.push(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
        } else if ((byte1 & 0xf8) === 0xf0) {
            // 4 bytes
            const byte2 = bytes[offset++]! & 0x3f;
            const byte3 = bytes[offset++]! & 0x3f;
            const byte4 = bytes[offset++]! & 0x3f;
            let unit = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
            if (unit > 0xffff) {
                unit -= 0x10000;
                units.push(((unit >>> 10) & 0x3ff) | 0xd800);
                unit = 0xdc00 | (unit & 0x3ff);
            }
                units.push(unit);
            } else {
                units.push(byte1);
            }

        if (units.length >= CHUNK_SIZE) {
            result += String.fromCharCode(...units);
            units.length = 0;
        }
    }

    if (units.length > 0) {
        result += String.fromCharCode(...units);
    }

    return result;
}

export const TEXT_ENCODER_THRESHOLD = 0;
export const TEXT_DECODER_THRESHOLD  = 0;