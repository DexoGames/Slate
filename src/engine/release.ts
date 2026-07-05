import { comboEffects } from "./generate/scripts";
import { isUnhurried, schedulePressure } from "./schedule";
import { GENRE_NORMS, TUNING } from "./tuning";
import type {
  Director,
  Film,
  FranchiseIP,
  GenreTrends,
  ReleaseResult,
  RivalStudio,
  RollBreakdown,
  RollModifier,
  Verdict,
} from "./types";
import { filmVision } from "./vision";
import { chance, clamp, lognormalMeanOne, normal, type Rng } from "./rng";

/**
 * Streaming reach scales with theatrical footprint: a micro film collects only
 * a fraction of the streaming a wide hit does. Shared by rollRelease and the
 * forecast (distribution.ts) — the honesty contract (§HARD-5) forbids a second copy.
 */
export function streamingReach(boxOffice: number, normOpening: number): number {
  const t = TUNING.streamingReach;
  return t.base + t.scale * Math.min(1, boxOffice / (t.div * normOpening));
}

/**
 * "The town's cut": the progressive windfall participation on a single film's
 * profit. Monotonic and continuous, so distribution.ts can map each money
 * quantile through it and preserve the ordering. Negative profit passes through.
 */
export function windfallNet(profit: number): { net: number; cut: number } {
  const w = TUNING.windfall;
  if (profit <= w.freeUpTo) return { net: profit, cut: 0 };
  let net = w.freeUpTo;
  net += (Math.min(profit, w.band1To) - w.freeUpTo) * w.band1Keep;
  if (profit > w.band1To) net += (profit - w.band1To) * w.band2Keep;
  net = Math.round(net * 10) / 10;
  return { net, cut: Math.round((profit - net) * 10) / 10 };
}

/** the money-facing profile of a cast: fanbase-weighted appeal + leg/stream shifts */
export interface CastProfile {
  castAppeal: number;
  legsMult: number;
  streamMult: number;
  criticBonus: number;
}

export function castMoneyProfile(film: Film): CastProfile {
  const t = TUNING;
  let castAppeal = 0;
  let legsMult = 1;
  let streamMult = 1;
  let criticBonus = 0;
  for (const c of film.cast) {
    const w = c.role === "lead" ? 0.6 : c.role === "colead" ? 0.25 : 0.075;
    const fb = t.fanbase[c.fanbase];
    const factor = c.againstType ? fb.outType : fb.inType;
    castAppeal += c.appeal * factor * w;
    if (c.role === "lead") {
      if (c.fanbase === "arthouse") criticBonus += t.arthouseLeadCriticBonus;
      if (c.fanbase === "teen") legsMult *= t.teenLegsPenalty;
      if (c.fanbase === "nostalgia") {
        legsMult *= t.nostalgiaLegsBonus;
        streamMult *= t.nostalgiaStreamBonus;
      }
    }
  }
  if (film.cast.length === 0) castAppeal = 40;
  return { castAppeal, legsMult, streamMult, criticBonus };
}

/** the film's box-office shape: genre (blended for two-handers) + combo risk */
export function genreShape(film: Film): {
  sigmaMult: number;
  legsProfile: number;
  comboSigma: number;
} {
  const p = GENRE_NORMS[film.genre];
  const sub = film.script.subGenre;
  if (!sub) return { sigmaMult: p.sigmaMult, legsProfile: p.legsProfile, comboSigma: 0 };
  const s = GENRE_NORMS[sub];
  return {
    sigmaMult: (p.sigmaMult + s.sigmaMult) / 2,
    legsProfile: (p.legsProfile + s.legsProfile) / 2,
    comboSigma: comboEffects(film.genre, sub).sigma,
  };
}

/** hot genres open bigger, cold ones smaller; a blend counts either genre */
export function trendMult(film: Film, trends: GenreTrends | undefined): number {
  if (!trends) return 1;
  const genres = [film.genre, film.script.subGenre].filter(Boolean);
  if (trends.hot && genres.includes(trends.hot)) return TUNING.trend.hotMult;
  if (trends.cold && genres.includes(trends.cold)) return TUNING.trend.coldMult;
  return 1;
}

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

