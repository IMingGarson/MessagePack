import { encode } from '../src/Encoder';

test("Nil test", () => {
    expect(encode(null)).toEqual(new Uint8Array([0xc0]));
});
