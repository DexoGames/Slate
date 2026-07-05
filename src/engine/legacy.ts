import { TUNING } from "./tuning";
import type {
  Director,
  EpilogueEntry,
  Film,
  FranchiseIP,
  GameState,
  LegacyEvent,
  LegacyState,
} from "./types";
import { chance, clamp, normal, pick, range, type Rng } from "./rng";
import { filmVision, legacyGate } from "./vision";

/**
 * Stage 2: the delayed legacy roll. Seeded at release, resolved over the next
 * 8 in-game years, locked with a FIXED-variance final roll no tool can narrow.
 */
export function seedLegacy(
  rng: Rng,
  film: Film,
  director: Director,
  releasedYear: number,
  franchise?: FranchiseIP,
): LegacyState {
  const t = TUNING;
  const vp = filmVision(film);
  const eligible = vp >= t.vpEligibleAt;
  const { E, A } = film.latent ?? { E: 50, A: 40, X: 50 };
  const result = film.result;
  const critic = result?.criticScore ?? 50;
  const crowd = result?.crowdScore ?? 50;
  // granted "argue about the ending" demands are deliberate divisiveness,
  // and a festival dust-up is legacy fuel of the same species
  const demandDivisive =
    film.demands.reduce(
      (s, d) => s + (d.granted ? d.demand.effects?.divisive ?? 0 : 0),
      0,
    ) + (film.festival === "divisive" ? t.festival.divisiveDivisive : 0);
  const divisiveness =
    (Math.min(t.divisivenessCap, Math.abs(critic - crowd) + demandDivisive) /
      t.divisivenessCap) *
    100;

  // sequels rarely become classics — unless they surpass the original
  const worthySuccessor = franchise ? critic >= franchise.expectation : true;
  const franchiseMult = franchise && !worthySuccessor ? t.franchise.legacySeedMult : 1;
  const seed = eligible
    ? clamp(
        legacyGate(vp) *
          franchiseMult *
          (t.legacySeed.a * A +
            t.legacySeed.e * E +
            t.legacySeed.critic * critic +
            t.legacySeed.divisive * divisiveness +
            t.legacySeed.vision * director.vision),
      )
    : 0;

  const wobble = normal(rng, 0, t.legacySignalNoise);
  const signalBand: [number, number] = eligible
    ? [
        Math.round(clamp(seed - t.legacySignalHalfWidth + wobble)),
        Math.round(clamp(seed + t.legacySignalHalfWidth + wobble)),
      ]
    : [0, 0];

  return {
    eligible,
    seed: Math.round(seed),
    signalBand,
    events: [],
    locked: false,
    releasedYear,
  };
}

const GOOD_EVENTS: { label: string; min: number; max: number; cash?: number }[] = [
  { label: "Critical re-appraisal essay goes wide", min: 6, max: 12 },
  { label: "Influential director cites it as formative", min: 8, max: 8 },
  { label: "Anniversary re-release", min: 4, max: 4, cash: 2 },
  { label: "Streaming-era rediscovery", min: 6, max: 6 },
  { label: "Film-school syllabus adoption", min: 5, max: 9 },
];

const BAD_EVENTS: { label: string; min: number; max: number }[] = [
  { label: "Aged badly — dated effects", min: -12, max: -6 },
  { label: "Cursed discourse resurfaces", min: -8, max: -8 },
  { label: "Its imitators buried it", min: -9, max: -5 },
];

/**
 * One year-end tick for a film's legacy. Returns the updated state and any
 * event that fired (for the news feed). Locks at year 8 with the fixed roll.
 */
