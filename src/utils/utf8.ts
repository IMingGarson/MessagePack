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
    for (let pos = 0; pos < strLen; pos++) {
        let value = str.charCodeAt(pos);
        // 1-byte
        if ((value & 0xffffff80) == 0) {
            output[offset++] = value;
            continue
        }
        // 2-byte
        if ((value & 0xfffff800) == 0) {
            output[offset++] = ((value >> 6) & 0x1f) | 0xc0;
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
