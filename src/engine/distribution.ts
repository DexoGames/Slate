import { GENRE_NORMS, TUNING } from "./tuning";
import type { Director, Film, FranchiseIP, GenreTrends, RivalStudio } from "./types";
import { clamp } from "./rng";
import {
  auteurCred,
  castMoneyProfile,
  competitionCount,
  computeSpread,
  genreShape,
  trendMult,
} from "./release";
import { computeLatent } from "./quality";
import { computeHype } from "./publicity";
import { filmVision, legacyGate } from "./vision";

/**
 * Analytic outcome estimate for the forecast bars. No Monte Carlo, no RNG —
 * five-number summaries (2.5% / 25% / 50% / 75% / 97.5%) derived from the same
 * μ/σ the release roll uses, so previews are stable while the player toggles
 * decisions. NOTE: callers should pass a PERCEIVED director (perception.ts) —
 * the forecast is the industry's read, not the truth.
 */

const Z_TAIL = 1.96; // 2.5% / 97.5%
const Z_QUART = 0.674; // 25% / 75%

export interface AxisEstimate {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  sigma: number;
}

export interface OutcomeEstimate {
  money: AxisEstimate; // $M profit (lognormal → visibly right-skewed)
  crowd: AxisEstimate;
  critic: AxisEstimate;
  legacy: AxisEstimate; // seed potential band; zeroed when compromised
  vision: number;
  eligible: boolean;
}

function normalFive(mu: number, sigma: number, cap: number): AxisEstimate {
  const p = (z: number) => Math.round(clamp(mu + z * sigma, 0, cap));
  return {
    min: p(-Z_TAIL),
    q1: p(-Z_QUART),
    median: p(0),
    q3: p(Z_QUART),
    max: p(Z_TAIL),
    sigma,
  };
}

