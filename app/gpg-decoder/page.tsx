"use client";

import { Fragment, useState } from "react";
import { decode } from "@/utils/decode";

type DecodeOutput = ReturnType<typeof decode>;
type DecodedPacket = DecodeOutput["packets"][number];
type PacketViewModel = ReturnType<DecodedPacket["toViewModel"]>;
type FieldSpan = PacketViewModel["fields"][number]["span"];

type HoveredField = {
    packetIndex: number;
    span: [number, number];
};

const Hex = {
    encodePretty(bytes: ArrayLike<number>): string {
        return Array.from(bytes, (byte) =>
            byte.toString(16).padStart(2, "0"),
        ).join(" ");
    },
};

function formatValue(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }

    try {
        return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
        return String(value);
    }
}

export default function GPGDecoder() {
    const [message, setMessage] = useState<string>("");
    const [packets, setPackets] = useState<PacketViewModel[]>([]);
    const [error, setError] = useState<string>("");
    const [hoveredField, setHoveredField] = useState<HoveredField | null>(null);

    function handleDecode(): void {
        setError("");
        setHoveredField(null);

        try {
            const result = decode(message, { Hex });

            setPackets(result.packets.map((packet) => packet.toViewModel()));
        } catch (decodeError: unknown) {
            setPackets([]);

            setError(
                decodeError instanceof Error
                    ? decodeError.message
                    : "Unable to decode this message.",
            );
        }
    }

    function isByteHighlighted(
        packetIndex: number,
        byteIndex: number,
    ): boolean {
        if (!hoveredField || hoveredField.packetIndex !== packetIndex) {
            return false;
        }

        const [start, end] = hoveredField.span;

        return byteIndex >= start && byteIndex < end;
    }

    return (
        <div className="flex w-full flex-col items-center gap-6">
            <h1 className="mt-5 text-center text-3xl text-amber-300">
                GPG Decoder
            </h1>

            <p className="text-amber-300">
                This tool decodes PGP packet data in JavaScript.
            </p>

            <textarea
                rows={15}
                cols={60}
                spellCheck={false}
                className="w-full max-w-4xl border-2 border-amber-300 bg-transparent p-5 text-amber-300 outline-none"
                value={message}
                placeholder="Paste an ASCII-armored PGP message"
                onChange={(event) => setMessage(event.target.value)}
            />

            <button
                type="button"
                className="cursor-pointer rounded-md border-2 border-amber-300 p-2 text-amber-300 transition hover:bg-amber-300 hover:text-stone-800"
                onClick={handleDecode}
            >
                Decode
            </button>

            {error && (
                <p
                    role="alert"
                    className="w-full max-w-4xl rounded-md border border-red-500 bg-red-950/40 p-4 text-red-300"
                >
                    {error}
                </p>
            )}

            {packets.length > 0 && (
                <div className="w-full max-w-6xl overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-left text-amber-300">
                                <th className="border border-amber-300 p-3">
                                    Bytes
                                </th>
                                <th className="border border-amber-300 p-3">
                                    Packet details
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {packets.map((packet, packetIndex) => (
                                <tr key={packetIndex} className="align-top">
                                    <td className="border border-amber-300 p-3">
                                        <pre className="min-w-96 whitespace-pre-wrap font-mono text-sm">
                                            {packet.bytes.map(
                                                (byte, byteOffset) => {
                                                    const highlighted =
                                                        isByteHighlighted(
                                                            packetIndex,
                                                            byte.index,
                                                        );

                                                    return (
                                                        <Fragment
                                                            key={byte.index}
                                                        >
                                                            <span
                                                                className={
                                                                    highlighted
                                                                        ? "rounded-sm bg-amber-300 text-stone-900"
                                                                        : ""
                                                                }
                                                                style={{
                                                                    color: highlighted
                                                                        ? undefined
                                                                        : byte.color,
                                                                }}
                                                            >
                                                                {byte.hex}{" "}
                                                            </span>

                                                            {(byteOffset + 1) %
                                                                16 ===
                                                                0 && <br />}
                                                        </Fragment>
                                                    );
                                                },
                                            )}
                                        </pre>
                                    </td>

                                    <td className="border border-amber-300 p-3">
                                        <h2
                                            className={
                                                packet.parseErrors.length > 0
                                                    ? "mb-3 text-xl text-red-400"
                                                    : "mb-3 text-xl text-amber-300"
                                            }
                                        >
                                            {packet.title}
                                        </h2>

                                        <dl className="space-y-2">
                                            {packet.fields.map(
                                                (field, fieldIndex) => (
                                                    <div
                                                        key={`${field.group ?? ""}-${field.name}-${fieldIndex}`}
                                                        className="rounded p-2 hover:bg-stone-800"
                                                        onMouseEnter={() =>
                                                            setHoveredField({
                                                                packetIndex,
                                                                span: field.span,
                                                            })
                                                        }
                                                        onMouseLeave={() =>
                                                            setHoveredField(
                                                                null,
                                                            )
                                                        }
                                                    >
                                                        <dt
                                                            className="font-semibold"
                                                            style={{
                                                                color: field.color,
                                                            }}
                                                        >
                                                            {field.group
                                                                ? `${field.group}.${field.name}`
                                                                : field.name}
                                                        </dt>

                                                        <dd className="whitespace-pre-wrap break-all text-stone-300">
                                                            {formatValue(
                                                                field.value,
                                                            )}
                                                        </dd>
                                                    </div>
                                                ),
                                            )}
                                        </dl>

                                        {packet.parseErrors.length > 0 && (
                                            <ul className="mt-4 list-inside list-disc text-red-400">
                                                {packet.parseErrors.map(
                                                    (parseError, index) => (
                                                        <li key={index}>
                                                            {parseError}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
