export const Hex = {
    encodePretty(bytes) {
        return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(" ");
    },
};
