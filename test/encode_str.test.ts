import { encode } from '../src/Encoder';
import { decode } from '../src/Decoder';

test("fixstr alphanumeric test", () => {
    const testObj = "abc0123";
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("fixstr 2-byte test", () => {
    const testObj = "αβγ";
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("fixstr 3-byte characters test", () => {
    const testObj = "甲乙丙";
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("str 8 alphanumeric test", () => {
    const testObj = new Array(0x10).join('a');
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("str 8 chinese character test", () => {
    const testObj = new Array(0x10).join('嗨');
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("str 16 chinese character test", () => {
    const testObj = new Array(0x100).join('嗨');
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("str 32 chinese character test", () => {
    const testObj = new Array(0x10000).join('嗨');
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});