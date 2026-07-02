import { GENRE_NORMS, TUNING } from "./tuning";
import type {
  Director,
  Film,
  ReleaseResult,
  RivalStudio,
  RollBreakdown,
  RollModifier,
  Verdict,
} from "./types";
import { clamp, lognormalFactor, normal, type Rng } from "./rng";

/**
 * Variance/ceiling budget for a film. Granting demands widens AND uncaps;
 * denying narrows AND caps. De-risking narrows the release roll only — it can
 * never touch the legacy roll's variance.
 */
export interface Spread {
  sigmaAcclaim: number;
  sigmaMoney: number;
  ceiling: number;
  parts: RollModifier[];
}

export function computeSpread(film: Film, director: Director): Spread {
  const t = TUNING;
  const parts: RollModifier[] = [{ name: "Base", value: t.sigmaBase }];
  let sigma = t.sigmaBase;
  let ceiling = t.ceilingBase;

  const majors = film.demands.filter((d) => d.demand.weight >= 2);
  const granted = majors.filter((d) => d.granted).length;
  const denied = majors.length - granted;
  if (granted > 0) {
    sigma += granted * t.sigmaPerMajorDemand;
    ceiling += granted * t.ceilingPerDemand;
    parts.push({ name: "Demands granted", value: granted * t.sigmaPerMajorDemand });
  }
  if (denied > 0) {
    ceiling -= denied * t.ceilingPerDemand;
    parts.push({ name: "Demands denied (capped)", value: 0 });
  }

  const vol = (director.volatility / 100) * t.sigmaVolatilityMax;
  sigma += vol;
  parts.push({ name: "Director volatility", value: Math.round(vol * 10) / 10 });
  if (director.traits.includes("old-reliable")) {
    sigma -= 2;
    parts.push({ name: "Old Reliable", value: -2 });
  }
  if (director.traits.includes("enfant-terrible")) {
    sigma += 2;
    parts.push({ name: "Enfant Terrible", value: 2 });
  }
  if (film.eventSigma !== 0) {
    sigma += film.eventSigma;
    parts.push({ name: "Production turbulence", value: film.eventSigma });
  }

  let sigmaAcclaim = sigma;
  let sigmaMoney = sigma;

  const chameleonLead = film.cast.some(
    (c) => c.againstType && c.role !== "support",
  );
  if (chameleonLead) {
    sigmaAcclaim += t.sigmaAgainstType;
    parts.push({ name: "Against-type casting", value: t.sigmaAgainstType });
  }
  if (film.deRisking.notesImplemented !== "none") {
    sigmaAcclaim += t.sigmaNotes;
    sigmaMoney += t.sigmaNotes;
    parts.push({ name: "Test-screening notes", value: t.sigmaNotes });
  }
  if (film.deRisking.studioReshoots) {
    sigmaAcclaim += t.sigmaReshoots;
    sigmaMoney += t.sigmaReshoots;
    parts.push({ name: "Studio reshoots", value: t.sigmaReshoots });
  }
  if (film.deRisking.focusMarketing) {
    sigmaMoney += t.sigmaFocusMoney;
    parts.push({ name: "Focus-group marketing", value: t.sigmaFocusMoney });
  }
  if (film.release?.strategy === "platform") {
    sigmaMoney += t.sigmaPlatformMoney;
    parts.push({ name: "Platform release", value: t.sigmaPlatformMoney });
  }

  return {
    sigmaAcclaim: clamp(sigmaAcclaim, t.sigmaMin, t.sigmaMax),
    sigmaMoney: clamp(sigmaMoney, t.sigmaMin, t.sigmaMax),
    ceiling: clamp(ceiling, t.ceilingMin, t.ceilingMax),
    parts,
  };
}

export function auteurCred(director: Director): number {
  const rec = director.trackRecord;
  if (rec.length === 0) return (director.vision / 100) * 5;
  const avgCritic = rec.reduce((s, r) => s + r.critic, 0) / rec.length;
  return (avgCritic / 100) * 10;
}

/** count of rival releases contesting the same window at similar size */
export function competitionCount(film: Film, rivals: RivalStudio[]): number {
  if (!film.release) return 0;
  const { year, season } = film.release.season;
  const big = film.budget >= 60;
  let n = 0;
  for (const r of rivals) {
    for (const rf of r.slate) {
      if (rf.releaseSeason.year === year && rf.releaseSeason.season === season) {
        const rfBig = rf.size === "tentpole";
        if (rfBig === big || rf.genre === film.genre) n++;
      }
    }
  }
  return n;
}

