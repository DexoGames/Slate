import { describe, expect, it } from "vitest";
import { computeSpread, rollRelease, windfallNet } from "../release";
import { estimateOutcomes } from "../distribution";
import { computeLatent } from "../quality";
import { schedulePressure } from "../schedule";
import { GENRE_NORMS, TUNING } from "../tuning";
import { makeRng } from "../rng";
import type { Director, Film } from "../types";

/**
 * v3 engine-core contracts (M1):
 * - windfallNet is monotonic and continuous (the money sink can't create cliffs);
 * - a crunched schedule widens the roll AND lowers execution;
 * - the forecast money median mirrors the mean/median of the real roll — the
 *   honesty contract for the hand-mirrored math (catches any un-shared helper).
 */

const director = (over: Partial<Director> = {}): Director => ({
  kind: "director",
  id: "d1",
  name: "D",
  archetype: "",
  age: 50,
  fame: 50,
  heat: 0,
  salary: 5,
  traits: [],
  experience: 70,
  craft: 65,
  vision: 55,
  style: 0,
  volatility: 30,
  genres: { thriller: 70, drama: 70 },
  collaborators: [],
  trackRecord: [],
  minTier: 1,
  ...over,
});

const film = (over: Partial<Film> = {}): Film => ({
  id: "f1",
  title: "TEST",
  genre: "thriller",
  script: {
    id: "s1",
    title: "TEST",
    logline: "",
    genre: "thriller",
    hook: 55,
    ambition: 45,
    coherence: 60,
    buzz: 40,
    budgetTarget: 35,
    writerId: "w1",
    writerName: "W",
    rewrites: [],
    askingPrice: 1,
  },
  directorId: "d1",
  directorName: "D",
  cast: [],
  budget: 35,
  marketing: 20,
  shootingDays: GENRE_NORMS.thriller.days,
  demands: [],
  talentCost: 8,
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
  latent: { E: 60, A: 45, X: 60 },
  awards: [],
  ...over,
});

describe("windfallNet — the town's cut", () => {
  it("leaves profit at or below the free band untouched", () => {
    expect(windfallNet(0)).toEqual({ net: 0, cut: 0 });
    expect(windfallNet(40)).toEqual({ net: 40, cut: 0 });
    expect(windfallNet(-30)).toEqual({ net: -30, cut: 0 });
  });

  it("takes the worked example: 300 → 203 net", () => {
    const { net, cut } = windfallNet(300);
    expect(net).toBeCloseTo(203, 1); // 40 + 80×0.8 + 180×0.55
    expect(cut).toBeCloseTo(97, 1);
    expect(net + cut).toBeCloseTo(300, 1);
  });

  it("is monotonic in profit", () => {
    let prev = -Infinity;
    for (let p = -50; p <= 500; p += 5) {
      const { net } = windfallNet(p);
      expect(net).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = net;
    }
  });

  it("is continuous across both band edges", () => {
    const eps = 0.01;
    for (const edge of [TUNING.windfall.freeUpTo, TUNING.windfall.band1To]) {
      const lo = windfallNet(edge - eps).net;
      const hi = windfallNet(edge + eps).net;
      expect(Math.abs(hi - lo)).toBeLessThan(0.1);
    }
  });
});

describe("crunch — the schedule as a lever", () => {
  const norm = GENRE_NORMS.thriller.days;

  it("a compressed shoot has pressure, a full one does not", () => {
    expect(schedulePressure(film({ shootingDays: norm }))).toBe(0);
    expect(schedulePressure(film({ shootingDays: Math.round(norm * 0.6) }))).toBeGreaterThan(0.5);
  });

  it("crunch widens the roll and lowers execution", () => {
    const relaxed = film({ shootingDays: norm });
    const crunched = film({ shootingDays: Math.round(norm * 0.6) });
    const d = director();

    const sRelaxed = computeSpread(relaxed, d);
    const sCrunched = computeSpread(crunched, d);
    expect(sCrunched.sigmaMoney).toBeGreaterThan(sRelaxed.sigmaMoney);
    expect(sCrunched.sigmaAcclaim).toBeGreaterThan(sRelaxed.sigmaAcclaim);

    const eRelaxed = computeLatent(relaxed, d).E;
    const eCrunched = computeLatent(crunched, d).E;
    expect(eCrunched).toBeLessThan(eRelaxed);
  });
});

describe("forecast honesty — estimate mirrors the roll", () => {
  // hype 90 keeps the film firmly under its bar, so the word-of-mouth legs
  // multiplier is the SAME deterministic branch in the forecast and (nearly)
  // every roll — isolating the mirrored money math from the legs threshold.
  it("money median lands near the median of many seeded rolls", () => {
    const f = film({ hype: 90 });
    const d = director();
    const est = estimateOutcomes(f, d, []);

    const profits: number[] = [];
    for (let seed = 1; seed <= 400; seed++) {
      profits.push(rollRelease(makeRng(seed * 7919), f, d, []).profit);
    }
    profits.sort((a, b) => a - b);
    const sampleMedian = profits[Math.floor(profits.length / 2)];

    // an un-shared money helper (missing windfall or streaming reach in one
    // file) would blow this well past tolerance
    const tol = Math.max(8, Math.abs(sampleMedian) * 0.15);
    expect(Math.abs(est.money.median - sampleMedian)).toBeLessThan(tol);
  });
});
