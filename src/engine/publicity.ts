import { TUNING } from "./tuning";
import type { Film, FranchiseIP, GameState, Genre, Posture } from "./types";
import { clamp } from "./rng";

/**
 * Hype, brand, and the other court-of-public-opinion systems. Hype sells
 * tickets AND sets the bar the film is judged against — marketing is a shape
 * decision, not a bigger number.
 */

export function computeHype(
  film: Film,
  posture: Posture,
  marketing: number,
  franchise?: FranchiseIP,
): number {
  const t = TUNING.hype;
  const lead = film.cast.find((c) => c.role === "lead");
  const fanbaseHype = lead ? (lead.fanbase === "teen" ? 12 : lead.fanbase === "broad" ? 6 : 0) : 0;
  const base =
    20 +
    Math.sqrt(Math.max(0, marketing)) * 6 + // diminishing spend curve
    fanbaseHype +
    (franchise ? franchise.awareness / 3 : 0) +
    (film.festival === "golden" ? TUNING.festival.goldenHype : 0) +
    (film.festival === "divisive" ? TUNING.festival.divisiveHype : 0) +
    t.posture[posture];
  return Math.round(clamp(base));
}

/** the score the crowd holds a film this loud to */
export function hypeExpectation(hype: number): number {
  const t = TUNING.hype;
  return t.expectationBase + hype / t.expectationDiv;
}

// ---------------------------------------------------------------------------
// Studio brand: what the town thinks you're FOR, from your recent releases.

export interface Brand {
  genre: Genre | null;
  label: string;
  share: number;
}

const BRAND_NAMES: Partial<Record<Genre, string>> = {
  horror: "THE HORROR HOUSE",
  drama: "THE PRESTIGE SHOP",
  action: "THE THRILL FACTORY",
  comedy: "THE LAUGH MACHINE",
  family: "THE FAMILY BUSINESS",
  scifi: "THE FUTURE CONCERN",
  thriller: "THE TENSION MERCHANTS",
  romance: "THE HEARTSTRING COMPANY",
  crime: "THE UNDERWORLD OFFICE",
  war: "THE FRONTLINE UNIT",
  musical: "THE SHOWTUNE STABLE",
};

export function studioBrand(state: GameState): Brand {
  const t = TUNING.brand;
  const recent = state.studio.filmIds
    .map((id) => state.films[id])
    .filter((f): f is Film => !!f && f.stage === "released")
    .slice(-t.window);
  if (recent.length < 3) return { genre: null, label: "NO BRAND YET", share: 0 };
  const counts = new Map<Genre, number>();
  for (const f of recent) counts.set(f.genre, (counts.get(f.genre) ?? 0) + 1);
  let best: Genre | null = null;
  let bestN = 0;
  for (const [g, n] of counts) {
    if (n > bestN) {
      best = g;
      bestN = n;
    }
  }
  const share = bestN / recent.length;
  if (!best || share < t.threshold) return { genre: null, label: "FOUR-QUADRANT FACTORY", share };
  return { genre: best, label: BRAND_NAMES[best] ?? "THE SPECIALISTS", share };
}

/** opening/critic adjustments for releasing in- or off-brand */
export function brandEffects(state: GameState, film: Film): { opening: number; critic: number } {
  const t = TUNING.brand;
  const brand = studioBrand(state);
  if (!brand.genre) return { opening: 1, critic: 0 };
  if (brand.genre === film.genre) return { opening: t.inBrandOpening, critic: 0 };
  return { opening: t.offBrandOpening, critic: t.offBrandCritic };
}
