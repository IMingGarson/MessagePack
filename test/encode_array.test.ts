import { encode } from '../src/Encoder';

test("number array test", () => {
    expect(encode([1, 2, 3])).toEqual(new Uint8Array([0x093, 0x001, 0x002, 0x003]));
});

test("letter array test", () => {
    expect(encode(['a', 'b', 'c'])).toEqual(new Uint8Array([0x093, 0x0A1, 0x061, 0x0A1, 0x062, 0x0A1, 0x063]));
});

test("special character array test", () => {
    expect(encode(['甲', 'β'])).toEqual(new Uint8Array([0x092, 0x0A3, 0x0E7, 0x094, 0x0B2, 0x0A2, 0x0CE, 0x0B2]));
});

test("array 16 test", () => {
    expect(encode([1,2,3,1,2,3,1,2,3,1,2,3,1,2,3,1,2,3])).toEqual(
        new Uint8Array([
            0x0dc, 0x000, 0x012,
            0x001, 0x002, 0x003, 0x001, 0x002, 0x003, 0x001, 0x002, 0x003,
            0x001, 0x002, 0x003, 0x001, 0x002, 0x003, 0x001, 0x002, 0x003
        ])
    );
});
