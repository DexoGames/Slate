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

/** salary from fame + skill + heat; the single curve everyone hangs off */
export function salaryCurve(fame: number, skill: number, heat: number): number {
  return Math.max(0.5, (fame / 100) ** 2 * 12 + skill / 25 + heat / 20);
}

export function generateDirector(rng: Rng, ids: IdBox, used: Set<string>): Director {
  const arch = pick(rng, DIRECTOR_ARCHETYPES);
  const craft = draw(rng, arch.craft);
  const vision = draw(rng, arch.vision);
  const style = draw(rng, arch.style);
  const volatility = draw(rng, arch.volatility);
  const fame = clamp(Math.round(craft * 0.5 + vision * 0.3 + range(rng, -15, 25)));
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
    age: int(rng, 29, 68),
    fame,
    heat,
    salary: Math.round(salaryCurve(fame, craft, heat) * cheap * 10) / 10,
    traits,
    craft,
    vision,
    style,
    volatility,
    genres,
    collaborators,
    trackRecord: [],
    minTier: arch.minTier,
  };
}

export function generateWriter(rng: Rng, ids: IdBox, used: Set<string>): Writer {
  const arch = pick(rng, WRITER_ARCHETYPES);
  const craft = draw(rng, arch.craft);
  const ambitionStat = draw(rng, arch.ambition);
  const voice = draw(rng, arch.voice);
  const fame = clamp(Math.round(craft * 0.4 + ambitionStat * 0.2 + range(rng, -10, 20)));
  const heat = Math.round(range(rng, -15, 25));
  const genres: Writer["genres"] = {};
  for (const g of arch.genres) genres[g] = int(rng, 60, 95);
  return {
    kind: "writer",
    id: makeId(rng, ids.counter++, "wri"),
    name: personName(rng, used),
    archetype: arch.label,
    age: int(rng, 26, 70),
    fame,
    heat,
    salary: Math.round(salaryCurve(fame, craft, heat) * 0.5 * 10) / 10,
    traits: arch.traits.filter(() => chance(rng, 0.6)).slice(0, 2),
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
  let appeal = clamp(Math.round(55 + arch.appealBias + zA * 18));
  let craft = clamp(Math.round(55 - arch.appealBias * 0.5 + zC * 18));
  // the rare high-both star: forced, expensive
  const highBoth = next(rng) < TUNING.highBothActorRate;
  if (highBoth) {
    appeal = int(rng, 78, 95);
    craft = int(rng, 78, 95);
  }
  const fame = clamp(Math.round(appeal * 0.75 + craft * 0.15 + range(rng, -10, 15)));
  const heat = Math.round(range(rng, -20, 30));
  const traits = arch.traits.filter(() => chance(rng, 0.55)).slice(0, 2);
  const cheap = traits.includes("cheap-date") ? 0.7 : 1;
  const poison = traits.includes("box-office-poison") ? 0.55 : 1;
  const mult = (highBoth ? TUNING.highBothSalaryMult : 1) * cheap * poison;
  return {
    kind: "actor",
    id: makeId(rng, ids.counter++, "act"),
    name: personName(rng, used),
    archetype: arch.label,
    age: int(rng, 22, 66),
    fame,
    heat,
    salary: Math.round(salaryCurve(fame, Math.max(appeal, craft), heat) * mult * 10) / 10,
    traits,
    appeal,
    craft,
    typecast: arch.typecast,
    temperament: draw(rng, arch.temperament),
    backendAppetite: clamp(Math.round(range(rng, 10, 90))),
  };
}
