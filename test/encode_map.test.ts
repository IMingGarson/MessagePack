import { encode } from '../src/Encoder';
import { decode } from '../src/Decoder';

test("MAP16 test", () => {
    const testObj = new Array<null>(0x100).fill(null).reduce<Record<string, number>>((acc, _val, i) => {
        acc[`k${i}`] = i;
        return acc;
    }, {});
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("MAP32 test", () => {
    const testObj = new Array<null>(0x10000).fill(null).reduce<Record<string, number>>((acc, _val, i) => {
        acc[`k${i}`] = i;
        return acc;
    }, {});
    const encoded = encode(testObj);
    expect(encode(testObj)).toEqual(encoded);
});