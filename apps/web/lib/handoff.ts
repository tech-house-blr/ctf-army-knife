/**
 * Hands input from the home page's smart input to a tool page across a
 * client-side navigation. Kept in memory only: files never go into a URL or
 * storage, and a reload simply starts the tool empty.
 */
import type { ToolSlug } from "@/lib/detect";

type Handoff = { tool: ToolSlug; text?: string; file?: File };

let pending: Handoff | null = null;

export function handOff(handoff: Handoff): void {
    pending = handoff;
}

/** The input waiting for `tool`, if any. Safe to call more than once (React may re-run initialisers). */
export function peekHandoff(tool: ToolSlug): Handoff | null {
    return pending?.tool === tool ? pending : null;
}

/** Forget the waiting input once the tool has picked it up. */
export function clearHandoff(tool: ToolSlug): void {
    if (pending?.tool === tool) pending = null;
}
