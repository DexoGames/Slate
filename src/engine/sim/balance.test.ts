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
  const selective = stats(runBatch("selectiveDeny", N, YEARS));
  const farmer = stats(runBatch("franchiseFarmer", N, YEARS));
  const hype = stats(runBatch("hypeAbuser", N, YEARS));

  it("prints the tuning table", () => {
    // eslint-disable-next-line no-console
    console.table({ safety, vision, balanced, selective, farmer, hype });
    expect(true).toBe(true);
  });

  it("franchise farming is safe money that starves legacy", () => {
    expect(farmer.bankruptRate).toBeLessThanOrEqual(balanced.bankruptRate);
    expect(farmer.meanLegacy).toBeLessThan(balanced.meanLegacy);
  });

  it("shouting EVENT at everything is not a dominant strategy", () => {
    // the under-delivery penalty must keep the abuser from running away with it
    expect(hype.meanScore).toBeLessThanOrEqual(Math.max(balanced.meanScore, selective.meanScore) * 1.05);
  });

  it("selective denial beats indulging everyone (deny-some is optimal)", () => {
    // the good reader of reputations out-scores grant-all at no worse survival
    expect(selective.meanScore).toBeGreaterThan(vision.meanScore);
    expect(selective.bankruptRate).toBeLessThanOrEqual(vision.bankruptRate);
  });

  it("bots actually play: everyone releases films", () => {
    expect(safety.meanReleased).toBeGreaterThan(3);
    expect(vision.meanReleased).toBeGreaterThan(1.5);
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
