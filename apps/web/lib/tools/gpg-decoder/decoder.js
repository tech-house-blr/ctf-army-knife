import { Base64 } from "./base64.js";
import { Hex as DefaultHex } from "./hex.js";
import { LookupResult } from "./lookup-result.js";
import { Packet } from "./packet.js";
import { Stream } from "./stream.js";

export class PgpPacketDecoder {
    #Base64;
    #Stream;
    #Hex;
    #LookupResult;

    constructor({
        Base64: Base64Codec = Base64,
        Stream: StreamClass = Stream,
        Hex = DefaultHex,
        LookupResult: LookupResultClass = LookupResult,
    } = {}) {
        if (typeof Base64Codec?.unarmor !== "function") {
            throw new TypeError("PgpPacketDecoder requires Base64.unarmor()");
        }
        if (typeof StreamClass !== "function") {
            throw new TypeError("PgpPacketDecoder requires a Stream class");
        }
        if (typeof Hex?.encodePretty !== "function") {
            throw new TypeError("PgpPacketDecoder requires Hex.encodePretty()");
        }
        if (typeof LookupResultClass !== "function") {
            throw new TypeError(
                "PgpPacketDecoder requires a LookupResult class",
            );
        }

        this.#Base64 = Base64Codec;
        this.#Stream = StreamClass;
        this.#Hex = Hex;
        this.#LookupResult = LookupResultClass;
    }

    static normalize(text) {
        if (typeof text !== "string") {
            throw new TypeError("OpenPGP input must be a string");
        }

        return text
            .split("\n")
            .map((line) => line.trimStart())
            .join("\n");
    }

    decode(text) {
        const normalizedText = PgpPacketDecoder.normalize(text);
        const bytes = this.#Base64.unarmor(normalizedText);
        const stream = new this.#Stream(bytes);
        const packets = [];

        while (stream.pos < stream.end) {
            const previousPosition = stream.pos;
            const packet = new Packet(stream, {
                Hex: this.#Hex,
                LookupResult: this.#LookupResult,
            }).parse();

            packets.push(packet);

            if (stream.pos <= previousPosition) {
                throw new RangeError(
                    `Decoder made no progress at byte ${previousPosition}`,
                );
            }
        }

        return { bytes, packets };
    }
}

export function decode(text, dependencies) {
    return new PgpPacketDecoder(dependencies).decode(text);
}
