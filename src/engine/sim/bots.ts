import { gameReducer } from "../../state/gameReducer";
import { demandsFor, makeCastSlot } from "../negotiation";
import { newGame } from "../newGame";
import { productionSlots } from "../score";
import { GENRE_NORMS, TUNING } from "../tuning";
import type { Actor, Director, Film, GameState, Script, SeasonStamp } from "../types";
import { chance, makeRng, pick, type Rng } from "../rng";

/**
 * Headless policy bots for the balance harness. They play through the real
 * reducer — same action surface as the UI — so tuning data reflects the game
 * the player actually gets.
 */
export type Policy =
  | "maxSafety"
  | "maxVision"
  | "balanced"
  | "random"
  | "selectiveDeny"
  | "franchiseFarmer" // builds one IP and milks it
  | "hypeAbuser"; // EVENT posture on everything, always

export interface CampaignSummary {
  policy: Policy;
  seed: number;
  bankrupt: boolean;
  yearsSurvived: number;
  finalScore: number;
  legacyPoints: number;
  lifetimeProfit: number;
  released: number;
  classics: number;
  highBoth: number;
  bestFilmLegacy: number;
}

function pickScript(rng: Rng, policy: Policy, scripts: Script[], cash: number): Script | null {
  // affordable = can pay the option AND realistically produce the genre
  const affordable = scripts.filter(
    (s) =>
      s.askingPrice < cash * 0.1 + 2 &&
      GENRE_NORMS[s.genre].budget * 0.6 + s.askingPrice + 10 < cash,
  );
  if (affordable.length === 0) return null;
  switch (policy) {
    case "maxSafety":
    case "franchiseFarmer": {
      const safe = affordable.filter((s) => ["horror", "comedy", "action", "family", "thriller"].includes(s.genre));
      const pool = safe.length > 0 ? safe : affordable;
      return pool.reduce((a, b) => (a.hook > b.hook ? a : b));
    }
    case "maxVision":
      return affordable.reduce((a, b) => (a.ambition > b.ambition ? a : b));
    case "balanced":
    case "selectiveDeny":
    case "hypeAbuser":
      return affordable.reduce((a, b) =>
        a.hook + a.ambition > b.hook + b.ambition ? a : b,
      );
    case "random":
      return pick(rng, affordable);
  }
}

/** would this policy grant the demand? "coin" = flips at hire time */
function grantRule(policy: Policy, weight: 1 | 2 | 3, director?: Director): boolean | "coin" {
  if (policy === "maxVision") return true;
  if (policy === "maxSafety" || policy === "franchiseFarmer") return weight === 1;
  if (policy === "balanced" || policy === "hypeAbuser") return weight <= 2 ? true : "coin";
  if (policy === "selectiveDeny") {
    // the good reader of reputations: indulge the genuinely skilled, and
    // never hand chaos merchants extra variance
    if (!director) return weight === 1;
    if (director.craft >= 70) return true;
    if (director.volatility >= 60) return weight === 1;
    return weight <= 2;
  }
  return "coin";
}

/** the budget floor this policy would be signing up for with this director */
function plannedFloor(policy: Policy, game: GameState, film: Film, d: Director): number {
  const floorDemand = demandsFor(game, film, d).find((dd) => dd.kind === "budget-floor");
  if (!floorDemand?.budgetFloor) return 0;
  // treat coins as granted — conservative affordability check
  return grantRule(policy, floorDemand.weight, d) === false ? 0 : floorDemand.budgetFloor;
}

