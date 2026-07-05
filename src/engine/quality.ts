import { schedulePressure } from "./schedule";
import { GENRE_NORMS, TUNING } from "./tuning";
import type { Director, Film } from "./types";
import { clamp, normal, type Rng } from "./rng";

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

export function computeLatent(
  film: Film,
  director: Director,
  opts: { applyShoot?: boolean } = {},
): Latent {
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

  // execution adequacy is measured against what the CONCEPT needs (§4), not the
  // genre average: under-fund the script's own target and the seams show
  const ba = t.budgetAdequacy;
  const budgetAdequacy =
    (100 * Math.min(ba.max, Math.max(ba.min, film.budget / script.budgetTarget))) / ba.max;
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

  // granted craft demands shift the latent components directly
  let demandE = 0;
  let demandA = 0;
  let demandX = 0;
  for (const d of film.demands) {
    if (!d.granted || !d.demand.effects) continue;
    demandE += d.demand.effects.e ?? 0;
    demandA += d.demand.effects.a ?? 0;
    demandX += d.demand.effects.x ?? 0;
  }

  const E = clamp(
    t.eWeights.craft * director.craft * genreFit +
      t.eWeights.cast * (castCraft + actorsBonus) +
      t.eWeights.coherence * script.coherence +
      t.eWeights.budget * budgetAdequacy +
      t.eWeights.schedule * scheduleAdequacy +
      synergy +
      demandE +
      film.castChemistry * 0.5 +
      film.productionBonus -
      film.productionPenalty,
  );

  // ----- A: ambition
  // against-type payoffs scale with the actor's RANGE: a chameleon against
  // type is a prestige play, a one-note star against type is a meme
  const againstSlot = film.cast.find((c) => c.role !== "support" && c.againstType);
  const rangeFactor = againstSlot
    ? Math.min(1.3, againstSlot.range / t.rangePivot)
    : 0;
  const A = clamp(
    t.aWeights.script * script.ambition +
      t.aWeights.vision * director.vision * auteurLean(director.style) +
      t.aWeights.writer * script.ambition * 0.5 + // writer's thumbprint survives via the script
      t.aWeights.againstType * t.againstTypeBonusValue * rangeFactor +
      demandA +
      film.castChemistry * 0.3,
  );

  // ----- X: accessibility
  const leadAppeal = lead?.appeal ?? 40;
  const familiar = 100 - Math.abs(50 - script.hook) * 0.4; // mid-high hook concepts feel familiar
  const notes = film.deRisking.notesImplemented;
  const notesBonus = notes === "none" ? 0 : t.notesXBonus[notes];
  // low-range against-type casting alienates the crowd
  const rangeXPenalty =
    againstSlot && againstSlot.range < t.rangePivot
      ? (t.rangePivot - againstSlot.range) / 6
      : 0;
  const X = clamp(
    t.xWeights.hook * script.hook +
      t.xWeights.crowdLean * crowdLean(director.style) * 100 +
      t.xWeights.appeal * leadAppeal +
      t.xWeights.familiar * familiar +
      notesBonus +
      demandX +
      film.castChemistry * 0.4 -
      rangeXPenalty +
      (director.traits.includes("crowd-whisperer") ? 4 : 0),
  );

  // principal photography swings the true quality (§5). The truth always carries
  // the swing; the FORECAST passes applyShoot=false until a test screening reveals
  // it. Studio reshoots repair the swing back toward the planned film.
  const applyShoot = opts.applyShoot ?? true;
  const sw = film.shoot;
  let dE = 0;
  let dA = 0;
  let dX = 0;
  if (applyShoot && sw) {
    const repair = film.deRisking.studioReshoots ? 1 - t.shoot.reshootRepair : 1;
    dE = sw.swingE * repair;
    dA = sw.swingA * repair;
    dX = sw.swingX * repair;
  }

  return {
    E: Math.round(clamp(E + dE)),
    A: Math.round(clamp(A + dA)),
    X: Math.round(clamp(X + dX)),
  };
}

/**
 * Roll how principal photography went (§5): a hidden swing to the film's true
 * E/A/X, pushed by chemistry / weighted passion / director craft / an unhurried
 * schedule and dragged by crunch — but luck is most of it. Called once at the
 * production→post flip; the result lives on `film.shoot`.
 */
export function rollShoot(
  film: Film,
  director: Director,
  passionAvg: number,
  rng: Rng,
): { swingE: number; swingA: number; swingX: number } {
  const s = TUNING.shoot;
  const pressure = schedulePressure(film);
  const bias =
    film.castChemistry * s.chemWeight +
    (passionAvg - s.passionPivot) * s.passionWeight +
    (director.craft - s.craftPivot) * s.craftWeight +
    (film.shootingDays >= GENRE_NORMS[film.genre].days * TUNING.schedule.unhurriedAt ? s.unhurriedBonus : 0) -
    pressure * s.crunchPenalty;
  const axis = (scale: number) =>
    Math.max(
      -s.swingCap,
      Math.min(s.swingCap, Math.round(bias * s.biasToSwing * scale + normal(rng, 0, s.sigma))),
    );
  return { swingE: axis(s.axisScale.e), swingA: axis(s.axisScale.a), swingX: axis(s.axisScale.x) };
}
