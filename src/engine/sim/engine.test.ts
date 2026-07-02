import { describe, expect, it } from "vitest";
import { applyRewrite } from "../generate/scripts";
import { legacyGate, rewriteVisionDelta, visionScore } from "../vision";
import { newGame } from "../newGame";
import { advanceSeason } from "../season";
import { tickLegacy } from "../legacy";
import { makeRng, normal } from "../rng";
import { TUNING } from "../tuning";
import type { LegacyState, Script } from "../types";

const script = (): Script => ({
  id: "s1",
  title: "TEST",
  logline: "",
  genre: "drama",
  hook: 50,
  ambition: 60,
  coherence: 60,
  buzz: 40,
  writerId: "w1",
  writerName: "W",
  rewrites: [],
  askingPrice: 1,
});

describe("vision ledger", () => {
  it("starts at 100 and sums deltas", () => {
    expect(visionScore([])).toBe(100);
    expect(visionScore([{ label: "a", delta: -12 }, { label: "b", delta: -6 }])).toBe(82);
  });

  it("hard-gates legacy below the threshold", () => {
    expect(legacyGate(TUNING.vpEligibleAt - 1)).toBe(0);
    expect(legacyGate(TUNING.vpEligibleAt)).toBe(0);
    expect(legacyGate(100)).toBe(1);
  });

  it("escalates rewrite VP cost", () => {
    expect(rewriteVisionDelta(1, false)).toBe(0);
    expect(rewriteVisionDelta(2, false)).toBe(-6);
    expect(rewriteVisionDelta(3, false)).toBe(-12);
    expect(rewriteVisionDelta(5, false)).toBe(-12);
    expect(rewriteVisionDelta(2, true)).toBe(-12);
  });
});

describe("rewrite coherence decay", () => {
  it("sharpens on pass 1 then degrades", () => {
    let s = script();
    s = applyRewrite(s, { byFixer: false, originalVoice: 50 });
    expect(s.coherence).toBe(68); // +8
    s = applyRewrite(s, { byFixer: false, originalVoice: 50 });
    expect(s.coherence).toBe(63); // -5
    s = applyRewrite(s, { byFixer: false, originalVoice: 50 });
    expect(s.coherence).toBe(51); // -12
  });

  it("fixers hit distinctive scripts hardest, and hollow them", () => {
    let plain = script();
    plain = applyRewrite(plain, { byFixer: false, originalVoice: 50 });
    plain = applyRewrite(plain, { byFixer: true, originalVoice: 50 });
    let voiced = script();
    voiced = applyRewrite(voiced, { byFixer: false, originalVoice: 90 });
    voiced = applyRewrite(voiced, { byFixer: true, originalVoice: 90 });
    expect(voiced.coherence).toBeLessThan(plain.coherence);
    expect(plain.ambition).toBeLessThan(script().ambition + 1); // fixer drains ambition
  });
});

describe("rng determinism", () => {
  it("same seed, same numbers", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 50; i++) {
      expect(normal(a, 0, 10)).toBe(normal(b, 0, 10));
    }
  });

  it("same seed produces identical campaigns after ticks", () => {
    const g1 = advanceSeason(advanceSeason(newGame(7, { kind: "campaign", lengthYears: 25 })));
    const g2 = advanceSeason(advanceSeason(newGame(7, { kind: "campaign", lengthYears: 25 })));
    expect(JSON.stringify(g1)).toBe(JSON.stringify(g2));
  });
});

describe("legacy over time", () => {
  it("locks after the legacy window with a fixed-noise roll", () => {
    const rng = makeRng(9);
    let legacy: LegacyState = {
      eligible: true,
      seed: 60,
      signalBand: [45, 75],
      events: [],
      locked: false,
      releasedYear: 1,
    };
    for (let year = 2; year <= 1 + TUNING.legacyYears; year++) {
      const r = tickLegacy(rng, legacy, year);
      legacy = r.legacy;
    }
    expect(legacy.locked).toBe(true);
    expect(legacy.finalScore).toBeGreaterThanOrEqual(0);
    expect(legacy.finalScore).toBeLessThanOrEqual(100);
  });

  it("ineligible films never tick", () => {
    const rng = makeRng(9);
    const legacy: LegacyState = {
      eligible: false,
      seed: 0,
      signalBand: [0, 0],
      events: [],
      locked: false,
      releasedYear: 1,
    };
    const r = tickLegacy(rng, legacy, 5);
    expect(r.legacy).toEqual(legacy);
    expect(r.event).toBeNull();
  });
});

describe("season tick", () => {
  it("charges overhead and advances the clock", () => {
    const g0 = newGame(3, { kind: "campaign", lengthYears: 25 });
    const g1 = advanceSeason(g0);
    expect(g1.clock.season).toBe(1);
    expect(g1.studio.cash).toBeLessThan(g0.studio.cash);
  });

  it("runs year-end after Fall", () => {
    let g = newGame(3, { kind: "campaign", lengthYears: 25 });
    for (let i = 0; i < 4; i++) g = advanceSeason(g);
    expect(g.clock.year).toBe(2);
    expect(g.clock.season).toBe(0);
    expect(g.yearEnd?.year).toBe(1);
  });
});
