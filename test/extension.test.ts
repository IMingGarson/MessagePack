import { encode } from '../src/Encoder';
import { decode } from '../src/Decoder';
import { ExtData } from '../src/ExtData';

// customize type number
function seq (n: number): Uint8Array {
    const a: Array<number> = [];
    for (let i = 0; i < n; i++) {
        a.push((i + 1) % 0xff);
    }
    return Uint8Array.from(a);
}

test("extension test", () => {
    const SPECS = {
        FIXEXT1: [0xd4, new ExtData(0, seq(1))],
        FIXEXT2: [0xd5, new ExtData(0, seq(2))],
        FIXEXT4: [0xd6, new ExtData(0, seq(4))],
        FIXEXT8: [0xd7, new ExtData(0, seq(8))],
        FIXEXT16: [0xd8, new ExtData(0, seq(16))],
        EXT8: [0xc7, new ExtData(0, seq(17))],
        EXT16: [0xc8, new ExtData(0, seq(0x100))],
        EXT32: [0xc9, new ExtData(0, seq(0x10000))],
    } as Record<string, [number, ExtData]>;

    for (const name of Object.keys(SPECS)) {
        const [msgpackType, extData] = SPECS[name]!;
        const encoded = encode(extData);
        expect(encoded[0]).toEqual(msgpackType); // check type
        expect(decode(encoded)).toEqual(extData); // check acutal data
    }
});