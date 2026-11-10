import { LookupResult } from "./lookup-result.js";

export class Stream {
    constructor(bytes, start = 0, end = bytes.length) {
        if (typeof bytes?.slice !== "function") {
            throw new TypeError("Stream requires an array-like byte source");
        }
        if (!Number.isInteger(start) || !Number.isInteger(end)) {
            throw new TypeError("Stream boundaries must be integers");
        }
        if (start < 0 || end < start || end > bytes.length) {
            throw new RangeError("Invalid Stream boundaries");
        }

        this.bytes = bytes;
        this.start = start;
        this.end = end;
        this.lengthHeaders = [];
        this.pos = start;
    }

    remaining() {
        return this.end - this.pos;
    }

    toArray() {
        return this.bytes.slice(this.start, this.end);
    }

    octet() {
        if (this.pos >= this.end) {
            return Number.NaN;
        }

        while (this.pos === this.lengthHeaders[0]) {
            this.pos += 1;
            this.lengthHeaders.shift();
        }

        return this.bytes[this.pos++];
    }

    uint(length) {
        let result = 0;

        for (let index = 0; index < length; index += 1) {
            result = result * 256 + this.octet();
        }

        return result;
    }

    uint16() {
        return this.uint(2);
    }

    uint32() {
        return this.uint(4);
    }

    time() {
        const timestamp = this.uint32();
        return timestamp > 0 ? new Date(timestamp * 1000) : "never";
    }

    hex(length) {
        let output = "";

        for (let index = 0; index < length; index += 1) {
            output += this.octet().toString(16).padStart(2, "0");
        }

        return output;
    }

    utf8(length) {
        const bytes = Uint8Array.from({ length }, () => this.octet());

        return new TextDecoder().decode(bytes);
    }

    multiPrecisionInteger() {
        const bitLength = this.uint16();
        const byteLength = Math.ceil(bitLength / 8);
        return this.hex(byteLength);
    }

    // RFC 4880, section 3.7.1.3.
    iterationCount() {
        const codedCount = this.octet();
        return (16 + (codedCount & 15)) << ((codedCount >> 4) + 6);
    }

    // RFC 4880, sections 4.2.2 and 5.2.3.1.
    variableLengthLength(supportPartial = false, mark = false) {
        let length = this.octet();

        if (mark) {
            this.lengthHeaders.push(this.pos - 1);
        }

        if (length < 192) {
            return length;
        }

        if (length < (supportPartial ? 224 : 255)) {
            length = ((length - 192) << 8) + this.octet() + 192;

            if (mark) {
                this.lengthHeaders.push(this.pos - 1);
            }

            return length;
        }

        if (length < 255) {
            const nextChunkLength = 1 << (length & 0x1f);
            const currentPosition = this.pos;

            this.pos += nextChunkLength + 1;
            const remainingLength = this.variableLengthLength(
                supportPartial,
                true,
            );
            this.pos = currentPosition;

            return nextChunkLength + remainingLength;
        }

        length = this.uint32();

        if (mark) {
            this.lengthHeaders.push(
                this.pos - 1,
                this.pos - 2,
                this.pos - 3,
                this.pos - 4,
            );
        }

        return length;
    }

    subParse(length, callback) {
        const previousEnd = this.end;
        const previousStart = this.start;

        try {
            this.start = this.pos;
            this.end = this.pos + length;
            callback();

            const hasUnparsedData = this.pos !== this.end;

            if (hasUnparsedData) {
                this.pos = this.end;
            }

            return hasUnparsedData;
        } finally {
            this.start = previousStart;
            this.end = previousEnd;
        }
    }

    lookup(table) {
        const id = this.octet();
        return new LookupResult(table[id], id);
    }

    lookupCritical(table) {
        const raw = this.octet();
        const critical = Boolean(raw & 0x80);
        const normalized = raw & ~0x80;

        return new LookupResult(table[normalized], normalized, critical, raw);
    }

    lookupArray(table, length) {
        return Array.from({ length }, () => this.lookup(table));
    }

    lookupFlags(table, byteLength) {
        const flags = this.uint(byteLength);
        const results = [];
        const flagLimit = 2 ** (byteLength * 8);

        for (let flag = 1; flag < flagLimit; flag *= 2) {
            if (flags & flag) {
                results.push(new LookupResult(table[flag], flag));
            }
        }

        return results;
    }
}
