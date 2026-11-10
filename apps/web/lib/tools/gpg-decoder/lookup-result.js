export class LookupResult {
    #label;
    #critical;
    #raw;

    constructor(label, id, critical = false, raw = id) {
        this.#label = label;
        this.#critical = critical;
        this.#raw = raw;
        this.id = id;
    }

    toString() {
        const criticalSuffix = this.#critical
            ? `* (critical: 0x${this.#raw.toString(16)})`
            : "";

        return `${this.#label || "undefined"} (0x${this.id.toString(16)})${criticalSuffix}`;
    }

    toJSON() {
        return this.toString();
    }
}