export function tickLegacy(
  rng: Rng,
  legacy: LegacyState,
  currentYear: number,
): { legacy: LegacyState; event: LegacyEvent | null } {
  const t = TUNING;
  if (!legacy.eligible || legacy.locked) return { legacy, event: null };
  const yearsSince = currentYear - legacy.releasedYear;
  if (yearsSince < 1) return { legacy, event: null };

  let event: LegacyEvent | null = null;
  const p = t.legacyEventP[Math.min(yearsSince, t.legacyEventP.length - 1)];
  if (chance(rng, p)) {
    // seed quality tilts the odds: strong seeds age well more often
    const goodP = 0.35 + (legacy.seed / 100) * 0.4;
    const pool = chance(rng, goodP) ? GOOD_EVENTS : BAD_EVENTS;
    const e = pick(rng, pool);
    event = {
      year: currentYear,
      label: e.label,
      delta: Math.round(range(rng, e.min, e.max)),
    };
    if ("cash" in e && typeof e.cash === "number") event.cash = e.cash;
  }

  const events = event ? [...legacy.events, event] : legacy.events;

  if (yearsSince >= t.legacyYears) {
    const drift = events.reduce((s, e) => s + e.delta, 0);
    // THE fixed roll — untouchable by any de-risking tool
    const finalScore = Math.round(
      clamp(legacy.seed + drift + normal(rng, 0, t.legacyFinalSigma)),
    );
    return { legacy: { ...legacy, events, locked: true, finalScore }, event };
  }
  return { legacy: { ...legacy, events }, event };
}

export function legacyTierLabel(score: number): string | null {
  const t = TUNING.legacyThresholds;
  if (score >= t.masterpiece) return "MASTERPIECE";
  if (score >= t.classic) return "CLASSIC";
  if (score >= t.cult) return "CULT FAVOURITE";
  if (score >= t.fine) return "AGED FINE";
  return null;
}

export function legacyPointsFor(score: number): number {
  const t = TUNING.legacyThresholds;
  const p = TUNING.legacyPoints;
  if (score >= t.masterpiece) return p.masterpiece;
  if (score >= t.classic) return p.classic;
  if (score >= t.cult) return p.cult;
  if (score >= t.fine) return p.fine;
  return 0;
}

/**
 * The "ten years later" fast-forward (§8). Every legacy-eligible film that
 * hasn't locked yet is ticked year-by-year to its final verdict, its points
 * credited to the studio. Returns the settled state and one entry per film for
 * the epilogue reel. Called at campaign end, BEFORE the final score.
 */
export function resolveEpilogue(
  rng: Rng,
  state: GameState,
): { state: GameState; entries: EpilogueEntry[] } {
  const entries: EpilogueEntry[] = [];
  const films = { ...state.films };
  // legacy has already ticked through the last campaign year; continue past it
  const endedYear = state.clock.year - 1;
  let addedPoints = 0;
  for (const id of state.studio.filmIds) {
    const film = films[id];
    if (!film?.legacy || !film.result || !film.legacy.eligible) continue;
    let legacy = film.legacy;
    let year = endedYear + 1;
    let guard = TUNING.legacyYears + 3;
    while (!legacy.locked && guard-- > 0) {
      legacy = tickLegacy(rng, legacy, year).legacy;
      year++;
    }
    films[id] = { ...film, legacy };
    if (!legacy.locked || legacy.finalScore === undefined) continue;
    const pts = legacyPointsFor(legacy.finalScore);
    addedPoints += pts;
    let best: LegacyEvent | undefined;
    let worst: LegacyEvent | undefined;
    for (const e of legacy.events) {
      if (!best || e.delta > best.delta) best = e;
      if (!worst || e.delta < worst.delta) worst = e;
    }
    entries.push({
      filmId: id,
      title: film.title,
      genre: film.genre,
      finalScore: legacy.finalScore,
      tier: legacyTierLabel(legacy.finalScore) ?? "A FOOTNOTE",
      bestEventLabel: best && best.delta > 0 ? best.label : undefined,
      worstEventLabel: worst && worst.delta < 0 ? worst.label : undefined,
      pointsGained: pts,
    });
  }
  return {
    state: {
      ...state,
      films,
      studio: { ...state.studio, legacyPoints: state.studio.legacyPoints + addedPoints },
    },
    entries,
  };
}
