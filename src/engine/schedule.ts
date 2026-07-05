import { GENRE_NORMS, TUNING } from "./tuning";
import type { Film, Genre } from "./types";

/**
 * Shooting-days helpers, shared by quality/release/season/reducer/UI so the
 * money-vs-safety-vs-growth trade of the days slider has one source of truth.
 */

/** 0 = at/above genre norm, 1 = maximally crunched (norm × (1 − pressureSpan)) */
export function schedulePressure(film: Film): number {
  const norm = GENRE_NORMS[film.genre].days;
  return Math.max(
    0,
    Math.min(1, (norm - film.shootingDays) / (norm * TUNING.schedule.pressureSpan)),
  );
}

/**
 * The cheapest this SCRIPT can be made at this schedule (§4). Anchored on the
 * concept's natural budget, not the genre average — a scrappy concept can be
 * shot cheaply, a spectacle can't.
 */
export function minBudgetFor(genre: Genre, days: number, budgetTarget: number): number {
  const norm = GENRE_NORMS[genre];
  return Math.max(
    TUNING.schedule.absoluteFloor,
    budgetTarget * TUNING.schedule.budgetFloorPerDay * (days / norm.days),
  );
}

/** an unhurried, steadier shoot — the flip side of crunch */
export function isUnhurried(film: Film): boolean {
  return film.shootingDays >= GENRE_NORMS[film.genre].days * TUNING.schedule.unhurriedAt;
}

// ---------------------------------------------------------------------------
// Film-level budget tier legibility (§2e) — a neutral UI tag.

export type BudgetClass = "micro" | "indie" | "mid" | "tentpole";

export function budgetClass(budget: number): BudgetClass {
  const b = TUNING.budgetClass;
  if (budget < b.micro) return "micro";
  if (budget < b.indie) return "indie";
  if (budget < b.mid) return "mid";
  return "tentpole";
}

export const BUDGET_CLASS_LABELS: Record<BudgetClass, string> = {
  micro: "MICRO-BUDGET",
  indie: "INDIE",
  mid: "MID-BUDGET",
  tentpole: "TENTPOLE",
};