export function computeSpread(
  film: Film,
  director: Director,
  franchise?: FranchiseIP,
): Spread {
  const t = TUNING;
  const parts: RollModifier[] = [{ name: "Base", value: t.sigmaBase }];
  let sigma = t.sigmaBase;
  let ceiling = t.ceilingBase;

  const majors = film.demands.filter((d) => d.demand.weight >= 2);
  const granted = majors.filter((d) => d.granted).length;
  const denied = majors.length - granted;
  if (granted > 0) {
    sigma += granted * t.sigmaPerMajorDemand;
    // the hidden truth: ceiling gains scale with the director's TRUE craft.
    // final cut in a master's hands buys ceiling; in a hack's, only variance.
    ceiling += granted * t.ceilingPerDemand * (director.craft / t.ceilingCraftPivot);
    parts.push({ name: "Demands granted", value: granted * t.sigmaPerMajorDemand });
  }
  if (denied > 0) {
    ceiling -= denied * t.ceilingPerDemand;
    sigma += denied * t.sigmaPerDeniedMajor;
    parts.push({ name: "Demands denied (narrowed, capped)", value: denied * t.sigmaPerDeniedMajor });
  }

  // bespoke effects from granted craft demands
  let effectSigma = 0;
  for (const d of film.demands) {
    if (d.granted && d.demand.effects?.sigma) effectSigma += d.demand.effects.sigma;
  }
  if (effectSigma !== 0) {
    sigma += effectSigma;
    parts.push({ name: "Creative risks", value: effectSigma });
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
  const shape = genreShape(film);
  if (shape.comboSigma !== 0) {
    sigma += shape.comboSigma;
    parts.push({ name: "Genre blend", value: shape.comboSigma });
  }

  // a crunched schedule widens the roll; an unhurried one steadies it (§1)
  const pressure = schedulePressure(film);
  if (pressure > 0) {
    const cs = Math.round(pressure * t.schedule.crunchSigma * 10) / 10;
    sigma += cs;
    parts.push({ name: "Crunch schedule", value: cs });
  } else if (isUnhurried(film)) {
    sigma += t.schedule.unhurriedSigma;
    parts.push({ name: "Unhurried schedule", value: t.schedule.unhurriedSigma });
  }

  // no compromises at all = a wide, high-ceiling bet (§6)
  if (filmVision(film) >= t.sigmaPureVisionAt) {
    sigma += t.sigmaPureVision;
    ceiling += t.ceilingPureVision;
    parts.push({ name: "Uncompromised vision", value: t.sigmaPureVision });
  }

  // cast passion raises the ceiling only — what's possible, never guaranteed (§4)
  if (film.cast.length > 0) {
    let wsum = 0;
    let wtot = 0;
    for (const c of film.cast) {
      const w = c.role === "lead" ? 0.6 : c.role === "colead" ? 0.25 : 0.15;
      wsum += (c.passion ?? t.passion.base) * w;
      wtot += w;
    }
    const bonus = Math.round((wsum / wtot / 100) * t.passion.ceilingBonus * 10) / 10;
    if (bonus > 0) {
      ceiling += bonus;
      parts.push({ name: "Cast passion", value: bonus });
    }
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

  // a cheap, low-wattage, unproven lead is a box-office gamble: will they draw?
  // a bankable star buys that variance down (§3)
  const leadSlot = film.cast.find((c) => c.role === "lead");
  if (leadSlot) {
    const appealShort = Math.max(0, t.star.reliableAppeal - leadSlot.appeal) / t.star.reliableAppeal;
    const green = 1 - clamp(leadSlot.experience) / 100; // 0 veteran .. 1 unknown
    const drawRisk = Math.round(appealShort * green * t.star.unprovenSigma * 10) / 10;
    if (drawRisk > 0) {
      sigmaMoney += drawRisk;
      parts.push({ name: "Unproven draw", value: drawRisk });
    }
  }

  // awareness IS safety: a known name narrows the money roll
  const franchiseMult = franchise ? 1 - franchise.awareness / t.franchise.sigmaDiv : 1;

  return {
    sigmaAcclaim: clamp(sigmaAcclaim, t.sigmaMin, t.sigmaMax),
    // the genre's shape scales money risk AFTER the clamp: horror is a
    // lottery ticket no matter how carefully you de-risk the roll
    sigmaMoney: clamp(sigmaMoney, t.sigmaMin, t.sigmaMax) * shape.sigmaMult * franchiseMult,
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
  trends?: GenreTrends,
  franchise?: FranchiseIP,
  brandFx: { opening: number; critic: number } = { opening: 1, critic: 0 },
): ReleaseResult {
  const t = TUNING;
  const norm = GENRE_NORMS[film.genre];
  const { E, A, X } = film.latent ?? { E: 50, A: 40, X: 50 };
  const spread = computeSpread(film, director, franchise);
  const strategy = film.release?.strategy ?? "wide";
  const season = film.release?.season.season ?? 0;
  const breakdown: RollBreakdown[] = [];

  // ----- crowd score
  const crowdBase =
    t.crowdRoll.x * X +
    t.crowdRoll.e * E +
    t.crowdRoll.a * A -
    t.crowdRoll.crossPenalty * Math.max(0, A - X) -
    film.crowdPenalty +
    (film.festival === "divisive" ? t.festival.divisiveCrowd : 0);
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
  const profile = castMoneyProfile(film);
  const shape = genreShape(film);
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
    platformBonus +
    profile.criticBonus +
    brandFx.critic +
    (film.festival === "golden" ? t.festival.goldenCritic : 0);
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
    const grossProfit = Math.round((revenue - costs) * 10) / 10;
    const { net: profit, cut } = windfallNet(grossProfit);
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
      grossProfit,
      windfallCut: cut,
      crowdScore,
      criticScore,
      verdict: verdictFor(grossProfit, film.budget, crowdScore, criticScore),
      breakdown,
    };
  }

  const castAppeal = profile.castAppeal;
  const appealMult = t.appealMult.base + (castAppeal / 100) * t.appealMult.scale;
  // P&A goes further on a name people already know
  const effMarketing = franchise
    ? film.marketing / t.franchise.marketingEff
    : film.marketing;
  const marketingMult = Math.min(
    t.marketingMult.cap,
    t.marketingMult.base +
      t.marketingMult.scale * Math.sqrt(effMarketing / (0.5 * film.budget)),
  );
  const focusBonus = film.deRisking.focusMarketing ? 1.05 : 1;
  const seasonMult = t.seasonMult[season];
  const comp = competitionCount(film, rivals);
  const competitionMult = Math.max(0.5, 1 - t.competitionPerRival * comp);
  const budgetScale = (film.budget / norm.budget) ** t.budgetExponent;
  // a small-canvas concept caps its own reach: throwing tentpole money at a
  // scrappy script won't make it open like one (§4)
  const sb = t.scriptBudget;
  const canvasMult = sb.canvasBase + sb.canvasScale * clamp(film.script.budgetTarget / norm.budget, 0, 2);
  // mean-1 noise: the upside is a real tail, not a systematic over-performance
  const noise = lognormalMeanOne(rng, spread.sigmaMoney / t.moneySigmaDiv);

  // the irreducible risk: even a perfectly de-risked film can crater for a
  // reason nobody saw coming. Mitigation shrinks the odds but never to zero —
  // this is the "you can't buy your way to a guaranteed hit" floor (§1). It is
  // deliberately NOT in the forecast: it's the surprise the forecast can't sell.
  const cat = t.catastrophe;
  let catP = cat.base;
  if (film.deRisking.completionBond) catP *= cat.bondMult;
  if (film.deRisking.studioReshoots) catP *= cat.reshootMult;
  if (isUnhurried(film)) catP *= cat.unhurriedMult;
  const catastrophe = chance(rng, catP);
  const catFactor = catastrophe ? cat.severity : 1;

  const tMult = trendMult(film, trends);
  const franchiseOpen = franchise
    ? (1 + (franchise.awareness / 100) * t.franchise.openingBoost) *
      (1 - franchise.fatigue / t.franchise.fatigueOpeningDiv)
    : 1;
  // hype sells tickets…
  const hypeMult = t.hype.openingBase + film.hype / t.hype.openingDiv;
  let opening =
    norm.opening *
    budgetScale *
    canvasMult *
    appealMult *
    marketingMult *
    focusBonus *
    seasonMult *
    competitionMult *
    tMult *
    franchiseOpen *
    hypeMult *
    brandFx.opening *
    noise *
    catFactor;
  if (strategy === "platform") {
    opening = Math.min(opening, norm.opening * t.platformOpeningCap);
  }
  opening = Math.round(opening * 10) / 10;

  // the expectation bill: a sequel that lets the fans down loses its legs
  const expectationMiss =
    franchise && crowdScore < franchise.expectation - t.franchise.expectationMissTol;
  // …and sets the bar the film is judged against
  const hypeBar = t.hype.expectationBase + film.hype / t.hype.expectationDiv;
  const hypeMiss = crowdScore < hypeBar - t.hype.missTol;
  const sleeper = crowdScore > hypeBar + t.hype.missTol && film.hype < t.hype.beatHypeMax;
  const legs =
    opening *
    (t.legsBase + t.legsCrowdScale * (crowdScore / 100)) *
    shape.legsProfile *
    profile.legsMult *
    (expectationMiss ? t.franchise.missLegsMult : 1) *
    (hypeMiss ? t.hype.missLegsMult : sleeper ? t.hype.beatLegsMult : 1) *
    (strategy === "platform" ? 1.25 : 1);
  const boxOffice = Math.round((opening + legs) * 10) / 10;

  const subStream = film.script.subGenre ? GENRE_NORMS[film.script.subGenre].stream : null;
  const streamMult =
    (subStream !== null
      ? (GENRE_NORMS[film.genre].stream + subStream) / 2
      : GENRE_NORMS[film.genre].stream) * profile.streamMult;
  const streaming =
    Math.round(
      (t.streamingBase + t.streamingAppeal * castAppeal + t.streamingCrowd * crowdScore) *
        streamMult *
        streamingReach(boxOffice, norm.opening) *
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
  const grossProfit = Math.round((gross - backendPay - costs) * 10) / 10;
  // the town renegotiates when you're rich (§5) — applied last, so verdicts
  // and franchise minting still read the pre-cut gross
  const { net: profit, cut: windfallCut } = windfallNet(grossProfit);

  breakdown.push({
    label: "Opening weekend",
    base: Math.round(norm.opening * budgetScale),
    modifiers: [
      { name: "Star appeal", value: Math.round((appealMult - 1) * 100) },
      { name: "Marketing", value: Math.round((marketingMult - 1) * 100) },
      { name: "Season window", value: Math.round((seasonMult - 1) * 100) },
      { name: "Competition", value: Math.round((competitionMult - 1) * 100) },
      { name: "Genre trend", value: Math.round((tMult - 1) * 100) },
      { name: "Franchise awareness", value: Math.round((franchiseOpen - 1) * 100) },
      ...(catastrophe
        ? [{ name: "Production catastrophe", value: -Math.round((1 - cat.severity) * 100) }]
        : []),
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
      ...(windfallCut > 0
        ? [{ name: "The town's cut", value: -Math.round(windfallCut) }]
        : []),
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
    grossProfit,
    windfallCut,
    crowdScore,
    criticScore,
    verdict: verdictFor(grossProfit, film.budget, crowdScore, criticScore),
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
