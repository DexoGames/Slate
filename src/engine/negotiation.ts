import { GENRE_NORMS, TUNING } from "./tuning";
import type {
  Actor,
  CastRole,
  CastSlot,
  Demand,
  DemandEffects,
  Director,
  Film,
  GameState,
  Genre,
  Script,
} from "./types";
import { chance, int, makeId, makeRng, pick, range, type Rng } from "./rng";

/**
 * Genre-flavoured creative demands. Each has its own risk signature: some buy
 * execution for money, some buy ceiling for variance, some trade the crowd
 * floor for legacy fuel. Weights lean 2–3 — these are the hills people die on.
 */
interface CraftDemandDef {
  genres: Genre[];
  label: string;
  detail: string;
  effects: DemandEffects;
  baseWeight: number;
}

const CRAFT_DEMANDS: CraftDemandDef[] = [
  {
    genres: ["horror", "scifi", "action"],
    label: "Practical effects only",
    detail: "“If it isn't on set, it isn't in the movie.”",
    effects: { e: 4, cost: 4, sigma: 2 },
    baseWeight: 1.6,
  },
  {
    genres: ["musical"],
    label: "Live singing on set",
    detail: "“Lip-sync is for cowards and award shows.”",
    effects: { a: 5, x: -4, sigma: 4 },
    baseWeight: 1.8,
  },
  {
    genres: ["action", "war"],
    label: "Real stunt unit, no digital doubles",
    detail: "“The audience can smell a render farm.”",
    effects: { e: 5, cost: 6, weatherRisk: true },
    baseWeight: 1.6,
  },
  {
    genres: ["drama", "war", "romance"],
    label: "Shoot on location",
    detail: "“You cannot fake weather, and weather is the co-star.”",
    effects: { a: 5, cost: 5, weatherRisk: true },
    baseWeight: 1.4,
  },
  {
    genres: ["drama", "crime"],
    label: "Unknown faces in the leads",
    detail: "“Stars bring their baggage into every frame.”",
    effects: { a: 4, x: -6, sigma: 4 },
    baseWeight: 1.9,
  },
  {
    genres: ["drama", "crime", "war"],
    label: "The two-and-a-half-hour cut",
    detail: "“It earns its length. Mostly.”",
    effects: { a: 6, x: -5 },
    baseWeight: 1.7,
  },
  {
    genres: ["thriller", "horror", "scifi"],
    label: "An ending people will argue about",
    detail: "“Resolution is a consolation prize.”",
    effects: { divisive: 15, x: -4, sigma: 2 },
    baseWeight: 1.9,
  },
  {
    genres: ["comedy", "romance"],
    label: "Improv days in the schedule",
    detail: "“The script is a suggestion the movie makes to itself.”",
    effects: { x: 4, sigma: 3, cost: 2 },
    baseWeight: 1.3,
  },
  {
    genres: ["scifi", "family"],
    label: "Original creature design, no market testing",
    detail: "“A committee has never once drawn a good monster.”",
    effects: { a: 4, e: 2, cost: 4, sigma: 2 },
    baseWeight: 1.5,
  },
  {
    genres: ["crime", "thriller"],
    label: "Real city permits, night shoots",
    detail: "“Backlots look like backlots.”",
    effects: { e: 3, cost: 3, weatherRisk: true },
    baseWeight: 1.3,
  },
];

