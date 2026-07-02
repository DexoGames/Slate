import { GENRE_NORMS, TUNING } from "./tuning";
import type { Director, Film } from "./types";
import { clamp } from "./rng";

/**
 * The latent quality vector, computed once at the end of post-production.
 * E — execution: money CAN buy this. A — ambition: money CANNOT. X — accessibility.
 */
export interface Latent {
  E: number;
  A: number;
  X: number;
}

export function auteurLean(style: number): number {
  return 0.5 + 0.5 * ((style + 100) / 200);
}

export function crowdLean(style: number): number {
  return 0.5 + 0.5 * ((100 - style) / 200);
}

export function computeLatent(film: Film, director: Director): Latent {
  const t = TUNING;
  const norm = GENRE_NORMS[film.genre];
  const script = film.script;

  // ----- E: execution
  const genreAffinity = director.traits.includes("genre-tourist")
    ? 80
    : (director.genres[film.genre] ?? 40);
  const genreFit = 0.7 + 0.3 * (genreAffinity / 100);
  const lead = film.cast.find((c) => c.role === "lead");
  const colead = film.cast.find((c) => c.role === "colead");
  const support = film.cast.filter((c) => c.role === "support");
  const actorsBonus = director.traits.includes("actors-director") ? 6 : 0;
  const castCraft =
    0.6 * (lead?.craft ?? 40) +
    0.25 * (colead?.craft ?? lead?.craft ?? 40) +
    0.15 *
      (support.length > 0
        ? support.reduce((s, c) => s + c.craft, 0) / support.length
        : lead?.craft ?? 40);

  const ba = t.budgetAdequacy;
  const budgetAdequacy =
    (100 * Math.min(ba.max, Math.max(ba.min, film.budget / norm.budget))) / ba.max;
  const sa = t.scheduleAdequacy;
  const scheduleAdequacy =
    (100 * Math.min(sa.max, Math.max(sa.min, film.shootingDays / norm.days))) / sa.max;

  const crewGrants = film.demands.filter(
    (d) => d.demand.kind === "crew" && d.granted,
  ).length;
  const crewDenied = film.demands.some((d) => d.demand.kind === "crew" && !d.granted);
  let synergy = Math.min(t.synergyCrewMax, crewGrants * t.synergyCrewEach);
  if (crewDenied) synergy += t.synergyDeniedCrew;
  if (script.writerId === director.id) synergy += t.synergyWriterDirector;
  if (director.traits.includes("perfectionist")) synergy += 3;

  const E = clamp(
    t.eWeights.craft * director.craft * genreFit +
      t.eWeights.cast * (castCraft + actorsBonus) +
      t.eWeights.coherence * script.coherence +
      t.eWeights.budget * budgetAdequacy +
      t.eWeights.schedule * scheduleAdequacy +
      synergy +
      film.productionBonus -
      film.productionPenalty,
  );

  // ----- A: ambition
  const againstType = film.cast.some((c) => c.role !== "support" && c.againstType);
  const A = clamp(
    t.aWeights.script * script.ambition +
      t.aWeights.vision * director.vision * auteurLean(director.style) +
      t.aWeights.writer * script.ambition * 0.5 + // writer's thumbprint survives via the script
      t.aWeights.againstType * (againstType ? t.againstTypeBonusValue : 0),
  );

  // ----- X: accessibility
  const leadAppeal = lead?.appeal ?? 40;
  const familiar = 100 - Math.abs(50 - script.hook) * 0.4; // mid-high hook concepts feel familiar
  const notes = film.deRisking.notesImplemented;
  const notesBonus = notes === "none" ? 0 : t.notesXBonus[notes];
  const X = clamp(
    t.xWeights.hook * script.hook +
      t.xWeights.crowdLean * crowdLean(director.style) * 100 +
      t.xWeights.appeal * leadAppeal +
      t.xWeights.familiar * familiar +
      notesBonus +
      (director.traits.includes("crowd-whisperer") ? 4 : 0),
  );

  return { E: Math.round(E), A: Math.round(A), X: Math.round(X) };
}
