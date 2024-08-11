import WASM from "./WASM.js"

export default class WASMZ85 extends WASM {

    // set once on init, so we cache
    decodedDataSizeMax = 0;
    encodedDataSizeMax = 0;
    decodedDataPtr     = 0;
    encodedDataPtr     = 0;
    dataSizePtr        = 0;

    get dataSize() { return this.getUint32At(this.dataSizePtr); };
    set dataSize(size) { this.setUint32At(this.dataSizePtr, size); };

    get paddedDataSize() { return this.fns.Z85_getPaddedDataSize(); }
    get encodedDataSize() { return this.paddedDataSize * 5 / 4; }

    constructor() {
        super("./wasm/z85.wasm", 4);
        this.addEventListener(WASM.READY, () => { this.#onReady(); })
    }

    #onReady() {
        this.fns.Z85_init();
        // cache after getting set once on init
        this.cacheGlobals();
    }

    cacheGlobals() {
        this.decodedDataSizeMax =   this.fns.Z85_getDecodedDataSizeMax();
        this.encodedDataSizeMax =   this.fns.Z85_getEncodedDataSizeMax();
        this.decodedDataPtr =       this.fns.Z85_getDecodedDataPtr();
        this.encodedDataPtr =       this.fns.Z85_getEncodedDataPtr();
        this.dataSizePtr =          this.fns.Z85_getDataSizePtr();

        // console.log("this.decodedDataSizeMax",   this.decodedDataSizeMax);
        // console.log("this.encodedDataSizeMax",   this.encodedDataSizeMax);
        // console.log("this.decodedDataPtr",       this.decodedDataPtr);
        // console.log("this.encodedDataPtr",       this.encodedDataPtr);
        // console.log("this.dataSizePtr",          this.dataSizePtr);
    }

    // fill un-encoded bytes at decodedDataPtr
    fillDecodedBytes(buffer) {
        if (buffer.byteLength > this.decodedDataSizeMax) {
            console.log(
                `Fill decoded bytes request (buffer.byteLength: ${buffer.byteLength}) `+
                `is too big for wasm module (decodedDataSizeMax: ${this.decodedDataSizeMax}).`
            );
            return "";
        }

        // set byte size to decodedDataSizePtr in buffer
        this.dataSize = buffer.byteLength;

        // set bytes to decodedDataPtr
        this.setBytesAt(this.decodedDataPtr, buffer);
    }

    // fill encoded bytes at encodedDataPtr from string
    // size is true data size, which might be less than padded size
    fillEncodedBytes(str, decodedSize) {
        if (str.length > this.encodedDataSizeMax) {
            console.log(
                `Fill encoded bytes request (string length: ${str.length}) `+
                `is too big for wasm module (encodedDataSizeMax: ${this.encodedDataSizeMax}).`
            );
            return "";

        }
        // empty string, write 0 to dataSize and bail
        else if (str.length === 0) {
            this.dataSize = 0;
            return;
        }
        // decodedSize might be known, and passed in. if not we can assume the algo (no padding)
        if (decodedSize === undefined) {
            decodedSize = str.length * 4 / 5;
        }
        // write data size to buffer
        this.dataSize = decodedSize;
        // write encoded bytes to buffer
        this.encodeStrInto(str, this.encodedDataPtr);
    }

    // encode bytes in buffer into z85 string, or
    // call without buffer to encode bytes already in decoded buffer
    encode(buffer) {
        this.throwIfNotReady();
        if (buffer !== undefined) {
            this.fillDecodedBytes(buffer);
        }
        return this.#encode();
    }

    // write string as data decoded buffer, then encode into z85 string
    encodeString(str) {
        this.dataSize = str.length;
        this.encodeStrInto(str, this.decodedDataPtr);
        return this.#encode();
    }

    // internal use only
    // encode dataSize bytes already filled at decodedDataPtr into z85 string
    #encode() {
        // if no bytes to encode...
        if (this.dataSize === 0 ||
            // ...or if encode fails
            !this.fns.Z85_encode()) {
            return "";
        }
        return this.decodeCStr(this.encodedDataPtr, this.encodedDataSize);
    }