function pickDirector(
  rng: Rng,
  policy: Policy,
  game: GameState,
  film: Film,
): Director | null {
  const candidates = game.market.directors.filter(
    (d) =>
      d.salary < game.studio.cash * 0.35 &&
      d.minTier <= tierIndexToTier(game) &&
      plannedFloor(policy, game, film, d) <= game.studio.cash * 0.5 &&
      // the farmer never opens a negotiation it would have to walk out of:
      // auteurs want a passion project for a sequel, and the farmer won't grant it
      !(
        policy === "franchiseFarmer" &&
        film.franchiseId &&
        d.style > TUNING.franchise.auteurRefusalStyle
      ),
  );
  if (candidates.length === 0) return null;
  switch (policy) {
    case "maxSafety":
    case "franchiseFarmer":
      return candidates.reduce((a, b) =>
        a.style - a.volatility < b.style - b.volatility ? a : b,
      );
    case "maxVision":
      return candidates.reduce((a, b) => (a.vision + a.style > b.vision + b.style ? a : b));
    case "balanced":
    case "selectiveDeny":
    case "hypeAbuser": {
      const fit = (d: Director) => (d.genres[film.genre] ?? 40) + d.craft;
      return candidates.reduce((a, b) => (fit(a) > fit(b) ? a : b));
    }
    case "random":
      return pick(rng, candidates);
  }
}

function tierIndexToTier(game: GameState): number {
  let tier = 1;
  TUNING.tierThresholds.forEach((th, i) => {
    if (game.studio.legacyPoints >= th) tier = i + 1;
  });
  return tier;
}

function pickCast(rng: Rng, policy: Policy, game: GameState, film: Film) {
  const affordable = (max: number) =>
    game.market.actors.filter((a) => a.salary < max).sort(() => 0);
  const budgetForCast = game.studio.cash * 0.35;
  const pool = affordable(budgetForCast);
  if (pool.length === 0) return [];
  const by = (fn: (a: Actor) => number) => [...pool].sort((a, b) => fn(b) - fn(a));
  let ordered: Actor[];
  switch (policy) {
    case "maxSafety":
    case "franchiseFarmer":
      ordered = by((a) => a.appeal);
      break;
    case "maxVision":
      ordered = by((a) => a.craft);
      break;
    case "balanced":
    case "selectiveDeny":
    case "hypeAbuser":
      ordered = by((a) => a.appeal + a.craft);
      break;
    case "random":
      ordered = [...pool].sort(() => (chance(rng, 0.5) ? 1 : -1));
      break;
  }
  const lead = ordered[0];
  const support = ordered.slice(1, 3);
  const backend = policy === "maxSafety" ? 40 : 0;
  const cast = [makeCastSlot(lead, film, "lead", backend)];
  let spend = cast[0].deal.salary;
  for (const s of support) {
    const slot = makeCastSlot(s, film, "support", backend);
    if (spend + slot.deal.salary > budgetForCast) break;
    cast.push(slot);
    spend += slot.deal.salary;
  }
  return cast;
}

function chooseWindow(game: GameState, policy: Policy): { season: SeasonStamp; strategy: "wide" | "platform" | "streaming" } {
  const windows: SeasonStamp[] = Array.from({ length: 4 }, (_, i) => {
    const idx = game.clock.year * 4 + game.clock.season + i + 1;
    return { year: Math.floor(idx / 4), season: (idx % 4) as 0 | 1 | 2 | 3 };
  });
  if (policy === "maxVision") {
    const fall = windows.find((w) => w.season === 3) ?? windows[0];
    return { season: fall, strategy: "platform" };
  }
  const summer = windows.find((w) => w.season === 2) ?? windows[0];
  return { season: summer, strategy: "wide" };
}