export function estimateOutcomes(
  film: Film,
  director: Director,
  rivals: RivalStudio[],
  trends?: GenreTrends,
  franchise?: FranchiseIP,
  brandFx: { opening: number; critic: number } = { opening: 1, critic: 0 },
): OutcomeEstimate {
  const t = TUNING;
  const latent = film.latent ?? computeLatent(film, director);
  const { E, A, X } = latent;
  const spread = computeSpread(film, director, franchise);
  const profile = castMoneyProfile(film);
  const shape = genreShape(film);
  const strategy = film.release?.strategy ?? "wide";
  const season = film.release?.season.season ?? 2;
  // unscheduled films are previewed at a standard-posture campaign
  const hype =
    film.hype ||
    computeHype(
      film,
      film.release?.posture ?? "standard",
      film.marketing || film.budget * 0.4,
      franchise,
    );

  // ----- acclaim: mirrors release.ts bases
  const crowdBase = clamp(
    t.crowdRoll.x * X + t.crowdRoll.e * E + t.crowdRoll.a * A -
      t.crowdRoll.crossPenalty * Math.max(0, A - X) -
      film.crowdPenalty +
      (film.festival === "divisive" ? t.festival.divisiveCrowd : 0),
    0,
    spread.ceiling,
  );
  const criticBase = clamp(
    t.criticRoll.a * A + t.criticRoll.e * E + t.criticRoll.cred * auteurCred(director) * 10 -
      t.criticRoll.crossPenalty * Math.max(0, X - A) +
      (season === 3 ? t.fallCriticBonus : 0) +
      (strategy === "platform" ? t.platformCriticBonus : 0) +
      profile.criticBonus +
      brandFx.critic +
      (film.festival === "golden" ? t.festival.goldenCritic : 0),
    0,
    spread.ceiling,
  );
  const crowd = normalFive(crowdBase, spread.sigmaAcclaim * t.crowdRoll.sigmaScale, spread.ceiling);
  const critic = normalFive(criticBase, spread.sigmaAcclaim, spread.ceiling);

  // ----- money: lognormal five-number summary of net profit
  let money: AxisEstimate;
  const costs = film.budget + film.marketing + film.overruns + film.talentCost;
  if (strategy === "streaming") {
    const profit = Math.round(film.budget * t.streamingSaleMult - costs);
    money = { min: profit, q1: profit, median: profit, q3: profit, max: profit, sigma: 0 };
  } else {
    const norm = GENRE_NORMS[film.genre];
    const castAppeal = profile.castAppeal;
    const appealMult = t.appealMult.base + (castAppeal / 100) * t.appealMult.scale;
    const marketingMult = Math.min(
      t.marketingMult.cap,
      t.marketingMult.base + t.marketingMult.scale * Math.sqrt(film.marketing / (0.5 * Math.max(1, film.budget))),
    );
    const comp = competitionCount(film, rivals);
    const competitionMult = Math.max(0.5, 1 - t.competitionPerRival * comp);
    const franchiseOpen = franchise
      ? (1 + (franchise.awareness / 100) * t.franchise.openingBoost) *
        (1 - franchise.fatigue / t.franchise.fatigueOpeningDiv)
      : 1;
    let opening =
      norm.opening * (film.budget / norm.budget) ** t.budgetExponent *
      appealMult * marketingMult * t.seasonMult[season] * competitionMult *
      trendMult(film, trends) *
      franchiseOpen *
      (t.hype.openingBase + hype / t.hype.openingDiv) *
      brandFx.opening *
      (film.deRisking.focusMarketing ? 1.05 : 1);
    if (strategy === "platform") opening = Math.min(opening, norm.opening * t.platformOpeningCap);
    const hypeBar = t.hype.expectationBase + hype / t.hype.expectationDiv;
    const hypeLegsMult =
      crowdBase < hypeBar - t.hype.missTol
        ? t.hype.missLegsMult
        : crowdBase > hypeBar + t.hype.missTol && hype < t.hype.beatHypeMax
          ? t.hype.beatLegsMult
          : 1;
    const legsFactor =
      (t.legsBase + t.legsCrowdScale * (crowdBase / 100)) *
      shape.legsProfile *
      profile.legsMult *
      hypeLegsMult;
    const box = opening * (1 + legsFactor * (strategy === "platform" ? 1.25 : 1));
    const subStream = film.script.subGenre ? GENRE_NORMS[film.script.subGenre].stream : null;
    const streamNorm =
      (subStream !== null ? (norm.stream + subStream) / 2 : norm.stream) * profile.streamMult;
    const streaming = (t.streamingBase + t.streamingAppeal * castAppeal + t.streamingCrowd * crowdBase) * streamNorm;
    const ancillary = box * (t.ancillaryRate[film.genre] ?? 0);
    const gross = box * t.theatricalShare + streaming + ancillary;
    const backendPoints = film.cast.reduce((s, c) => s + c.deal.backendPoints, 0) +
      film.demands.filter((d) => d.granted && d.demand.kind === "backend-points")
        .reduce((s, d) => s + (d.demand.points ?? 0), 0);
    const net = gross * (1 - backendPoints / 100);
    const sigmaFactor = spread.sigmaMoney / t.moneySigmaDiv;
    const at = (z: number) => Math.round(net * Math.exp(z * sigmaFactor) - costs);
    money = {
      min: at(-Z_TAIL),
      q1: at(-Z_QUART),
      median: at(0),
      q3: at(Z_QUART),
      max: at(Z_TAIL),
      sigma: sigmaFactor,
    };
  }

  // ----- legacy potential (seed band; the final roll adds fixed noise on top)
  const vp = filmVision(film);
  const eligible = vp >= t.vpEligibleAt;
  const gate = legacyGate(vp);
  const demandDivisive = film.demands.reduce(
    (s, d) => s + (d.granted ? d.demand.effects?.divisive ?? 0 : 0),
    0,
  );
  const divisiveEst =
    (Math.min(t.divisivenessCap, Math.abs(criticBase - crowdBase) + demandDivisive) /
      t.divisivenessCap) *
    100;
  const seedEst = eligible
    ? clamp(
        gate *
          (t.legacySeed.a * A + t.legacySeed.e * E + t.legacySeed.critic * criticBase +
            t.legacySeed.divisive * divisiveEst + t.legacySeed.vision * director.vision),
      )
    : 0;
  const legacy: AxisEstimate = eligible
    ? normalFive(seedEst, t.legacyFinalSigma, 100)
    : { min: 0, q1: 0, median: 0, q3: 0, max: 0, sigma: 0 };

  return { money, crowd, critic, legacy, vision: vp, eligible };
}
