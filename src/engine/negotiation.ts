import { GENRE_NORMS } from "./tuning";
import type { Actor, Demand, Director, Script } from "./types";
import { chance, int, makeId, pick, range, type Rng } from "./rng";

interface IdBox {
  counter: number;
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
): Demand[] {
  const demands: Demand[] = [];
  const norm = GENRE_NORMS[script.genre];
  const auteur = (director.style + 100) / 200; // 0..1
  const clout = director.fame / 100;

  const w = (base: number): 1 | 2 | 3 => {
    const v = base + auteur * 1.2 + range(rng, -0.5, 0.5);
    return v >= 2.5 ? 3 : v >= 1.5 ? 2 : 1;
  };

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
      detail: `“I only make this with ${muse.name.split(" ")[0]}. Non-negotiable. Well— mostly.”`,
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

  return demands;
}

/**
 * Chance the director walks if a weight-3 demand is denied. Enfants terribles
 * actually do it; most people grumble and take the job.
 */
export function walkAwayRisk(director: Director, denied: Demand[]): number {
  const heavy = denied.filter((d) => d.weight === 3).length;
  const medium = denied.filter((d) => d.weight === 2).length;
  let risk = heavy * 0.25 + medium * 0.06;
  if (director.traits.includes("enfant-terrible")) risk *= 1.8;
  if (director.traits.includes("old-reliable")) risk *= 0.4;
  return Math.min(0.9, risk);
}