interface IdBox {
  counter: number;
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The demand sheet for a (film, director) pair — deterministic per campaign
 * seed and independent of the live game RNG, so previewing a negotiation
 * never changes the world.
 */
export function demandsFor(game: GameState, film: Film, director: Director): Demand[] {
  const rng = makeRng((game.seed ^ hashStr(film.id + director.id)) >>> 0);
  return generateDemands(rng, { counter: 1 }, director, film.script, game.market.actors, {
    isSequel: !!film.franchiseId,
  });
}

/** snapshot an actor into a cast slot, applying trait hooks at signing */
export function makeCastSlot(
  actor: Actor,
  film: Film,
  role: CastRole,
  backendPct: number,
): CastSlot {
  const againstType =
    !actor.typecast.includes(film.genre) && !actor.traits.includes("chameleon");
  let appeal = actor.appeal;
  let craft = actor.craft;
  if (actor.traits.includes("box-office-poison")) appeal = Math.max(0, appeal - 10);
  if (actor.traits.includes("method") && (film.genre === "drama" || film.genre === "war")) {
    craft = Math.min(100, craft + 6);
  }
  const deal = {
    salary: Math.round(actor.salary * (1 - backendPct / 100) * 10) / 10,
    backendPoints: Math.round((backendPct / 100) * (actor.salary / 2) * 10) / 10,
  };
  return {
    role,
    actorId: actor.id,
    actorName: actor.name,
    deal,
    againstType,
    appeal,
    craft,
    range: actor.range,
    fanbase: actor.fanbase,
  };
}

/**
 * Deterministic pairwise chemistry among the billed cast (leads count fully,
 * supports half). Nobody knows it until they're on a set together.
 */
export function castChemistry(seed: number, cast: CastSlot[]): number {
  let total = 0;
  for (let i = 0; i < cast.length; i++) {
    for (let j = i + 1; j < cast.length; j++) {
      const a = cast[i];
      const b = cast[j];
      const key = [a.actorId, b.actorId].sort().join("|");
      const h = hashStr(`${seed}:${key}`);
      const val = ((h % 1000) / 1000) * 16 - 8; // -8..+8
      const weight = a.role !== "support" && b.role !== "support" ? 1 : 0.5;
      total += val * weight;
    }
  }
  return Math.round(Math.max(-10, Math.min(10, total)));
}

/**
 * Generate a director's demand sheet for a given script. Auteur-leaning and
 * high-fame directors ask for more, and care harder (higher weights).
 */
export function generateDemands(
  rng: Rng,
  ids: IdBox,
  director: Director,
  script: Script,
  marketActors: Actor[],
  opts: { isSequel?: boolean } = {},
): Demand[] {
  const demands: Demand[] = [];
  const norm = GENRE_NORMS[script.genre];
  const auteur = (director.style + 100) / 200; // 0..1
  const clout = director.fame / 100;

  const w = (base: number): 1 | 2 | 3 => {
    const v = base + auteur * 1.2 + range(rng, -0.5, 0.5);
    return v >= 2.5 ? 3 : v >= 1.5 ? 2 : 1;
  };

  // an auteur only does your instalment if their weird thing gets made —
  // deny this one and there is no deal at all
  if (opts.isSequel && director.style > TUNING.franchise.auteurRefusalStyle) {
    demands.push({
      id: makeId(rng, ids.counter++, "dem"),
      kind: "passion-project",
      weight: 3,
      label: "Greenlight my passion project",
      detail: `“I'll do your sequel. In exchange, the studio greenlights MY film, the one nobody else will touch, within ${TUNING.franchise.passionDeadlineYears} years. In writing.”`,
    });
  }

  // budget floor — almost everyone has one
  if (chance(rng, 0.85)) {
    const floor = Math.round(norm.budget * range(rng, 0.75, 1.25 + clout * 0.4));
    demands.push({
      id: makeId(rng, ids.counter++, "dem"),
      kind: "budget-floor",
      weight: w(1.2),
      label: `Budget floor: $${floor}M`,
      detail: "“I can't make it look like anything for less.”",
      budgetFloor: floor,
    });
  }

  // shooting days
  if (chance(rng, 0.7)) {
    const days = Math.round(
      norm.days * range(rng, 0.95, 1.2 + auteur * 0.25) +
        (director.traits.includes("perfectionist") ? 10 : 0),
    );
    demands.push({
      id: makeId(rng, ids.counter++, "dem"),
      kind: "shooting-days",
      weight: w(1),
      label: `${days} shooting days`,
      detail: "“Schedules are where films go to die.”",
      days,
    });
  }

  // final cut — the auteur hill
  if (chance(rng, 0.25 + auteur * 0.55)) {
    demands.push({
      id: makeId(rng, ids.counter++, "dem"),
      kind: "final-cut",
      weight: w(1.8),
      label: "Final cut",
      detail: "“The version that ships is my version.”",
    });
  }

  // attached actor
  if (chance(rng, 0.35) && marketActors.length > 0) {
    const muse = pick(rng, marketActors);
    demands.push({
      id: makeId(rng, ids.counter++, "dem"),
      kind: "attached-actor",
      weight: w(1.4),
      label: `Attach ${muse.name}`,
      detail: `“I only make this with ${muse.name.split(" ")[0]}. Non-negotiable. Well, mostly.”`,
      actorId: muse.id,
    });
  }

  // regular crew
  for (const crew of director.collaborators) {
    if (chance(rng, 0.65)) {
      const roleLabel = crew.role === "dp" ? "DP" : crew.role === "editor" ? "editor" : "composer";
      demands.push({
        id: makeId(rng, ids.counter++, "dem"),
        kind: "crew",
        weight: w(0.8),
        label: `Bring ${crew.name} (${roleLabel})`,
        detail: "“We have a shorthand. It shows up on screen.”",
        crewId: crew.id,
      });
    }
  }

  // a festival premiere — critic heat before release, at the cost of a season
  if (chance(rng, Math.max(0, auteur - 0.45) * 0.7 + (director.traits.includes("festival-darling") ? 0.25 : 0))) {
    demands.push({
      id: makeId(rng, ids.counter++, "dem"),
      kind: "festival-premiere",
      weight: w(1.2),
      label: "Premiere at the Meridian",
      detail: "“This film needs a room that watches films, before it meets people who merely see them.”",
    });
  }

  // no test screenings
  if (chance(rng, auteur * 0.4)) {
    demands.push({
      id: makeId(rng, ids.counter++, "dem"),
      kind: "no-test-screenings",
      weight: w(1.5),
      label: "No test screenings",
      detail: "“I will not recut this film because a mall in Tarzana got restless.”",
    });
  }

  // backend points
  if (chance(rng, 0.3 + clout * 0.3)) {
    const points = int(rng, 2, 6);
    demands.push({
      id: makeId(rng, ids.counter++, "dem"),
      kind: "backend-points",
      weight: w(0.9),
      label: `${points} backend points`,
      detail: "“If it works, I eat too.”",
      points,
    });
  }

  // one or two genre-flavoured craft demands — the hills people die on
  const pool = CRAFT_DEMANDS.filter((c) => c.genres.includes(script.genre));
  const nCraft = pool.length === 0 ? 0 : chance(rng, 0.45 + auteur * 0.3) ? (chance(rng, 0.3) ? 2 : 1) : 0;
  const used = new Set<string>();
  for (let i = 0; i < nCraft; i++) {
    const candidates = pool.filter((c) => !used.has(c.label));
    if (candidates.length === 0) break;
    const def = pick(rng, candidates);
    used.add(def.label);
    demands.push({
      id: makeId(rng, ids.counter++, "dem"),
      kind: "craft-demand",
      weight: w(def.baseWeight),
      label: def.label,
      detail: def.detail,
      effects: def.effects,
    });
  }

  return demands;
}

/**
 * Chance the director walks if a weight-3 demand is denied. Enfants terribles
 * actually do it; most people grumble and take the job.
 */
export function walkAwayRisk(director: Director, denied: Demand[]): number {
  // the passion project is the price of the sequel, not a preference
  if (denied.some((d) => d.kind === "passion-project")) return 1;
  const heavy = denied.filter((d) => d.weight === 3).length;
  const medium = denied.filter((d) => d.weight === 2).length;
  let risk = heavy * 0.25 + medium * 0.06;
  if (director.traits.includes("enfant-terrible")) risk *= 1.8;
  if (director.traits.includes("old-reliable")) risk *= 0.4;
  return Math.min(0.9, risk);
}