    // decode z85 string to Uint8Array of bytes, either view or copy
    decode(str, decodedSize, copy=false) {
        this.throwIfNotReady();
        if (str !== undefined) {
            this.fillEncodedBytes(str, decodedSize);
        }
        return this.#decode(str, copy);
    }

    // decode z85 string to string, and trim end null bytes
    decodeToString(str) {
        this.encodeStrInto(str, this.encodedDataPtr);
        let size = str.length * 4 / 5;
        // set padded for now, to decode
        this.dataSize = size;
        // decode string bytes
        const arr = this.#decode(str, false);
        // return string with null bytes trimmed off the end
        return WASM.decodeCStrArr(arr, true);
    }

    // decode to TypedArray
    // Example:
    // decodeTo(Float32Array, "Q&n:*Xe]cDAxQV}");
    decodeTo(TypedArray, str, copy=false) {
        this.throwIfNotReady();
        if (str !== undefined) {
            this.fillEncodedBytes(str);
        }
        const arr = this.#decode(str, copy);
        return new TypedArray(arr.buffer, arr.byteOffset, arr.byteLength/TypedArray.BYTES_PER_ELEMENT);
    }

    // decode encodedDataSize
    #decode(str, copy) {
        if (!this.fns.Z85_decode()) {
            return null;
        }
        return (copy) ?
            this.copyBytesAt(this.decodedDataPtr, this.dataSize):
            this.bytesAt    (this.decodedDataPtr, this.dataSize);
    }

    test() {
        // buffer
        {
            const bufIn = new Uint8Array([99]);
            console.log("input buffer", bufIn);
            const z85Str = this.encode(bufIn);
            console.log("z85 encoded:", z85Str);
            const bufOut = this.decode(z85Str, bufIn.byteLength);
            console.log("z85 decoded:", bufOut);
            if (bufIn[0] !== bufOut[0]) throw "test failed";
        }

        // string
        {
            const strIn = "farts";
            console.log("input string", strIn);
            const z85Str = this.encodeString(strIn);
            console.log("z85 encoded:", z85Str);
            const strOut = this.decodeToString(z85Str);
            console.log("z85 decoded:", strOut);
            if (strIn !== strOut) throw "test failed";
        }

        // write arbitrary data
        {
            const valIn = 1234.5678;
            console.log("z85 encoded:", valIn);
            this.setFloat64At(this.decodedDataPtr, valIn);
            this.dataSize = 8;
            const z85Str = this.encode();
            console.log("z85 encoded:", z85Str);
            this.setFloat64At(this.decodedDataPtr, 0);
            const bufOut = this.decode(z85Str);
            console.log("z85 decoded:", bufOut);
            const valOut = this.getFloat64At(this.decodedDataPtr);
            console.log("z85 decoded:", valOut);
            if (valIn !== valOut) throw "test failed";
        }

        // write float buffer
        {
            const bufIn = new Float32Array([12.34, 56.78, 90.12]);
            console.log("input buffer", bufIn);
            const z85Str = this.encode(bufIn);
            console.log("z85 encoded:", z85Str);
            const bufOut = this.decodeTo(Float32Array, z85Str);
            console.log("z85 decoded:", bufOut);
            console.log("z85 decoded again:", this.decodeTo(Float32Array, "Q&n:*Xe]cDAxQV}"));
            let i = 0;
            let e = bufIn.length;
            while (i < e) {
                if (bufIn[i] != bufOut[i]) throw "test failed";
                ++i;
            }
        }

        // basic string access
        {
            const bufIn = new Uint8Array([0x61, 0x62, 0x63, 0x00]); // "abc"(\0)
            console.log("string array", bufIn)
            this.setBytesAt(this.decodedDataPtr, bufIn);
            // no size given, scans for null-byte
            const strA = this.decodeCStr(this.decodedDataPtr);
            console.log("string decoded:", strA);
            // convenience decoding function that skips memory buffer altogether (used under the hood)
            const strB = WASM.decodeCStrArr(bufIn, true);
            console.log("string decoded:", strB);
            if (strA !== strB || strA !== "abc") throw "test failed";
        }
    }
}
