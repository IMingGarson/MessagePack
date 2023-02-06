import { encode } from '../src/Encoder';

test("BIN16 test", () => {
    const result = new Uint8Array([...new Uint8Array([0xc5, 0x01, 0x00]), ...new Uint8Array(0x100).fill(0xff)])
    expect(encode(new Uint8Array(0x100).fill(0xff))).toEqual(result);
});

test("BIN32 test", () => {
    const result = new Uint8Array([...new Uint8Array([0xc6, 0x00, 0x01, 0x00, 0x00]), ...new Uint8Array(0x10_000).fill(0xff)])
    expect(encode(new Uint8Array(0x10_000).fill(0xff))).toEqual(result);
});