export function playCampaign(
  seed: number,
  policy: Policy,
  years: number = TUNING.campaignYears,
  trace?: string[],
): CampaignSummary {
  const rng = makeRng((seed ^ 0xbadc0de) >>> 0);
  let game = newGame(seed, { kind: "campaign", lengthYears: years });
  const prevReducer = gameReducer;
  const step: typeof gameReducer = (g, a) => {
    const next = prevReducer(g, a);
    trace?.push(
      `${a.type}${next === g ? " (NO-OP)" : ""} cash=${next.studio.cash.toFixed(0)} y${next.clock.year}s${next.clock.season}`,
    );
    return next;
  };

  let guard = years * 4 * 12; // action budget; prevents infinite loops on logic bugs
  while (!game.gameOver && guard-- > 0) {
    // 1. resolve pending events
    if (game.pendingEvents.length > 0) {
      const e = game.pendingEvents[0];
      const choice =
        policy === "maxSafety" || policy === "franchiseFarmer"
          ? "protect"
          : policy === "maxVision"
            ? "trust"
            : chance(rng, 0.5)
              ? "trust"
              : "protect";
      game = step(game, { type: "RESOLVE_EVENT", filmId: e.filmId, eventId: e.eventId, choice });
      continue;
    }
    // 2. dismiss ceremonies
    if (game.releaseQueue.length > 0) {
      game = step(game, { type: "DISMISS_RELEASE" });
      continue;
    }
    if (game.screen === "year-end" && game.yearEnd) {
      game = step(game, { type: "DISMISS_YEAR_END" });
      continue;
    }

    // 3. develop the pipeline
    const devFilm = game.studio.filmIds
      .map((id) => game.films[id])
      .find((f): f is Film => !!f && f.stage === "development");
    const postFilm = game.studio.filmIds
      .map((id) => game.films[id])
      .find((f): f is Film => !!f && f.stage === "post");
    const inFlight = game.studio.filmIds.filter((id) => {
      const f = game.films[id];
      return f && (f.stage === "production" || f.stage === "post" || f.stage === "scheduled");
    }).length;

    if (postFilm) {
      const t = TUNING;
      let dr =
        policy === "maxSafety"
          ? { testScreeningHeld: true, notesImplemented: "major" as const, studioReshoots: true, focusMarketing: true, completionBond: postFilm.deRisking.completionBond }
          : policy === "maxVision"
            ? { ...postFilm.deRisking, testScreeningHeld: false, notesImplemented: "none" as const }
            : { ...postFilm.deRisking, testScreeningHeld: true, notesImplemented: (chance(rng, 0.5) ? "minor" : "none") as "minor" | "none" };
      let toolCost =
        (dr.testScreeningHeld ? t.testScreeningCost : 0) +
        (dr.notesImplemented === "minor" ? t.notesCost.minor : dr.notesImplemented === "major" ? t.notesCost.major : 0) +
        (dr.studioReshoots ? postFilm.budget * t.reshootsBudgetPct : 0);
      // a film in post always goes out — drop the tools before dropping the release
      if (game.studio.cash < toolCost + 3) {
        dr = { ...postFilm.deRisking };
        toolCost = 0;
      }
      const desired = Math.round(
        postFilm.budget *
          (policy === "maxSafety" || policy === "franchiseFarmer" || policy === "hypeAbuser"
            ? 0.6
            : 0.4),
      );
      const posture = policy === "hypeAbuser" ? ("event" as const) : ("standard" as const);
      const focusFactor =
        (dr.focusMarketing ? 1 + t.focusMarketingPct : 1) * t.hype.postureCost[posture];
      const { season, strategy } = chooseWindow(game, policy);
      // keep enough back to pay overhead until the box office arrives
      const seasonsOut =
        season.year * 4 + season.season - (game.clock.year * 4 + game.clock.season);
      const reserve = 2 + t.overheadPerSeason * (seasonsOut + 1);
      const available = (game.studio.cash - toolCost - reserve) / focusFactor;
      const marketing = Math.max(1, Math.min(desired, Math.floor(available)));
      game = step(game, {
        type: "SCHEDULE_RELEASE",
        filmId: postFilm.id,
        deRisking: dr,
        marketing,
        season,
        strategy,
        posture,
      });
      continue;
    }

    if (devFilm) {
      if (!devFilm.directorId) {
        const director = pickDirector(rng, policy, game, devFilm);
        if (director) {
          const demands = demandsFor(game, devFilm, director);
          const decisions = demands.map((demand) => {
            const rule = grantRule(policy, demand.weight, director);
            return { demand, granted: rule === "coin" ? chance(rng, 0.5) : rule };
          });
          const before = game;
          game = step(game, {
            type: "HIRE_DIRECTOR",
            filmId: devFilm.id,
            directorId: director.id,
            decisions,
          });
          // if they walked, try again next loop iteration
          if (game !== before) continue;
        }
        // nobody affordable — advance and hope the market improves
        game = step(game, { type: "ADVANCE_SEASON" });
        continue;
      }
      if (devFilm.cast.length === 0) {
        const cast = pickCast(rng, policy, game, devFilm);
        if (cast.length > 0) {
          game = step(game, { type: "SET_CAST", filmId: devFilm.id, cast });
          continue;
        }
        game = step(game, { type: "ADVANCE_SEASON" });
        continue;
      }
      // greenlight — reserve roughly half the remaining cash for marketing later
      const norm = GENRE_NORMS[devFilm.genre];
      const floor = devFilm.demands.find((d) => d.granted && d.demand.kind === "budget-floor")?.demand.budgetFloor ?? 0;
      const target = Math.round(norm.budget * (policy === "maxVision" ? 1.1 : 0.9));
      const budget = Math.max(floor, Math.min(target, Math.floor(game.studio.cash * 0.55)));
      const days = Math.max(
        devFilm.demands.find((d) => d.granted && d.demand.kind === "shooting-days")?.demand.days ?? 0,
        Math.round(norm.days * (policy === "maxSafety" ? 0.9 : 1.05)),
      );
      const incoming = game.studio.filmIds.some((id) => {
        const f = game.films[id];
        return f && (f.stage === "production" || f.stage === "scheduled");
      });
      if (game.studio.cash > budget * 1.2 && inFlight < productionSlots(game.studio.legacyPoints)) {
        game = step(game, {
          type: "GREENLIGHT",
          filmId: devFilm.id,
          budget,
          days,
          bond: policy !== "maxVision",
        });
        continue;
      }
      // can't fund it and no revenue on the way — cut the loss before it bleeds us out
      if (!incoming) {
        game = step(game, { type: "ABANDON_FILM", filmId: devFilm.id });
        continue;
      }
      game = step(game, { type: "ADVANCE_SEASON" });
      continue;
    }

    // 4a. the farmer goes back to the well before it goes to the market
    if (
      policy === "franchiseFarmer" &&
      inFlight < productionSlots(game.studio.legacyPoints) &&
      game.studio.cash > 18
    ) {
      const ip = game.studio.franchises
        .filter((f) => f.fatigue <= 50)
        .reduce<(typeof game.studio.franchises)[number] | null>(
          (best, f) => (best === null || f.awareness > best.awareness ? f : best),
          null,
        );
      if (ip) {
        const before = game;
        game = step(game, { type: "DEVELOP_SEQUEL", franchiseId: ip.id });
        if (game !== before) continue;
      }
    }

    // 4. buy a script when there's room
    if (inFlight < productionSlots(game.studio.legacyPoints) && game.studio.cash > 18) {
      const script = pickScript(rng, policy, game.market.scripts, game.studio.cash);
      if (script) {
        game = step(game, { type: "BUY_SCRIPT", scriptId: script.id });
        continue;
      }
    }

    game = step(game, { type: "ADVANCE_SEASON" });
  }

  const films = game.studio.filmIds
    .map((id) => game.films[id])
    .filter((f): f is Film => !!f && f.stage === "released");
  const lifetimeProfit = films.reduce((s, f) => s + (f.result?.profit ?? 0), 0);
  const classics = films.filter(
    (f) => (f.legacy?.finalScore ?? 0) >= TUNING.legacyThresholds.classic,
  ).length;
  const highBoth = films.filter(
    (f) => (f.result?.crowdScore ?? 0) >= 80 && (f.result?.criticScore ?? 0) >= 80,
  ).length;

  return {
    policy,
    seed,
    bankrupt: game.gameOver?.reason === "bankrupt",
    yearsSurvived: game.clock.year,
    finalScore: game.gameOver?.score?.total ?? 0,
    legacyPoints: game.studio.legacyPoints,
    lifetimeProfit,
    released: films.length,
    classics,
    highBoth,
    bestFilmLegacy: Math.max(0, ...films.map((f) => f.legacy?.finalScore ?? 0)),
  };
}

export function runBatch(policy: Policy, n: number, years?: number): CampaignSummary[] {
  return Array.from({ length: n }, (_, i) => playCampaign(1000 + i * 17, policy, years));
}
