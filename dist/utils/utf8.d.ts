export declare function getStringSizeInByte(str: string): number;
export declare function utf8Encode(str: string, output: Uint8Array, outputOffset: number): void;
export declare function utf8Decode(bytes: Uint8Array, inputOffset: number, byteLength: number): string;
export declare const TEXT_ENCODER_THRESHOLD = 0;
export declare const TEXT_DECODER_THRESHOLD = 0;
