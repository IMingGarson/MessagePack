import { encode } from '../src/Encoder';

test("Nil test", () => {
    expect(encode(null)).toEqual(new Uint8Array([0xc0]));
});

test("positive fixint test", () => {
    expect(encode(1)).toEqual(new Uint8Array([0x01]));
});

test("uint8 test", () => {
    expect(encode(130)).toEqual(new Uint8Array([0xcc, 0x082]));
});

test("uint16 test", () => {
    expect(encode(25583)).toEqual(new Uint8Array([0xcd, 0x063, 0x0EF]));
});

test("uint32 test", () => {
    expect(encode(527401)).toEqual(new Uint8Array([0xce, 0x000, 0x008, 0x00C, 0x029]));
});

test("uint64 test", () => {
    expect(encode(4294967297)).toEqual(new Uint8Array([0xcf, 0x000, 0x000, 0x000, 0x001, 0x000, 0x000, 0x000, 0x001]));
});

test("negative fixint test", () => {
    expect(encode(-31)).toEqual(new Uint8Array([0x0E1]));
});

test("int8 test", () => {
    expect(encode(-63)).toEqual(new Uint8Array([0xd0, 0x0C1]));
});

test("int16 test", () => {
    expect(encode(-25535)).toEqual(new Uint8Array([0xd1, 0x09C, 0x041]));
});

test("int32 test", () => {
    expect(encode(-2147483646)).toEqual(new Uint8Array([0xd2, 0x080, 0x000, 0x000, 0x002]));
});

test("int64 test", () => {
    expect(encode(Number.MIN_SAFE_INTEGER)).toEqual(new Uint8Array([0xd3, 0x0FF, 0x0E0, 0x000, 0x000, 0x000, 0x000, 0x000, 0x001]));
});

test("float 32 test", () => {
    expect(encode(3.14, { forceFloat32: true })).toEqual(new Uint8Array([0xca, 0x040, 0x048, 0x0F5, 0x0C3]));
});

test("float 64 test", () => {
    expect(encode(3.14)).toEqual(new Uint8Array([0xcb, 0x040, 0x009, 0x01E, 0x0B8, 0x051, 0x0EB, 0x085, 0x01F]));
});