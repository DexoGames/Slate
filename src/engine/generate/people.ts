import {
  ACTOR_ARCHETYPES,
  DIRECTOR_ARCHETYPES,
  WRITER_ARCHETYPES,
} from "../../data/archetypes";
import { CREW_FIRST, FIRST_NAMES, LAST_NAMES } from "../../data/names";
import { TUNING } from "../tuning";
import type { Actor, CrewMate, Director, Writer } from "../types";
import {
  chance,
  clamp,
  correlatedPair,
  int,
  makeId,
  next,
  normal,
  pick,
  range,
  type Rng,
} from "../rng";

interface IdBox {
  counter: number;
}

function personName(rng: Rng, used: Set<string>): string {
  for (let i = 0; i < 40; i++) {
    const name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  return `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)} Jr.`;
}

function draw(rng: Rng, [min, max]: [number, number]): number {
  return Math.round(range(rng, min, max));
}

/**
 * Salary from fame + skill + heat; the single curve everyone hangs off (§2a).
 * The skill term is fame-scaled: an unknown's craft barely counts (nobody's
 * paying a premium for a quality they can't see), a star's counts almost fully.
 */
export function salaryCurve(fame: number, skill: number, heat: number): number {
  const s = TUNING.salary;
  const skillTerm =
    (skill / s.skillDiv) * (s.skillFameBase + (1 - s.skillFameBase) * (fame / 100));
  return Math.max(
    s.floor,
    ((fame / 100) ** 2 * s.fameSq + skillTerm + heat / s.heatDiv) * s.mult,
  );
}

/**
 * How the market reads a person's hidden craft with no prior working history
 * (familiarity 0). At low fame the estimate barely moves off the anchor, so a
 * salary computed from it cannot leak the true craft of an unknown (§2a/§2b).
 */
export function publicCraftEstimate(craft: number, fame: number): number {
  const k = Math.min(1, (fame / 100) * TUNING.perceptionActorFameWeight);
  return Math.round(craft * k + TUNING.perceptionActorAnchor * (1 - k));
}

/** hidden potential: young talent has room to grow, veterans have spent theirs */
function rollGrowth(rng: Rng, age: number): number {
  return clamp(Math.round(range(rng, 20, 90) - Math.max(0, age - 30) * 2));
}

/**
 * Track-record depth (§2). A first-timer/ingenue is unproven — a wide-open bet;
 * a veteran has a public body of work, so their hidden stats read close to the
 * truth. Drives perception band + estimate trust in perception.ts.
 */
function rollExperience(rng: Rng, age: number, unknown: boolean): number {
  if (unknown) return int(rng, 2, 16);
  return clamp(Math.round((age - 24) * 2.3 + normal(rng) * 7));
}

/**
 * One film's worth of development for a young talent (§3). Growth only ever
 * raises a stat toward the cap — it never reduces an already-great one, and it
 * can never push past statCap. The old and the fully-formed don't grow.
 */
export function grownStat(
  age: number,
  potential: number,
  current: number,
  rate: number,
  mentor: number,
): number {
  const g = TUNING.growth;
  if (age > g.youngAge || current >= g.statCap) return current;
  return Math.round(Math.min(g.statCap, current + (potential / 100) * rate * mentor));
}

export function generateDirector(rng: Rng, ids: IdBox, used: Set<string>): Director {
  const arch = pick(rng, DIRECTOR_ARCHETYPES);
  const style = draw(rng, arch.style);
  const volatility = draw(rng, arch.volatility);
  // a first-timer: nobody's seen their work; wide, cheap, minTier 1 (§2c)
  const unknown = next(rng) < TUNING.unknownDirectorRate;
  const craft = unknown ? clamp(Math.round(50 + normal(rng) * 22)) : draw(rng, arch.craft);
  const vision = unknown ? clamp(Math.round(55 + normal(rng) * 22)) : draw(rng, arch.vision);
  const age = unknown ? int(rng, 27, 38) : int(rng, 29, 68);
  // fame tracks quality tightly for the established, so PRICE SIGNALS QUALITY:
  // a genuinely great, known director cannot be a bargain (fixes 300k > 5m)
  const fame = unknown
    ? int(rng, 5, 25)
    : clamp(Math.round(craft * 0.6 + vision * 0.3 + range(rng, -8, 10)));
  const heat = Math.round(range(rng, -20, 30));
  const genres: Director["genres"] = {};
  for (const g of arch.genres) genres[g] = int(rng, 65, 95);
  const traits = arch.traits.filter(() => chance(rng, 0.55)).slice(0, 2);
  const collaborators: CrewMate[] = (["dp", "editor", "composer"] as const)
    .filter(() => chance(rng, 0.7))
    .map((role) => ({
      id: makeId(rng, ids.counter++, "crew"),
      name: `${pick(rng, CREW_FIRST)} ${pick(rng, LAST_NAMES)}`,
      role,
    }));
  const cheap = traits.includes("cheap-date") ? 0.7 : 1;
  return {
    kind: "director",
    id: makeId(rng, ids.counter++, "dir"),
    name: personName(rng, used),
    archetype: arch.label,
    age,
    fame,
    heat,
    salary: Math.round(salaryCurve(fame, publicCraftEstimate(craft, fame), heat) * cheap * 10) / 10,
    traits,
    growth: rollGrowth(rng, age),
    experience: rollExperience(rng, age, unknown),
    craft,
    vision,
    style,
    volatility,
    genres,
    collaborators,
    trackRecord: [],
    minTier: unknown ? 1 : arch.minTier,
  };
}

export function generateWriter(rng: Rng, ids: IdBox, used: Set<string>): Writer {
  const arch = pick(rng, WRITER_ARCHETYPES);
  const craft = draw(rng, arch.craft);
  const ambitionStat = draw(rng, arch.ambition);
  const voice = draw(rng, arch.voice);
  const fame = clamp(Math.round(craft * 0.4 + ambitionStat * 0.2 + range(rng, -10, 20)));
  const heat = Math.round(range(rng, -15, 25));
  const age = int(rng, 26, 70);
  const genres: Writer["genres"] = {};
  for (const g of arch.genres) genres[g] = int(rng, 60, 95);
  return {
    kind: "writer",
    id: makeId(rng, ids.counter++, "wri"),
    name: personName(rng, used),
    archetype: arch.label,
    age,
    fame,
    heat,
    salary: Math.round(salaryCurve(fame, craft, heat) * 0.5 * 10) / 10,
    traits: arch.traits.filter(() => chance(rng, 0.6)).slice(0, 2),
    growth: rollGrowth(rng, age),
    experience: rollExperience(rng, age, false),
    craft,
    ambitionStat,
    voice,
    genres,
    isWriterDirector: arch.writerDirector && chance(rng, 0.6),
  };
}

export function generateActor(rng: Rng, ids: IdBox, used: Set<string>): Actor {
  const arch = pick(rng, ACTOR_ARCHETYPES);
  // appeal/craft drawn anti-correlated; archetype bias tilts the pair
  const [zA, zC] = correlatedPair(rng, -0.45);
  // an ingenue: young, unknown, cheap — a wide draw where some are gems (§2c)
  const unknown = next(rng) < TUNING.unknownActorRate;
  let appeal: number;
  let craft: number;
  let fame: number;
  let age: number;
  let rangeStat: number;
  let highBoth = false;
  if (unknown) {
    age = int(rng, 20, 28);
    craft = clamp(Math.round(35 + zC * 24));
    appeal = clamp(Math.round(25 + zA * 15));
    rangeStat = clamp(Math.round(50 + normal(rng) * 22));
    fame = int(rng, 5, 25);
  } else {
    appeal = clamp(Math.round(55 + arch.appealBias + zA * 18));
    craft = clamp(Math.round(55 - arch.appealBias * 0.5 + zC * 18));
    // the rare high-both star: forced, expensive
    highBoth = next(rng) < TUNING.highBothActorRate;
    if (highBoth) {
      appeal = int(rng, 78, 95);
      craft = int(rng, 78, 95);
    }
    fame = clamp(Math.round(appeal * 0.78 + craft * 0.12 + range(rng, -8, 10)));
    age = int(rng, 22, 66);
    rangeStat = draw(rng, arch.range);
  }
  const heat = Math.round(range(rng, -20, 30));
  const traits = arch.traits.filter(() => chance(rng, 0.55)).slice(0, 2);
  const cheap = traits.includes("cheap-date") ? 0.7 : 1;
  const poison = traits.includes("box-office-poison") ? 0.55 : 1;
  const mult = (highBoth ? TUNING.highBothSalaryMult : 1) * cheap * poison;
  const temperament = draw(rng, arch.temperament);
  // salary reads PUBLIC skill: appeal is visible, craft is only its estimate —
  // so the price can never leak the hidden craft of an unknown (§2a/§2b)
  const publicSkill = Math.max(appeal, publicCraftEstimate(craft, fame));
  // star power is a steep, convex premium: the biggest draws cost tens of $M,
  // a level-1 no-name is near the floor (§3)
  const starPremium = TUNING.star.premium * (appeal / 100) ** TUNING.star.exponent;
  return {
    kind: "actor",
    id: makeId(rng, ids.counter++, "act"),
    name: personName(rng, used),
    archetype: arch.label,
    age,
    fame,
    heat,
    salary: Math.round((salaryCurve(fame, publicSkill, heat) + starPremium) * mult * 10) / 10,
    traits,
    growth: rollGrowth(rng, age),
    experience: rollExperience(rng, age, unknown),
    appeal,
    craft,
    range: rangeStat,
    fanbase: arch.fanbase,
    typecast: arch.typecast,
    temperament,
    backendAppetite: clamp(Math.round(range(rng, 10, 90))),
    scandalRisk: clamp(
      Math.round(temperament * 0.6 + (traits.includes("tabloid-magnet") ? 25 : 0) + range(rng, -10, 10)),
    ),
  };
}

/**
 * Star power as 1–5 pips, read off box-office APPEAL (not fame) — the UI corner
 * badge. Appeal is the public draw; the pip count is all the label anyone needs.
 */
export function starTier(appeal: number): number {
  return Math.max(1, Math.min(5, Math.ceil(appeal / 20)));
}

/** where someone is in their career arc — displayed as a chip, drives contracts */
export function careerPhase(actor: Actor): import("../types").CareerPhase {
  if (actor.age < 27) return actor.heat > 5 ? "ascendant" : "ingenue";
  if (actor.age < 34 && actor.heat > 10) return "ascendant";
  if (actor.age >= 48 && actor.heat > 15) return "comeback";
  if (actor.age >= 50 || actor.heat < -15) return "fading";
  return "prime";
}
