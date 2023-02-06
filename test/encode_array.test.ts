import { encode } from '../src/Encoder';
import { decode } from '../src/Decoder';

test("number array test", () => {
    const testObj = [1, 2, 3];
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("letter array test", () => {
    const testObj = ['a', 'b', 'c'];
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("special character array test", () => {
    const testObj = ['甲', 'β'];
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("array 16 test", () => {
    const testObj = Array(0x100).fill(0);
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("array 32 test", () => {
    const testObj = Array(0x10000).fill(0);
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});
