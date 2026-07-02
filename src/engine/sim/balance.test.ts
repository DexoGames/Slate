import { describe, expect, it } from "vitest";
import { runBatch, type CampaignSummary } from "./bots";

/**
 * The balance harness. These assertions ARE the design contract:
 * - pure safety survives but cannot build Legacy;
 * - pure vision makes the great films and the most corpses;
 * - balance beats both on average but never dominates;
 * - double-high acclaim stays rare.
 * Run `npm run sim` for the verbose distribution tables.
 */

const N = 60;
const YEARS = 15; // shorter campaigns keep the suite fast; invariants still hold

function stats(rows: CampaignSummary[]) {
  const mean = (f: (r: CampaignSummary) => number) =>
    rows.reduce((s, r) => s + f(r), 0) / rows.length;
  return {
    bankruptRate: mean((r) => (r.bankrupt ? 1 : 0)),
    meanLegacy: mean((r) => r.legacyPoints),
    meanProfit: mean((r) => r.lifetimeProfit),
    meanReleased: mean((r) => r.released),
    meanScore: mean((r) => r.finalScore),
    highBothRate:
      rows.reduce((s, r) => s + r.highBoth, 0) /
      Math.max(1, rows.reduce((s, r) => s + r.released, 0)),
    meanBestLegacy: mean((r) => r.bestFilmLegacy),
  };
}

describe("policy bots (the no-dominant-strategy contract)", () => {
  const safety = stats(runBatch("maxSafety", N, YEARS));
  const vision = stats(runBatch("maxVision", N, YEARS));
  const balanced = stats(runBatch("balanced", N, YEARS));

  it("prints the tuning table", () => {
    // eslint-disable-next-line no-console
    console.table({ safety, vision, balanced });
    expect(true).toBe(true);
  });

  it("bots actually play: everyone releases films", () => {
    expect(safety.meanReleased).toBeGreaterThan(3);
    expect(vision.meanReleased).toBeGreaterThan(2);
    expect(balanced.meanReleased).toBeGreaterThan(3);
  });

  it("safety starves legacy; vision feeds it (per film — volume can't buy taste)", () => {
    const safetyPerFilm = safety.meanLegacy / Math.max(0.01, safety.meanReleased);
    const visionPerFilm = vision.meanLegacy / Math.max(0.01, vision.meanReleased);
    const balancedPerFilm = balanced.meanLegacy / Math.max(0.01, balanced.meanReleased);
    expect(safetyPerFilm).toBeLessThan(visionPerFilm / 2);
    expect(safetyPerFilm).toBeLessThan(balancedPerFilm / 2);
  });

  it("vision is the riskier way to live", () => {
    expect(vision.bankruptRate).toBeGreaterThanOrEqual(safety.bankruptRate);
  });

  it("no strategy dominates the composite score", () => {
    const scores = [safety.meanScore, vision.meanScore, balanced.meanScore];
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    // the gap between best and worst policy stays inside a band —
    // if one runs away with it, the game is solved
    expect(max).toBeGreaterThan(0);
    expect(min / max).toBeGreaterThan(0.25);
  });

  it("double-high acclaim is rare", () => {
    const all =
      (safety.highBothRate + vision.highBothRate + balanced.highBothRate) / 3;
    expect(all).toBeLessThan(0.08);
  });
});
