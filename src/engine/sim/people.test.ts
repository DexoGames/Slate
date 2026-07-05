import { describe, expect, it } from "vitest";
import { grownStat, publicCraftEstimate, salaryCurve } from "../generate/people";
import { actorReputationOf } from "../perception";
import {
  castChemistry,
  isPairKnown,
  pairChemistryValue,
  pairKey,
} from "../negotiation";
import { newGame } from "../newGame";
import { TUNING } from "../tuning";
import type { CastSlot, GameState } from "../types";

const g = (): GameState => newGame(4242, { kind: "campaign", lengthYears: 10 });

const slot = (actorId: string, role: CastSlot["role"]): CastSlot => ({
  role,
  actorId,
  actorName: actorId,
  deal: { salary: 1, backendPoints: 0 },
  againstType: false,
  appeal: 50,
  craft: 50,
  range: 50,
  experience: 50,
  fanbase: "broad",
  passion: 20,
});

describe("actor perception (§2b)", () => {
  it("the uncertainty band shrinks as the studio gets to know an actor", () => {
    const base = g();
    // a low-fame unknown is a wide-open bet
    const actor = [...base.market.actors].sort((a, b) => a.fame - b.fame)[0];
    const bandUnknown = actorReputationOf(base, actor).band;
    const known: GameState = {
      ...base,
      studio: { ...base.studio, familiarity: { ...base.studio.familiarity, [actor.id]: 1 } },
    };
    const bandKnown = actorReputationOf(known, actor).band;
    expect(bandKnown).toBeLessThan(bandUnknown);
    // at full knowledge the estimate is the truth
    expect(actorReputationOf(known, actor).craftEst).toBe(actor.craft);
  });
});

describe("salary does not leak hidden craft (§2a)", () => {
  it("at fixed fame & appeal, true craft barely moves the price", () => {
    // an unknown's craft is invisible: the market prices the estimate, which sits
    // near the anchor regardless of the real number
    for (const fame of [10, 20, 30]) {
      const appeal = 40;
      const low = salaryCurve(fame, Math.max(appeal, publicCraftEstimate(20, fame)), 0);
      const high = salaryCurve(fame, Math.max(appeal, publicCraftEstimate(95, fame)), 0);
      // a 75-point craft gap leaks less than a few hundred $k
      expect(Math.abs(high - low)).toBeLessThan(0.6);
    }
  });

  it("at high fame the craft IS public, so the price reflects it", () => {
    const low = salaryCurve(90, publicCraftEstimate(30, 90), 0);
    const high = salaryCurve(90, publicCraftEstimate(90, 90), 0);
    expect(high).toBeGreaterThan(low);
  });
});

describe("price signals quality (the 300k-beats-5m fix)", () => {
  it("the dearer half of the director market is better on average than the cheaper half", () => {
    const cheap: number[] = [];
    const dear: number[] = [];
    for (let seed = 1; seed <= 30; seed++) {
      const g = newGame(seed * 31, { kind: "campaign", lengthYears: 10 });
      const dirs = [...g.market.directors].sort((a, b) => a.salary - b.salary);
      const half = Math.floor(dirs.length / 2);
      for (const d of dirs.slice(0, half)) cheap.push(d.craft + d.vision);
      for (const d of dirs.slice(dirs.length - half)) dear.push(d.craft + d.vision);
    }
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    // expensive directors are a clearly better bet — cheap bargains are unknowns
    // (wide bands), not reliably-better veterans going for a song
    expect(mean(dear)).toBeGreaterThan(mean(cheap) + 15);
  });
});

describe("growth clamps at the cap (§3)", () => {
  const cap = TUNING.growth.statCap;
  it("only ever raises a young talent toward the cap, never past it", () => {
    expect(grownStat(25, 100, 89, 2.5, 1)).toBe(cap); // 89 + 2.5 → capped at 90
    expect(grownStat(25, 100, 50, 2.5, 1)).toBeGreaterThan(50);
    expect(grownStat(25, 100, 50, 2.5, 1.5)).toBeGreaterThan(grownStat(25, 100, 50, 2.5, 1));
  });
  it("the old and the already-great do not grow", () => {
    expect(grownStat(60, 100, 50, 2.5, 1)).toBe(50); // too old
    expect(grownStat(25, 0, 50, 2.5, 1)).toBe(50); // no potential
    expect(grownStat(25, 100, 95, 2.5, 1)).toBe(95); // already above cap, untouched
  });
});

describe("chemistry v2 (§7)", () => {
  it("the hash read is deterministic and order-independent", () => {
    const base = g();
    const v = pairChemistryValue(base, "act_a", "act_b");
    expect(pairChemistryValue(base, "act_a", "act_b")).toBe(v);
    expect(pairChemistryValue(base, "act_b", "act_a")).toBe(v);
    expect(Math.abs(v)).toBeLessThanOrEqual(TUNING.chemistryRange);
  });

  it("a stored value overrides the hash and reads as known", () => {
    const base = g();
    const key = pairKey("act_a", "act_b");
    const withStored: GameState = {
      ...base,
      studio: { ...base.studio, pairChemistry: { [key]: 10 } },
    };
    expect(pairChemistryValue(withStored, "act_a", "act_b")).toBe(10);
    expect(isPairKnown(withStored, "act_a", "act_b")).toBe(true);
    expect(isPairKnown(base, "act_a", "act_b")).toBe(false);
    // a paid read reveals without a stored value
    const withRead: GameState = {
      ...base,
      studio: { ...base.studio, chemistryReads: [key] },
    };
    expect(isPairKnown(withRead, "act_a", "act_b")).toBe(true);
  });

  it("average chemistry falls in the dead zone and does nothing", () => {
    const base = g();
    const cast = [slot("l1", "lead"), slot("l2", "lead")];
    const dead: GameState = {
      ...base,
      studio: { ...base.studio, pairChemistry: { [pairKey("l1", "l2")]: TUNING.chemistry.deadZone } },
    };
    expect(castChemistry(dead, cast)).toBe(0);
    const electric: GameState = {
      ...base,
      studio: { ...base.studio, pairChemistry: { [pairKey("l1", "l2")]: 8 } },
    };
    expect(castChemistry(electric, cast)).toBe(8);
  });
});
