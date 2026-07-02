import { TUNING } from "./tuning";
import type { Film, VisionEntry } from "./types";

/**
 * Vision Preservation is an append-only ledger: every hit has a name the UI
 * can show. The number is always derived from the entries, never stored.
 */
export function visionScore(ledger: VisionEntry[]): number {
  const total = ledger.reduce<number>((sum, e) => sum + e.delta, TUNING.vpStart);
  return Math.min(110, Math.max(0, total));
}

export function filmVision(film: Film): number {
  return Math.min(100, visionScore(film.visionLedger));
}

export function isLegacyEligible(film: Film): boolean {
  return filmVision(film) >= TUNING.vpEligibleAt;
}

/** 0..1 scale factor applied to the legacy seed above the hard gate */
export function legacyGate(vp: number): number {
  if (vp < TUNING.vpEligibleAt) return 0;
  return (Math.min(100, vp) - TUNING.vpEligibleAt) / (100 - TUNING.vpEligibleAt);
}

export function addVision(film: Film, label: string, delta: number): Film {
  if (delta === 0) return film;
  return { ...film, visionLedger: [...film.visionLedger, { label, delta }] };
}

/** VP cost of the Nth rewrite pass (1-based) */
export function rewriteVisionDelta(passNo: number, byFixer: boolean): number {
  const idx = Math.min(passNo - 1, TUNING.vpRewrite.length - 1);
  return TUNING.vpRewrite[idx] + (byFixer ? TUNING.vpFixerExtra : 0);
}
