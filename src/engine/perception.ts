import { TUNING } from "./tuning";
import type { Director, GameState } from "./types";
import { clamp } from "./rng";

/**
 * What the industry THINKS a director is worth. The forecast runs on this;
 * the release roll runs on the truth. The gap is the scouting game — and it
 * closes as a studio actually works with someone.
 */

export interface Reputation {
  craftEst: number;
  visionEst: number;
  /** half-width of the uncertainty band shown in the UI */
  band: number;
  familiarity: number;
}

function fromTrackRecord(d: Director): { craft: number; vision: number } {
  const t = TUNING;
  if (d.trackRecord.length === 0) {
    // unknown quantity: the industry assumes "promising"
    return { craft: t.perceptionAnchor, vision: t.perceptionAnchor };
  }
  const recent = d.trackRecord.slice(-5);
  const avgCritic = recent.reduce((s, r) => s + r.critic, 0) / recent.length;
  const avgCrowd = recent.reduce((s, r) => s + r.crowd, 0) / recent.length;
  // execution shows up in both scores; vision mostly in critic
  const craftRead = 0.5 * avgCritic + 0.5 * avgCrowd;
  const visionRead = 0.8 * avgCritic + 0.2 * avgCrowd;
  const w = t.perceptionAnchorWeight;
  return {
    craft: clamp(craftRead * (1 - w) + t.perceptionAnchor * w),
    vision: clamp(visionRead * (1 - w) + t.perceptionAnchor * w),
  };
}

export function familiarityWith(state: GameState, directorId: string): number {
  return Math.min(1, state.studio.familiarity[directorId] ?? 0);
}

export function reputationOf(state: GameState, d: Director): Reputation {
  const fam = familiarityWith(state, d.id);
  const pub = fromTrackRecord(d);
  const blend = (perceived: number, truth: number) =>
    Math.round(perceived * (1 - fam) + truth * fam);
  return {
    craftEst: blend(pub.craft, d.craft),
    visionEst: blend(pub.vision, d.vision),
    band: Math.max(2, Math.round(TUNING.perceptionBandWidth * (1 - fam))),
    familiarity: fam,
  };
}

/**
 * The director as the FORECAST should see them: perceived craft/vision,
 * everything else (style, volatility, traits, genres) public knowledge.
 */
export function perceivedDirector(state: GameState, d: Director): Director {
  const rep = reputationOf(state, d);
  return { ...d, craft: rep.craftEst, vision: rep.visionEst };
}
