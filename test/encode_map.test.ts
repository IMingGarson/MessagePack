import { encode } from '../src/Encoder';

test("MAP16 test", () => {
    const testObj = new Array<null>(0x100).fill(null).reduce<Record<string, number>>((acc, _val, i) => {
        acc[`k${i}`] = i;
        return acc;
    }, {});
    // TODO: test decode
    expect(1).toEqual(1);
});

test("MAP32 test", () => {
    const testObj = new Array<null>(0x10000).fill(null).reduce<Record<string, number>>((acc, _val, i) => {
        acc[`k${i}`] = i;
        return acc;
    }, {});
    // TODO: test decode
    expect(1).toEqual(1);
});