/** Stage 1: the release roll. Mutates nothing; returns the result. */
export function rollRelease(
  rng: Rng,
  film: Film,
  director: Director,
  rivals: RivalStudio[],
): ReleaseResult {
  const t = TUNING;
  const norm = GENRE_NORMS[film.genre];
  const { E, A, X } = film.latent ?? { E: 50, A: 40, X: 50 };
  const spread = computeSpread(film, director);
  const strategy = film.release?.strategy ?? "wide";
  const season = film.release?.season.season ?? 0;
  const breakdown: RollBreakdown[] = [];

  // ----- crowd score
  const crowdBase =
    t.crowdRoll.x * X +
    t.crowdRoll.e * E +
    t.crowdRoll.a * A -
    t.crowdRoll.crossPenalty * Math.max(0, A - X);
  const crowdNoise = normal(rng, 0, spread.sigmaAcclaim * t.crowdRoll.sigmaScale);
  const crowdScore = Math.round(
    clamp(crowdBase + crowdNoise, 0, spread.ceiling),
  );
  breakdown.push({
    label: "Crowd score",
    base: Math.round(crowdBase),
    modifiers: [
      { name: "Accessibility", value: Math.round(t.crowdRoll.x * X) },
      { name: "Execution", value: Math.round(t.crowdRoll.e * E) },
      { name: "Ambition unrelieved", value: -Math.round(t.crowdRoll.crossPenalty * Math.max(0, A - X)) },
    ],
    noise: Math.round(crowdNoise),
    final: crowdScore,
  });

  // ----- critic score
  const cred = auteurCred(director);
  const fallBonus =
    season === 3
      ? t.fallCriticBonus + (director.traits.includes("festival-darling") ? 4 : 0)
      : 0;
  const platformBonus = strategy === "platform" ? t.platformCriticBonus : 0;
  const criticBase =
    t.criticRoll.a * A +
    t.criticRoll.e * E +
    t.criticRoll.cred * cred * 10 -
    t.criticRoll.crossPenalty * Math.max(0, X - A) +
    fallBonus +
    platformBonus;
  const criticNoise = normal(rng, 0, spread.sigmaAcclaim);
  const criticScore = Math.round(
    clamp(criticBase + criticNoise, 0, spread.ceiling),
  );
  breakdown.push({
    label: "Critic score",
    base: Math.round(criticBase),
    modifiers: [
      { name: "Ambition", value: Math.round(t.criticRoll.a * A) },
      { name: "Execution", value: Math.round(t.criticRoll.e * E) },
      { name: "Auteur cred", value: Math.round(t.criticRoll.cred * cred * 10) },
      { name: "Slickness penalty", value: -Math.round(t.criticRoll.crossPenalty * Math.max(0, X - A)) },
      { name: "Fall window", value: fallBonus },
      { name: "Platform", value: platformBonus },
    ],
    noise: Math.round(criticNoise),
    final: criticScore,
  });

  // ----- money
  if (strategy === "streaming") {
    // flat sale: safe, capped, soulless
    const revenue = Math.round(film.budget * t.streamingSaleMult * 10) / 10;
    const costs = film.budget + film.marketing + film.overruns + film.talentCost;
    const profit = Math.round((revenue - costs) * 10) / 10;
    breakdown.push({
      label: "Streaming sale",
      base: revenue,
      modifiers: [{ name: "Flat 1.1× budget", value: revenue }],
      noise: 0,
      final: revenue,
    });
    return {
      opening: 0,
      boxOffice: 0,
      streaming: revenue,
      ancillary: 0,
      profit,
      crowdScore,
      criticScore,
      verdict: verdictFor(profit, film.budget, crowdScore, criticScore),
      breakdown,
    };
  }

  const castAppeal =
    film.cast.reduce(
      (s, c) => s + c.appeal * (c.role === "lead" ? 0.6 : c.role === "colead" ? 0.25 : 0.075),
      0,
    ) || 40;
  const appealMult = t.appealMult.base + (castAppeal / 100) * t.appealMult.scale;
  const marketingMult = Math.min(
    t.marketingMult.cap,
    t.marketingMult.base +
      t.marketingMult.scale * Math.sqrt(film.marketing / (0.5 * film.budget)),
  );
  const focusBonus = film.deRisking.focusMarketing ? 1.05 : 1;
  const seasonMult = t.seasonMult[season];
  const comp = competitionCount(film, rivals);
  const competitionMult = Math.max(0.5, 1 - t.competitionPerRival * comp);
  const budgetScale = (film.budget / norm.budget) ** t.budgetExponent;
  const noise = lognormalFactor(rng, spread.sigmaMoney / t.moneySigmaDiv);

  let opening =
    norm.opening *
    budgetScale *
    appealMult *
    marketingMult *
    focusBonus *
    seasonMult *
    competitionMult *
    noise;
  if (strategy === "platform") {
    opening = Math.min(opening, norm.opening * t.platformOpeningCap);
  }
  opening = Math.round(opening * 10) / 10;

  const legs = opening * (t.legsBase + t.legsCrowdScale * (crowdScore / 100)) *
    (strategy === "platform" ? 1.25 : 1);
  const boxOffice = Math.round((opening + legs) * 10) / 10;

  const streamMult = GENRE_NORMS[film.genre].stream;
  const streaming =
    Math.round(
      (t.streamingBase + t.streamingAppeal * castAppeal + t.streamingCrowd * crowdScore) *
        streamMult *
        10,
    ) / 10;
  const ancillaryRate = t.ancillaryRate[film.genre] ?? 0;
  const franchiseBonus = film.cast.some((c) => c.role === "lead") ? 1 : 0.8;
  const ancillary = Math.round(boxOffice * ancillaryRate * franchiseBonus * 10) / 10;

  const studioTake = boxOffice * t.theatricalShare;
  const gross = studioTake + streaming + ancillary;
  const backendPoints = film.cast.reduce((s, c) => s + c.deal.backendPoints, 0) +
    film.demands
      .filter((d) => d.granted && d.demand.kind === "backend-points")
      .reduce((s, d) => s + (d.demand.points ?? 0), 0);
  const backendPay = Math.max(0, gross * (backendPoints / 100));
  const costs = film.budget + film.marketing + film.overruns + film.talentCost;
  const profit = Math.round((gross - backendPay - costs) * 10) / 10;

  breakdown.push({
    label: "Opening weekend",
    base: Math.round(norm.opening * budgetScale),
    modifiers: [
      { name: "Star appeal", value: Math.round((appealMult - 1) * 100) },
      { name: "Marketing", value: Math.round((marketingMult - 1) * 100) },
      { name: "Season window", value: Math.round((seasonMult - 1) * 100) },
      { name: "Competition", value: Math.round((competitionMult - 1) * 100) },
    ],
    noise: Math.round((noise - 1) * 100),
    final: opening,
  });
  breakdown.push({
    label: "Total box office",
    base: Math.round(opening),
    modifiers: [{ name: "Legs (word of mouth)", value: Math.round(legs) }],
    noise: 0,
    final: boxOffice,
  });
  breakdown.push({
    label: "Studio net",
    base: Math.round(gross),
    modifiers: [
      { name: "Backend points", value: -Math.round(backendPay) },
      { name: "Budget + marketing", value: -Math.round(costs) },
    ],
    noise: 0,
    final: profit,
  });

  return {
    opening,
    boxOffice,
    streaming,
    ancillary,
    profit,
    crowdScore,
    criticScore,
    verdict: verdictFor(profit, film.budget, crowdScore, criticScore),
    breakdown,
  };
}

export function verdictFor(
  profit: number,
  budget: number,
  crowd: number,
  critic: number,
): Verdict {
  const ratio = profit / Math.max(1, budget);
  if (profit < 0 && critic >= 75) return "succes-de-scandale";
  if (ratio >= 2) return "smash";
  if (ratio >= 0.8) return "hit";
  if (ratio >= 0.25 && (crowd >= 70 || critic >= 70)) return "sleeper";
  if (ratio >= -0.15) return "wash";
  if (ratio >= -0.6) return "flop";
  return "bomb";
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  smash: "SMASH",
  hit: "HIT",
  sleeper: "SLEEPER",
  wash: "BROKE EVEN",
  flop: "FLOP",
  bomb: "BOMB",
  "succes-de-scandale": "SUCCÈS DE SCANDALE",
};
