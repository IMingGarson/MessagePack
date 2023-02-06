"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encode = void 0;
const index_1 = require("./encoder/index");
const defaultEncodeOptions = {};
function encode(value, options = defaultEncodeOptions) {
    const encoder = new index_1.Encoder(options.extensionCodec, options.context, options.maxDepth, options.initialBufferSize, options.sortKeys, options.forceFloat32, options.ignoreUndefined, options.forceIntegerToFloat);
    return encoder.encode(value);
}
exports.encode = encode;
