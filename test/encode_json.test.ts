import { encode } from '../src/Encoder';
import { decode } from '../src/Decoder';

test("json test", () => {
    const testObj = {
        "nil": null,
        "bool_false": false,
        "bool_true": true,
        "uint": 1,
        "int": -25,
        "ufloat": 3.14,
        "signed_float": -25.715,
        "str": "hello world!",
        "numeric_arr": [1, 2, 3],
        "alpha_arr": ["a", "b", "c"],
        "character_arr": ["嗨", "您好！"],
        "map16": new Array<null>(0x100).fill(null).reduce<Record<string, number>>((acc, _val, i) => {
            acc[`k${i}`] = i;
            return acc;
        }, {}),
        "array32": Array(0x10000).fill(0)
    };
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});