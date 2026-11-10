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
            <PageHeader slug="gpg-decoder" lede="Paste an armored OpenPGP message, key or signature to see every packet and the bytes behind each field." />

            <div className="mt-10">
                <label htmlFor="pgp-message" className="field-label">OpenPGP data</label>
                <textarea
                    id="pgp-message"
                    rows={12}
                    spellCheck={false}
                    className="field text-sm"
                    value={message}
                    placeholder={"-----BEGIN PGP MESSAGE-----\n\n…\n-----END PGP MESSAGE-----"}
                    onChange={(event) => setMessage(event.target.value)}
                />
                <div className="mt-4 flex flex-wrap items-center gap-4">
                    <button type="button" className="btn btn-primary" onClick={handleDecode} disabled={!message.trim()}>
                        Decode packets
                    </button>
                    {error && <p role="alert" className="alert text-sm">{error}</p>}
                </div>
            </div>

            {packets.length > 0 && (
                <section className="mt-14" aria-labelledby="packets-heading">
                    <div className="flex items-baseline justify-between gap-6 border-b-[3px] border-ink pb-3">
                        <h2 id="packets-heading" className="text-2xl font-extrabold">Packets</h2>
                        <p className="text-sm text-ink-2">Point at a field to highlight its bytes.</p>
                    </div>
                    <ol>
                        {packets.map((packet, packetIndex) => (
                            <li key={packetIndex} className="grid gap-x-8 gap-y-4 border-b border-ink py-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
                                <div className="order-2 min-w-0 lg:order-1">
                                    <pre className="overflow-x-auto bg-well p-4 font-mono text-[0.8125rem] leading-relaxed">
                                        {packet.bytes.map((byte, byteOffset) => {
                                            const highlighted = isByteHighlighted(packetIndex, byte.index);
                                            return (
                                                <Fragment key={byte.index}>
                                                    <span
                                                        className={highlighted ? "bg-ink text-paper" : ""}
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

                                <div className="order-1 min-w-0 lg:order-2">
                                    <h3 className="text-xl font-bold leading-tight">{packet.title}</h3>
                                    <dl className="mt-3 border-t border-ink">
                                        {packet.fields.map((field, fieldIndex) => (
                                            <div
                                                key={`${field.group ?? ""}-${field.name}-${fieldIndex}`}
                                                className="grid gap-x-4 border-b border-hair py-1.5 hover:bg-sheet sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]"
                                                onMouseEnter={() => setHoveredField({ packetIndex, span: field.span })}
                                                onMouseLeave={() => setHoveredField(null)}
                                            >
                                                <dt className="flex min-w-0 items-baseline gap-2 text-sm font-semibold [overflow-wrap:anywhere]">
                                                    <span aria-hidden="true" className="size-2 shrink-0 translate-y-[-1px]" style={{ background: field.color }} />
                                                    {field.group ? `${field.group}.${field.name}` : field.name}
                                                </dt>
                                                <dd className="font-mono text-sm whitespace-pre-wrap break-all">{formatValue(field.value)}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                    {packet.parseErrors.length > 0 && (
                                        <ul className="alert mt-4 list-inside list-disc text-sm">
                                            {packet.parseErrors.map((parseError, index) => <li key={index}>{parseError}</li>)}
                                        </ul>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>
            )}
        </ToolPage>
    );
}
