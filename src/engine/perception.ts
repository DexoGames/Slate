import { TUNING } from "./tuning";
import type { Actor, Director, Film, GameState } from "./types";
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

/**
 * The uncertainty half-width for a person's hidden stats, before the studio's
 * own working familiarity narrows it further. An inexperienced person is a
 * wide-open bet; a veteran is nearly a known quantity.
 */
export function bandFromExperience(experience: number): number {
  const e = TUNING.perceptionExpBand;
  return e.atZero + (e.atFull - e.atZero) * (clamp(experience) / 100);
}

export function reputationOf(state: GameState, d: Director): Reputation {
  const fam = familiarityWith(state, d.id);
  const pub = fromTrackRecord(d);
  // experience makes a director's quality publicly legible; working with them
  // makes it certain. Either way, at full knowledge the estimate is the truth.
  const known = Math.min(1, fam + (d.experience / 100) * TUNING.perceptionExpKnow);
  const blend = (perceived: number, truth: number) =>
    Math.round(perceived * (1 - known) + truth * known);
  return {
    craftEst: blend(pub.craft, d.craft),
    visionEst: blend(pub.vision, d.vision),
    band: Math.max(2, Math.round(bandFromExperience(d.experience) * (1 - fam))),
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

// ---------------------------------------------------------------------------
// Actors: craft & range are hidden the way a director's are. Appeal is public —
// box-office draw is common knowledge — but how good they actually ARE, and
// how far they can stretch, is the scouting bet (§2b).

export interface ActorReputation {
  craftEst: number;
  rangeEst: number;
  /** half-width of the uncertainty band shown in the UI */
  band: number;
  knowledge: number;
}

/**
 * How well the studio knows an actor's true quality: experience makes it
 * publicly legible, working with them (familiarity) makes it certain, and a
 * little fame leaks the rest. Appeal/star power is public regardless — it is
 * never estimated. At familiarity 1 the estimate is the truth.
 */
function actorKnownness(
  state: GameState,
  actorId: string,
  experience: number,
  fame: number,
): number {
  const fam = state.studio.familiarity[actorId] ?? 0;
  return Math.min(
    1,
    fam +
      (experience / 100) * TUNING.perceptionExpKnow +
      (fame / 100) * TUNING.perceptionActorFameWeight * 0.3,
  );
}

export function actorKnowledge(state: GameState, actor: Actor): number {
  return actorKnownness(state, actor.id, actor.experience, actor.fame);
}

export function actorReputationOf(state: GameState, actor: Actor): ActorReputation {
  const fam = state.studio.familiarity[actor.id] ?? 0;
  const k = actorKnowledge(state, actor);
  const est = (truth: number) => Math.round(truth * k + TUNING.perceptionActorAnchor * (1 - k));
  return {
    craftEst: est(actor.craft),
    rangeEst: est(actor.range),
    band: Math.max(2, Math.round(bandFromExperience(actor.experience) * (1 - fam))),
    knowledge: k,
  };
}

/**
 * The film as the FORECAST should see it: each cast slot's craft/range replaced
 * with the industry's estimate, appeal left true. The release roll keeps the
 * real numbers — the gap is the treasure hunt of scouting unknowns.
 */
export function perceivedFilm(state: GameState, film: Film): Film {
  if (film.cast.length === 0) return film;
  const cast = film.cast.map((slot) => {
    // an actor who's left the pool is a known quantity; otherwise use their reads
    const actor = state.market.actors.find((a) => a.id === slot.actorId);
    const k = actorKnownness(state, slot.actorId, actor?.experience ?? 100, actor?.fame ?? 100);
    const est = (truth: number) => Math.round(truth * k + TUNING.perceptionActorAnchor * (1 - k));
    return { ...slot, craft: est(slot.craft), range: est(slot.range) };
  });
  return { ...film, cast };
}
