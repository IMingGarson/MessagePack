import { encode } from '../src/Encoder';
import { decode } from '../src/Decoder';

test("BIN16 test", () => {
    const testObj = new Uint8Array(0x100).fill(0xff);
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("BIN32 test", () => {
    const testObj = new Uint8Array(0x10000).fill(0xff);
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});