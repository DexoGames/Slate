import { prestigeTier } from "./score";
import { GENRE_NORMS, TUNING } from "./tuning";
import type { Film, GameState } from "./types";

/**
 * The credit facility. Debt is just the red side of the cash number: any spend
 * is legal while it stays above -creditLimit, and the drawn amount accrues
 * interest each season. Bankruptcy fires only when the seasonal tick itself
 * pushes past the limit.
 */
export function creditLimit(state: GameState): number {
  const c = TUNING.credit;
  const tier = prestigeTier(state.studio.legacyPoints);
  const hasScheduled = state.studio.filmIds.some(
    (id) => state.films[id]?.stage === "scheduled",
  );
  return c.base + c.perTier * (tier - 1) + (hasScheduled ? c.scheduledCollateral : 0);
}

export function creditLeft(state: GameState): number {
  return Math.round((state.studio.cash + creditLimit(state)) * 10) / 10;
}

export function canAfford(state: GameState, cost: number): boolean {
  return state.studio.cash - cost >= -creditLimit(state);
}

export function interestDue(state: GameState): number {
  if (state.studio.cash >= 0) return 0;
  return Math.round(Math.abs(state.studio.cash) * TUNING.credit.interest * 10) / 10;
}

// ---------------------------------------------------------------------------
// Commitments: what a film has cost and what it will still cost, so the
// all-in number is on screen BEFORE money is spent.

export interface Commitments {
  /** already out the door: script + fees + salaries + overruns */
  committed: number;
  /** projected remaining spend to get the film released */
  stillToPay: number;
  allIn: number;
  /** cash after paying the rest (negative = credit usage) */
  cashAfter: number;
}

/** projected production budget for a film that hasn't set one yet */
export function projectedBudget(film: Film): number {
  const norm = GENRE_NORMS[film.genre].budget;
  const floor = film.demands.find(
    (d) => d.granted && d.demand.kind === "budget-floor",
  )?.demand.budgetFloor;
  return Math.max(film.budget || norm, floor ?? 0);
}

export function estimateCommitments(
  state: GameState,
  film: Film,
  overrides?: { budget?: number; marketing?: number; extraTalent?: number },
): Commitments {
  const committed = Math.round((film.talentCost + film.overruns) * 10) / 10;
  const budget = overrides?.budget ?? projectedBudget(film);
  const marketing =
    overrides?.marketing ?? (film.stage === "scheduled" || film.stage === "released"
      ? film.marketing
      : Math.round(budget * 0.4));

  let stillToPay = overrides?.extraTalent ?? 0;
  switch (film.stage) {
    case "development":
      stillToPay += budget + marketing;
      break;
    case "production":
    case "post":
      stillToPay += marketing;
      break;
    default:
      break; // scheduled/released: everything is spent
  }
  stillToPay = Math.round(stillToPay * 10) / 10;

  return {
    committed,
    stillToPay,
    allIn: Math.round((committed + stillToPay) * 10) / 10,
    cashAfter: Math.round((state.studio.cash - stillToPay) * 10) / 10,
  };
}

/** rough all-in cost of a script before it's even optioned (for market cards) */
export function scriptAllIn(state: GameState, genre: Film["genre"], askingPrice: number): number {
  void state;
  const norm = GENRE_NORMS[genre];
  // price + typical director/cast fees (~30% of budget) + budget + marketing
  return Math.round(askingPrice + norm.budget * (1 + 0.3 + 0.4));
}
