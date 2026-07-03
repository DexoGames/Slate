import { describe, expect, it } from "vitest";
import { settleInstalment } from "../franchise";
import { rollRelease } from "../release";
import { makeRng } from "../rng";
import { TUNING } from "../tuning";
import type { Director, Film, FranchiseIP } from "../types";

/**
 * Feature contracts for the v2 systems:
 * - franchise fatigue eventually binds (the field can be over-farmed);
 * - meeting expectations ratchets the bar up (success raises the bill);
 * - hype under-delivery costs legs (EVENT posture is not free money).
 */

const ip = (over: Partial<FranchiseIP> = {}): FranchiseIP => ({
  id: "ip1",
  name: "HOLLOW SEASON",
  kind: "original-hit",
  genre: "action",
  awareness: 70,
  expectation: 70,
  fatigue: 0,
  instalments: ["f0"],
  ...over,
});

const film = (over: Partial<Film> = {}): Film => ({
  id: "f1",
  title: "TEST",
  genre: "action",
  script: {
    id: "s1",
    title: "TEST",
    logline: "",
    genre: "action",
    hook: 60,
    ambition: 40,
    coherence: 60,
    buzz: 40,
    writerId: "w1",
    writerName: "W",
    rewrites: [],
    askingPrice: 1,
  },
  directorId: "d1",
  directorName: "D",
  cast: [],
  budget: 110,
  marketing: 40,
  shootingDays: 90,
  demands: [],
  talentCost: 10,
  visionLedger: [],
  deRisking: {
    testScreeningHeld: false,
    notesImplemented: "none",
    studioReshoots: false,
    focusMarketing: false,
    completionBond: false,
  },
  release: { season: { year: 2, season: 2 }, strategy: "wide", posture: "standard" },
  hype: 40,
  crowdPenalty: 0,
  stage: "scheduled",
  stageSeasonsLeft: 0,
  productionPenalty: 0,
  productionBonus: 0,
  eventSigma: 0,
  castChemistry: 0,
  eventHistory: [],
  overruns: 0,
  greenlitAt: { year: 1, season: 0 },
  latent: { E: 55, A: 40, X: 55 },
  awards: [],
  ...over,
});

const director = (): Director => ({
  kind: "director",
  id: "d1",
  name: "D",
  archetype: "",
  age: 50,
  fame: 50,
  heat: 0,
  salary: 5,
  traits: [],
  craft: 60,
  vision: 50,
  style: -10,
  volatility: 30,
  genres: { action: 70 },
  collaborators: [],
  trackRecord: [],
  minTier: 1,
});

/** the opening multiplier a franchise buys, straight from the release math */
const franchiseOpen = (f: FranchiseIP) =>
  (1 + (f.awareness / 100) * TUNING.franchise.openingBoost) *
  (1 - f.fatigue / TUNING.franchise.fatigueOpeningDiv);

describe("franchise farming", () => {
  it("fatigue binds: instalment after instalment, the well runs dry", () => {
    let f = ip();
    const openAtStart = franchiseOpen(f);
    for (let i = 0; i < 5; i++) {
      const instalment = film({
        id: `f${i + 1}`,
        franchiseId: f.id,
        result: {
          opening: 50,
          boxOffice: 150,
          streaming: 20,
          ancillary: 10,
          profit: 40,
          crowdScore: 90, // meets expectations every time
          criticScore: 55,
          verdict: "hit",
          breakdown: [],
        },
      });
      f = settleInstalment(f, instalment).ip;
    }
    // awareness maxed out, yet the opening multiplier has decayed anyway
    expect(f.fatigue).toBeGreaterThanOrEqual(50);
    expect(franchiseOpen(f)).toBeLessThan(openAtStart);
  });

  it("success ratchets the expectation up; failure burns awareness instead", () => {
    const start = ip();
    const met = settleInstalment(
      start,
      film({ result: { opening: 50, boxOffice: 150, streaming: 20, ancillary: 10, profit: 40, crowdScore: 80, criticScore: 55, verdict: "hit", breakdown: [] } }),
    );
    expect(met.verdict).toBe("met");
    expect(met.ip.expectation).toBeGreaterThan(start.expectation);

    const missed = settleInstalment(
      start,
      film({ result: { opening: 50, boxOffice: 90, streaming: 20, ancillary: 10, profit: -20, crowdScore: 50, criticScore: 55, verdict: "flop", breakdown: [] } }),
    );
    expect(missed.verdict).toBe("missed");
    expect(missed.ip.awareness).toBeLessThan(start.awareness);
    expect(missed.ip.fatigue).toBeGreaterThan(met.ip.fatigue);
  });
});

describe("hype: the judgment baseline", () => {
  const median = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];

  it("a mid film under an EVENT-sized bar loses its legs (and the sleeper path exists)", () => {
    // same mid film, same seeds — only the hype differs
    const runs = (hype: number) => {
      const openings: number[] = [];
      const legsRatios: number[] = [];
      for (let seed = 1; seed <= 41; seed++) {
        const r = rollRelease(makeRng(seed * 7919), film({ hype }), director(), []);
        openings.push(r.opening);
        legsRatios.push((r.boxOffice - r.opening) / r.opening);
      }
      return { opening: median(openings), legsRatio: median(legsRatios) };
    };
    const loud = runs(90); // EVENT posture territory: bar = 90/2 + 45 = 90
    const quiet = runs(10); // bar = 50

    // hype sells the opening — that's the temptation…
    expect(loud.opening).toBeGreaterThan(quiet.opening);
    // …but the same film under a higher bar holds worse
    expect(loud.legsRatio).toBeLessThan(quiet.legsRatio);
  });
});
