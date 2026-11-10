"use client";

import { Fragment, useState } from "react";
import PageHeader, { ToolPage } from "@/components/page-header";
import { decode } from "@/lib/tools/gpg-decoder";

type DecodeOutput = ReturnType<typeof decode>;
type DecodedPacket = DecodeOutput["packets"][number];
type PacketViewModel = ReturnType<DecodedPacket["toViewModel"]>;

type HoveredField = {
    packetIndex: number;
    span: [number, number];
};

function formatValue(value: unknown): string {
    if (typeof value === "string") return value;
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
            const result = decode(message);
            setPackets(result.packets.map((packet) => packet.toViewModel()));
        } catch (decodeError: unknown) {
            setPackets([]);
            setError(decodeError instanceof Error ? decodeError.message : "Unable to decode this message.");
        }
    }

    function isByteHighlighted(packetIndex: number, byteIndex: number): boolean {
        if (!hoveredField || hoveredField.packetIndex !== packetIndex) return false;
        const [start, end] = hoveredField.span;
        return byteIndex >= start && byteIndex < end;
    }

    return (
        <ToolPage>
            <PageHeader slug="gpg-decoder" />

            <div className="panel mt-5 p-5">
                <label htmlFor="pgp-message" className="field-label">Armored OpenPGP data</label>
                <textarea
                    id="pgp-message"
                    rows={10}
                    spellCheck={false}
                    className="field text-[0.8667rem]"
                    value={message}
                    placeholder={"-----BEGIN PGP MESSAGE-----"}
                    onChange={(event) => setMessage(event.target.value)}
                />
                <div className="mt-4 flex flex-wrap items-center gap-4">
                    <button type="button" className="btn btn-primary" onClick={handleDecode} disabled={!message.trim()}>
                        Decode
                    </button>
                    {error && <p role="alert" className="error-text">{error}</p>}
                </div>
            </div>

            {packets.map((packet, packetIndex) => (
                <section
                    key={packetIndex}
                    aria-labelledby={`packet-${packetIndex}`}
                    className="panel mt-4 grid overflow-hidden lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]"
                >
                    <div className="order-2 min-w-0 border-t border-line bg-inset p-4 lg:order-1 lg:border-t-0 lg:border-r">
                        <pre className="overflow-x-auto font-mono text-[0.8rem] leading-[1.7]">
                            {packet.bytes.map((byte, byteOffset) => {
                                const highlighted = isByteHighlighted(packetIndex, byte.index);
                                return (
                                    <Fragment key={byte.index}>
                                        <span
                                            className={highlighted ? "rounded-xs bg-signal text-on-signal" : ""}
                                            style={{ color: highlighted ? undefined : byte.color }}
                                        >
                                            {byte.hex}
                                        </span>
                                        {(byteOffset + 1) % 16 === 0 ? <br /> : " "}
                                    </Fragment>
                                );
                            })}
                        </pre>
                    </div>

                    <div className="order-1 min-w-0 p-4 lg:order-2">
                        <h2 id={`packet-${packetIndex}`} className="font-semibold">{packet.title}</h2>
                        <dl className="mt-3 text-sm">
                            {packet.fields.map((field, fieldIndex) => (
                                <div
                                    key={`${field.group ?? ""}-${field.name}-${fieldIndex}`}
                                    className="-mx-2 grid gap-x-4 rounded px-2 py-1 hover:bg-raised sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]"
                                    onMouseEnter={() => setHoveredField({ packetIndex, span: field.span })}
                                    onMouseLeave={() => setHoveredField(null)}
                                >
                                    <dt className="flex min-w-0 items-baseline gap-2 text-fg-2">
                                        <span aria-hidden="true" className="size-1.5 shrink-0 -translate-y-px rounded-full" style={{ background: field.color }} />
                                        {/* allow line breaks only after dots */}
                                        {(field.group ? `${field.group}.${field.name}` : field.name).replaceAll(".", ".\u200b")}
                                    </dt>
                                    <dd className="font-mono text-[0.8333rem] break-all whitespace-pre-wrap">{formatValue(field.value)}</dd>
                                </div>
                            ))}
                        </dl>
                        {packet.parseErrors.length > 0 && (
                            <ul className="error-text mt-3 list-inside list-disc">
                                {packet.parseErrors.map((parseError, index) => <li key={index}>{parseError}</li>)}
                            </ul>
                        )}
                    </div>
                </section>
            ))}
        </ToolPage>
    );
}
