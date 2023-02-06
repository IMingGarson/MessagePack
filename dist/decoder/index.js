"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Decoder = void 0;
const prettyByte_1 = require("../utils/prettyByte");
const ExtensionCodec_1 = require("../ExtensionCodec");
const Int_1 = require("../utils/Int");
const utf8_1 = require("../utils/utf8");
const typedArrays_1 = require("../utils/typedArrays");
const DecodeError_1 = require("../DecodeError");
const STATE_ARRAY = "array";
const STATE_MAP_KEY = "map_key";
const STATE_MAP_VALUE = "map_value";
const isValidMapKeyType = (key) => {
    const keyType = typeof key;
    return keyType === "string" || keyType === "number";
};
const HEAD_BYTE_REQUIRED = -1;
const EMPTY_VIEW = new DataView(new ArrayBuffer(0));
const EMPTY_BYTES = new Uint8Array(EMPTY_VIEW.buffer);
class Decoder {
    constructor(extensionCodec = ExtensionCodec_1.ExtensionCodec.defaultCodec, context = undefined, maxStrLength = Int_1.UINT32_MAX, maxBinLength = Int_1.UINT32_MAX, maxArrayLength = Int_1.UINT32_MAX, maxMapLength = Int_1.UINT32_MAX, maxExtLength = Int_1.UINT32_MAX) {
        this.extensionCodec = extensionCodec;
        this.context = context;
        this.maxStrLength = maxStrLength;
        this.maxBinLength = maxBinLength;
        this.maxArrayLength = maxArrayLength;
        this.maxMapLength = maxMapLength;
        this.maxExtLength = maxExtLength;
        this.totalPos = 0;
        this.pos = 0;
        this.view = EMPTY_VIEW;
        this.bytes = EMPTY_BYTES;
        this.headByte = -1;
        this.stack = [];
    }
    reinitializeState() {
        this.totalPos = 0;
        this.headByte = HEAD_BYTE_REQUIRED;
        this.stack.length = 0;
    }
    setBuffer(buffer) {
        this.bytes = (0, typedArrays_1.ensureUint8Array)(buffer);
        this.view = (0, typedArrays_1.createDataView)(this.bytes);
        this.pos = 0;
    }
    decode(buffer) {
        this.reinitializeState();
        this.setBuffer(buffer);
        const object = this.doDecodeSync();
        if (this.hasRemaining(1)) {
            throw this.createExtraByteError(this.pos);
        }
        return object;
    }
    doDecodeSync() {
        DECODE: while (true) {
            // Get header bytes first
            const headByte = this.readHeadByte();
            let object;
            if (headByte >= 0xe0) {
                // negative fixint (111x xxxx) 0xe0 - 0xff
                object = headByte - 0x100;
            }
            else if (headByte < 0xc0) {
                if (headByte < 0x80) {
                    // positive fixint (0xxx xxxx) 0x00 - 0x7f
                    object = headByte;
                }
                else if (headByte < 0x90) {
                    // fixmap (1000 xxxx) 0x80 - 0x8f
                    const size = headByte - 0x80;
                    if (size !== 0) {
                        this.pushMapState(size);
                        this.complete();
                        continue DECODE;
                    }
                    else {
                        object = {};
                    }
                }
                else if (headByte < 0xa0) {
                    // fixarray (1001 xxxx) 0x90 - 0x9f
                    const size = headByte - 0x90;
                    if (size !== 0) {
                        this.pushArrayState(size);
                        this.complete();
                        continue DECODE;
                    }
                    else {
                        object = [];
                    }
                }
                else {
                    // fixstr (101x xxxx) 0xa0 - 0xbf
                    const byteLength = headByte - 0xa0;
                    object = this.decodeUtf8String(byteLength, 0);
                }
            }
            else if (headByte === 0xc0) {
                object = null;
            }
            else if (headByte === 0xc2) {
                // false
                object = false;
            }
            else if (headByte === 0xc3) {
                // true
                object = true;
            }
            else if (headByte === 0xca) {
                // float 32
                object = this.readF32();
            }
            else if (headByte === 0xcb) {
                // float 64
                object = this.readF64();
            }
            else if (headByte === 0xcc) {
                // uint 8
                object = this.readU8();
            }
            else if (headByte === 0xcd) {
                // uint 16
                object = this.readU16();
            }
            else if (headByte === 0xce) {
                // uint 32
                object = this.readU32();
            }
            else if (headByte === 0xcf) {
                // uint 64
                object = this.readU64();
            }
            else if (headByte === 0xd0) {
                // int 8
                object = this.readI8();
            }
            else if (headByte === 0xd1) {
                // int 16
                object = this.readI16();
            }
            else if (headByte === 0xd2) {
                // int 32
                object = this.readI32();
            }
            else if (headByte === 0xd3) {
                // int 64
                object = this.readI64();
            }
            else if (headByte === 0xd9) {
                // str 8
                const byteLength = this.lookU8();
                object = this.decodeUtf8String(byteLength, 1);
            }
            else if (headByte === 0xda) {
                // str 16
                const byteLength = this.lookU16();
                object = this.decodeUtf8String(byteLength, 2);
            }
            else if (headByte === 0xdb) {
                // str 32
                const byteLength = this.lookU32();
                object = this.decodeUtf8String(byteLength, 4);
            }
            else if (headByte === 0xdc) {
                // array 16
                const size = this.readU16();
                if (size !== 0) {
                    this.pushArrayState(size);
                    this.complete();
                    continue DECODE;
                }
                else {
                    object = [];
                }
            }
            else if (headByte === 0xdd) {
                // array 32
                const size = this.readU32();
                if (size !== 0) {
                    this.pushArrayState(size);
                    this.complete();
                    continue DECODE;
                }
                else {
                    object = [];
                }
            }
            else if (headByte === 0xde) {
                // map 16
                const size = this.readU16();
                if (size !== 0) {
                    this.pushMapState(size);
                    this.complete();
                    continue DECODE;
                }
                else {
                    object = {};
                }
            }
            else if (headByte === 0xdf) {
                // map 32
                const size = this.readU32();
                if (size !== 0) {
                    this.pushMapState(size);
                    this.complete();
                    continue DECODE;
                }
                else {
                    object = {};
                }
            }
            else if (headByte === 0xc4) {
                // bin 8
                const size = this.lookU8();
                object = this.decodeBinary(size, 1);
            }
            else if (headByte === 0xc5) {
                // bin 16
                const size = this.lookU16();
                object = this.decodeBinary(size, 2);
            }
            else if (headByte === 0xc6) {
                // bin 32
                const size = this.lookU32();
                object = this.decodeBinary(size, 4);
            }
            else if (headByte === 0xd4) {
                // fixext 1
                object = this.decodeExtension(1, 0);
            }
            else if (headByte === 0xd5) {
                // fixext 2
                object = this.decodeExtension(2, 0);
            }
            else if (headByte === 0xd6) {
                // fixext 4
                object = this.decodeExtension(4, 0);
            }
            else if (headByte === 0xd7) {
                // fixext 8
                object = this.decodeExtension(8, 0);
            }
            else if (headByte === 0xd8) {
                // fixext 16
                object = this.decodeExtension(16, 0);
            }
            else if (headByte === 0xc7) {
                // ext 8
                const size = this.lookU8();
                object = this.decodeExtension(size, 1);
            }
            else if (headByte === 0xc8) {
                // ext 16
                const size = this.lookU16();
                object = this.decodeExtension(size, 2);
            }
            else if (headByte === 0xc9) {
                // ext 32
                const size = this.lookU32();
                object = this.decodeExtension(size, 4);
            }
            else {
                throw new DecodeError_1.DecodeError(`Unrecognized type byte: ${(0, prettyByte_1.prettyByte)(headByte)}`);
            }
            this.complete();
            const stack = this.stack;
            while (stack.length > 0) {
                // start decoding array and maps
                const state = stack[stack.length - 1];
                if (state.type === STATE_ARRAY) {
                    state.array[state.position] = object;
                    state.position++;
                    if (state.position === state.size) {
                        stack.pop();
                        object = state.array;
                    }
                    else {
                        continue DECODE;
                    }
                }
                else if (state.type === STATE_MAP_KEY) {
                    if (!isValidMapKeyType(object)) {
                        throw new DecodeError_1.DecodeError("The type of key must be string or number but " + typeof object);
                    }
                    if (object === "__proto__") {
                        throw new DecodeError_1.DecodeError("The key __proto__ is not allowed");
                    }
                    state.key = object;
                    state.type = STATE_MAP_VALUE;
                    continue DECODE;
                }
                else {
                    state.map[state.key] = object;
                    state.readCount++;
                    if (state.readCount === state.size) {
                        stack.pop();
                        object = state.map;
                    }
                    else {
                        state.key = null;
                        state.type = STATE_MAP_KEY;
                        continue DECODE;
                    }
                }
            }
            return object;
        }
    }
    createExtraByteError(posToShow) {
        const { view, pos } = this;
        return new RangeError(`Extra ${view.byteLength - pos} of ${view.byteLength} byte(s) found at buffer[${posToShow}]`);
    }
    decodeExtension(size, headOffset) {
        if (size > this.maxExtLength) {
            throw new DecodeError_1.DecodeError(`Max length exceeded: ext length (${size}) > maxExtLength (${this.maxExtLength})`);
        }
        const extType = this.view.getInt8(this.pos + headOffset);
        const data = this.decodeBinary(size, headOffset + 1 /* extType */);
        return this.extensionCodec.decode(data, extType, this.context);
    }
    decodeBinary(byteLength, headOffset) {
        if (byteLength > this.maxBinLength) {
            throw new DecodeError_1.DecodeError(`Max length exceeded: bin length (${byteLength}) > maxBinLength (${this.maxBinLength})`);
        }
        // if (!this.hasRemaining(byteLength + headOffset)) {
        //     throw new DecodeError("Insufficient data");
        // }
        const offset = this.pos + headOffset;
        const object = this.bytes.subarray(offset, offset + byteLength);
        this.pos += headOffset + byteLength;
        return object;
    }
    decodeUtf8String(byteLength, headerOffset) {
        if (byteLength > this.maxStrLength) {
            throw new DecodeError_1.DecodeError(`Max length exceeded: UTF-8 byte length (${byteLength}) > maxStrLength (${this.maxStrLength})`);
        }
        // if (this.bytes.byteLength < this.pos + headerOffset + byteLength) {
        //     throw new DecodeError("Insufficient data");
        // }
        const offset = this.pos + headerOffset;
        let object;
        // if (this.stateIsMapKey() && this.keyDecoder?.canBeCached(byteLength)) {
        //     object = this.keyDecoder.decode(this.bytes, offset, byteLength);
        // } else if (byteLength > TEXT_DECODER_THRESHOLD) {
        //     object = utf8DecodeTD(this.bytes, offset, byteLength);
        // } else {
        //     object = utf8Decode(this.bytes, offset, byteLength);
        // }
        // TODO
        object = (0, utf8_1.utf8Decode)(this.bytes, offset, byteLength);
        this.pos += headerOffset + byteLength;
        return object;
    }
    pushArrayState(size) {
        if (size > this.maxArrayLength) {
            throw new DecodeError_1.DecodeError(`Max length exceeded: array length (${size}) > maxArrayLength (${this.maxArrayLength})`);
        }
        this.stack.push({
            type: STATE_ARRAY,
            size,
            array: new Array(size),
            position: 0,
        });
    }
    pushMapState(size) {
        if (size > this.maxMapLength) {
            throw new DecodeError_1.DecodeError(`Max length exceeded: map length (${size}) > maxMapLengthLength (${this.maxMapLength})`);
        }
        this.stack.push({
            type: STATE_MAP_KEY,
            size,
            key: null,
            readCount: 0,
            map: {},
        });
    }
    complete() {
        this.headByte = HEAD_BYTE_REQUIRED;
    }
    readHeadByte() {
        if (this.headByte === HEAD_BYTE_REQUIRED) {
            this.headByte = this.readU8();
        }
        return this.headByte;
    }
    readU8() {
        const value = this.view.getUint8(this.pos);
        this.pos++;
        return value;
    }
    readI8() {
        const value = this.view.getInt8(this.pos);
        this.pos++;
        return value;
    }
    readU16() {
        const value = this.view.getUint16(this.pos);
        this.pos += 2;
        return value;
    }
    readI16() {
        const value = this.view.getInt16(this.pos);
        this.pos += 2;
        return value;
    }
    readU32() {
        const value = this.view.getUint32(this.pos);
        this.pos += 4;
        return value;
    }
    readI32() {
        const value = this.view.getInt32(this.pos);
        this.pos += 4;
        return value;
    }
    readU64() {
        const value = (0, Int_1.getUint64)(this.view, this.pos);
        this.pos += 8;
        return value;
    }
    readI64() {
        const value = (0, Int_1.getInt64)(this.view, this.pos);
        this.pos += 8;
        return value;
    }
    readF32() {
        const value = this.view.getFloat32(this.pos);
        this.pos += 4;
        return value;
    }
    readF64() {
        const value = this.view.getFloat64(this.pos);
        this.pos += 8;
        return value;
    }
    lookU8() {
        return this.view.getUint8(this.pos);
    }
    lookU16() {
        return this.view.getUint16(this.pos);
    }
    lookU32() {
        return this.view.getUint32(this.pos);
    }
    hasRemaining(size) {
        return this.view.byteLength - this.pos >= size;
    }
}
exports.Decoder = Decoder;
