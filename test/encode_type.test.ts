import { encode } from '../src/Encoder';
import { decode } from '../src/Decoder';

test("Nil test", () => {
    const testObj = null;
    const encoded = encode(testObj);
    expect(decode(encoded)).toEqual(testObj);
});
