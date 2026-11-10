export class Base64 {
    static #alphabet =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    static #ignoredCharacters = " \f\n\r\t\u00a0\u2028\u2029";

    static #decoder = Base64.#createDecoder();

    static ARMOR_PATTERN =
        /-----BEGIN [^-]+-----(?:\r?\n[^\s]*:[^\r\n]*)*\r?\n\r?\n([A-Za-z0-9+/=\s]+)-----END [^-]+-----|begin-base64[^\r\n]+\r?\n([A-Za-z0-9+/=\s]+)====/;

    static #createDecoder() {
        const decoder = new Map();

        for (const [value, character] of [...Base64.#alphabet].entries()) {
            decoder.set(character, value);
        }

        for (const character of Base64.#ignoredCharacters) {
            decoder.set(character, -1);
        }

        return decoder;
    }

    static decode(input) {
        if (typeof input !== "string") {
            throw new TypeError("Base64 input must be a string");
        }

        const output = [];
        let bits = 0;
        let characterCount = 0;

        for (let offset = 0; offset < input.length; offset += 1) {
            const character = input.charAt(offset);

            if (character === "=") {
                break;
            }

            const value = Base64.#decoder.get(character);

            if (value === -1) {
                continue;
            }
            if (value === undefined) {
                throw new SyntaxError(
                    `Illegal Base64 character at offset ${offset}`,
                );
            }

            bits |= value;
            characterCount += 1;

            if (characterCount >= 4) {
                output.push(bits >> 16, (bits >> 8) & 0xff, bits & 0xff);
                bits = 0;
                characterCount = 0;
            } else {
                bits <<= 6;
            }
        }

        switch (characterCount) {
            case 1:
                throw new SyntaxError(
                    "Incomplete Base64 encoding: at least two bits are missing",
                );
            case 2:
                output.push(bits >> 10);
                break;
            case 3:
                output.push(bits >> 16, (bits >> 8) & 0xff);
                break;
        }

        return Uint8Array.from(output);
    }

    static unarmor(input) {
        if (typeof input !== "string") {
            throw new TypeError("ASCII-armored input must be a string");
        }

        const match = Base64.ARMOR_PATTERN.exec(input);

        if (!match) {
            return Base64.decode(input);
        }

        const payload = match[1] ?? match[2];

        if (payload === undefined) {
            throw new SyntaxError("ASCII armor pattern is out of sync");
        }

        return Base64.decode(payload);
    }
}
