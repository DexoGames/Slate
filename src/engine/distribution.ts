import { GENRE_NORMS, TUNING } from "./tuning";
import type { Director, Film, RivalStudio } from "./types";
import { clamp } from "./rng";
import { auteurCred, competitionCount, computeSpread } from "./release";
import { computeLatent } from "./quality";
import { filmVision, legacyGate } from "./vision";

/**
 * Analytic outcome-range estimate for the UI's signature range bars. No Monte
 * Carlo, no RNG — pure expected value ± spread, so previews are stable while
 * the player toggles decisions.
 */
export interface AxisEstimate {
  floor: number;
  expected: number;
  ceiling: number;
  sigma: number;
}

export interface OutcomeEstimate {
  money: AxisEstimate; // $M profit
  crowd: AxisEstimate;
  critic: AxisEstimate;
  legacy: AxisEstimate; // seed potential band; 0-band if compromised
  vision: number;
  eligible: boolean;
}

export function estimateOutcomes(
  film: Film,
  director: Director,
  rivals: RivalStudio[],
): OutcomeEstimate {
  const t = TUNING;
  const latent = film.latent ?? computeLatent(film, director);
  const { E, A, X } = latent;
  const spread = computeSpread(film, director);
  const strategy = film.release?.strategy ?? "wide";
  const season = film.release?.season.season ?? 2;

  // ----- acclaim expectations mirror release.ts bases
  const crowdBase = clamp(
    t.crowdRoll.x * X + t.crowdRoll.e * E + t.crowdRoll.a * A -
      t.crowdRoll.crossPenalty * Math.max(0, A - X),
    0,
    spread.ceiling,
  );
  const criticBase = clamp(
    t.criticRoll.a * A + t.criticRoll.e * E + t.criticRoll.cred * auteurCred(director) * 10 -
      t.criticRoll.crossPenalty * Math.max(0, X - A) +
      (season === 3 ? t.fallCriticBonus : 0) +
      (strategy === "platform" ? t.platformCriticBonus : 0),
    0,
    spread.ceiling,
  );
  const sA = spread.sigmaAcclaim;
  const crowd: AxisEstimate = {
    floor: Math.round(clamp(crowdBase - 1.5 * sA * t.crowdRoll.sigmaScale, 0, spread.ceiling)),
    expected: Math.round(crowdBase),
    ceiling: Math.round(clamp(crowdBase + 1.5 * sA * t.crowdRoll.sigmaScale, 0, spread.ceiling)),
    sigma: sA * t.crowdRoll.sigmaScale,
  };
  const critic: AxisEstimate = {
    floor: Math.round(clamp(criticBase - 1.5 * sA, 0, spread.ceiling)),
    expected: Math.round(criticBase),
    ceiling: Math.round(clamp(criticBase + 1.5 * sA, 0, spread.ceiling)),
    sigma: sA,
  };

  // ----- money: expected profit and ±1.5σ band
  let money: AxisEstimate;
  const costs = film.budget + film.marketing + film.overruns + film.talentCost;
  if (strategy === "streaming") {
    const profit = film.budget * t.streamingSaleMult - costs;
    money = { floor: Math.round(profit), expected: Math.round(profit), ceiling: Math.round(profit), sigma: 0 };
  } else {
    const norm = GENRE_NORMS[film.genre];
    const castAppeal =
      film.cast.reduce(
        (s, c) => s + c.appeal * (c.role === "lead" ? 0.6 : c.role === "colead" ? 0.25 : 0.075),
        0,
      ) || 40;
    const appealMult = t.appealMult.base + (castAppeal / 100) * t.appealMult.scale;
    const marketingMult = Math.min(
      t.marketingMult.cap,
      t.marketingMult.base + t.marketingMult.scale * Math.sqrt(film.marketing / (0.5 * Math.max(1, film.budget))),
    );
    const comp = competitionCount(film, rivals);
    const competitionMult = Math.max(0.5, 1 - t.competitionPerRival * comp);
    let opening =
      norm.opening * (film.budget / norm.budget) ** t.budgetExponent *
      appealMult * marketingMult * t.seasonMult[season] * competitionMult *
      (film.deRisking.focusMarketing ? 1.05 : 1);
    if (strategy === "platform") opening = Math.min(opening, norm.opening * t.platformOpeningCap);
    const legsFactor = t.legsBase + t.legsCrowdScale * (crowdBase / 100);
    const box = opening * (1 + legsFactor * (strategy === "platform" ? 1.25 : 1));
    const streaming = (t.streamingBase + t.streamingAppeal * castAppeal + t.streamingCrowd * crowdBase) * norm.stream;
    const ancillary = box * (t.ancillaryRate[film.genre] ?? 0);
    const gross = box * t.theatricalShare + streaming + ancillary;
    const backendPoints = film.cast.reduce((s, c) => s + c.deal.backendPoints, 0) +
      film.demands.filter((d) => d.granted && d.demand.kind === "backend-points")
        .reduce((s, d) => s + (d.demand.points ?? 0), 0);
    const net = gross * (1 - backendPoints / 100);
    const expected = net - costs;
    const sigmaFactor = spread.sigmaMoney / t.moneySigmaDiv;
    money = {
      floor: Math.round(net * Math.exp(-1.5 * sigmaFactor) - costs),
      expected: Math.round(expected),
      ceiling: Math.round(net * Math.exp(1.5 * sigmaFactor) - costs),
      sigma: sigmaFactor,
    };
  }

  // ----- legacy potential (seed band; the final roll adds fixed noise on top)
  const vp = filmVision(film);
  const eligible = vp >= t.vpEligibleAt;
  const gate = legacyGate(vp);
  const divisiveEst = Math.min(t.divisivenessCap, Math.abs(criticBase - crowdBase)) / t.divisivenessCap * 100;
  const seedEst = eligible
    ? clamp(
        gate *
          (t.legacySeed.a * A + t.legacySeed.e * E + t.legacySeed.critic * criticBase +
            t.legacySeed.divisive * divisiveEst + t.legacySeed.vision * director.vision),
      )
    : 0;
  const legacy: AxisEstimate = eligible
    ? {
        floor: Math.round(clamp(seedEst - t.legacyFinalSigma * 1.2)),
        expected: Math.round(seedEst),
        ceiling: Math.round(clamp(seedEst + t.legacyFinalSigma * 1.2)),
        sigma: t.legacyFinalSigma,
      }
    : { floor: 0, expected: 0, ceiling: 0, sigma: 0 };

  return { money, crowd, critic, legacy, vision: vp, eligible };
}
