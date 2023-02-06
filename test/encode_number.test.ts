import { encode } from '../src/Encoder';
import { decode } from '../src/Decoder';

test("positive fixint test", () => {
    const testObj = 1;
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("uint8 test", () => {
    const testObj = 130;
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("uint16 test", () => {
    const testObj = 25583;
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("uint32 test", () => {
    const testObj = 527401;
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("uint64 test", () => {
    const testObj = 4294967297;
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("negative fixint test", () => {
    const testObj = -31;
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("int8 test", () => {
    const testObj = -63;
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("int16 test", () => {
    const testObj = -25535;
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("int32 test", () => {
    const testObj = -2147483646;
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("int64 test", () => {
    const testObj = Number.MIN_SAFE_INTEGER;
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("float 32 test", () => {
    const testObj = 3.14;
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});

test("float 64 test", () => {
    const testObj = 3.14;
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});