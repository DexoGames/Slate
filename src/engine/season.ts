import { PRODUCTION_EVENTS } from "../data/events";
import { scenarioById } from "../data/scenarios";
import { runAwards } from "./awards";
import { generateActor, generateDirector, generateWriter } from "./generate/people";
import { generateScript } from "./generate/scripts";
import { legacyPointsFor, legacyTierLabel, seedLegacy, tickLegacy } from "./legacy";
import { rollRelease } from "./release";
import { rivalBuysScript, tickRivals } from "./rivals";
import { computeCampaignScore, productionSlots } from "./score";
import { TUNING } from "./tuning";
import type {
  Director,
  Film,
  GameState,
  NewsItem,
  PendingEvent,
  SeasonStamp,
  Writer,
} from "./types";
import { chance, clamp, makeRng, pick, type Rng } from "./rng";

export function sameSeason(a: SeasonStamp, b: SeasonStamp): boolean {
  return a.year === b.year && a.season === b.season;
}

export function seasonIndex(s: SeasonStamp): number {
  return s.year * 4 + s.season;
}

/** A synthetic director stand-in when the real one has left the market pool. */
export function directorOf(state: GameState, film: Film): Director {
  const inMarket = state.market.directors.find((d) => d.id === film.directorId);
  if (inMarket) return inMarket;
  return {
    kind: "director",
    id: film.directorId,
    name: film.directorName,
    archetype: "",
    age: 50,
    fame: 50,
    heat: 0,
    salary: 5,
    traits: [],
    craft: 65,
    vision: 55,
    style: 0,
    volatility: 40,
    genres: { [film.genre]: 70 },
    collaborators: [],
    trackRecord: [],
    minTier: 1,
  };
}

function spawnProductionEvent(
  rng: Rng,
  state: GameState,
  film: Film,
): PendingEvent | null {
  const director = directorOf(state, film);
  const lead = film.cast.find((c) => c.role === "lead");
  const leadTemperament = lead ? 50 : 20; // snapshot doesn't carry temperament; use market copy if present
  const marketLead = lead ? state.market.actors.find((a) => a.id === lead.actorId) : undefined;
  const temperament = marketLead?.temperament ?? leadTemperament;
  const feudy = marketLead?.traits.includes("feuds") ?? false;

  const eligible = PRODUCTION_EVENTS.filter((e) => {
    if (e.needsTemperament && temperament < e.needsTemperament && !feudy) return false;
    if (e.needsVolatility && director.volatility < e.needsVolatility) return false;
    if (e.bigBudgetOnly && film.budget < 60) return false;
    return !film.eventHistory.some((h) => h.eventId === e.id);
  });
  if (eligible.length === 0) return null;

  let p = 0.55 + director.volatility / 300 + temperament / 400;
  if (director.traits.includes("over-budget")) p += 0.15;
  if (!chance(rng, Math.min(0.9, p))) return null;

  const def = pick(rng, eligible);
  return {
    filmId: film.id,
    eventId: def.id,
    title: def.title,
    body: def.body,
    trustLabel: def.trust.label,
    trustEffect: def.trust.effect,
    protectLabel: def.protect.label,
    protectEffect: def.protect.effect,
  };
}

function refreshMarketSeason(rng: Rng, state: GameState): GameState {
  const ids = { counter: state.idCounter };
  let scripts = state.market.scripts.slice();
  const news: NewsItem[] = [];

  // rivals hoover up hot scripts
  const maxAggression = Math.max(...state.rivals.map((r) => r.aggression));
  scripts = scripts.filter((s) => {
    if (rivalBuysScript(rng, s.buzz, maxAggression)) {
      const rival = pick(rng, state.rivals);
      news.push({
        stamp: state.clock,
        kind: "market",
        text: `${rival.name.toUpperCase()} SNAPS UP HOT SPEC “${s.title.toUpperCase()}”`,
      });
      return false;
    }
    return true;
  });

  // fresh specs arrive
  const arriving = 2 + (chance(rng, 0.5) ? 1 : 0);
  for (let i = 0; i < arriving && scripts.length < 14; i++) {
    const writer: Writer = pick(rng, state.market.writers);
    scripts.push(generateScript(rng, ids, writer));
  }

  return {
    ...state,
    idCounter: ids.counter,
    market: { ...state.market, scripts },
    newsLog: [...state.newsLog, ...news],
  };
}

function yearEndPeople(rng: Rng, state: GameState): GameState {
  const ids = { counter: state.idCounter };
  const used = new Set<string>([
    ...state.market.directors.map((d) => d.name),
    ...state.market.writers.map((w) => w.name),
    ...state.market.actors.map((a) => a.name),
  ]);

  const age = <P extends { age: number; heat: number }>(p: P): P => ({
    ...p,
    age: p.age + 1,
    heat: Math.round(p.heat * TUNING.heatDecay),
  });

  let directors = state.market.directors.map(age).filter((d) => d.age < 75 || chance(rng, 0.7));
  let writers = state.market.writers.map(age).filter((w) => w.age < 78 || chance(rng, 0.7));
  let actors = state.market.actors.map(age).filter((a) => a.age < 70 || chance(rng, 0.6));

  for (let i = 0; i < TUNING.newPerYear.directors; i++) directors.push(generateDirector(rng, ids, used));
  for (let i = 0; i < TUNING.newPerYear.writers; i++) writers.push(generateWriter(rng, ids, used));
  for (let i = 0; i < TUNING.newPerYear.actors; i++) actors.push(generateActor(rng, ids, used));

  return {
    ...state,
    idCounter: ids.counter,
    market: { ...state.market, directors, writers, actors },
  };
}

function updateReputation(state: GameState): GameState {
  const released = state.studio.filmIds
    .map((id) => state.films[id])
    .filter((f): f is Film => !!f && !!f.result)
    .slice(-TUNING.repRollingWindow);
  if (released.length === 0) return state;
  const crowd = released.reduce((s, f) => s + f.result!.crowdScore, 0) / released.length;
  const prestige = released.reduce((s, f) => s + f.result!.criticScore, 0) / released.length;
  return {
    ...state,
    studio: {
      ...state.studio,
      reputation: { crowd: Math.round(crowd), prestige: Math.round(prestige) },
    },
  };
}

/**
 * The master tick. Refuses to run while production events await a decision.
 * Order: productions advance → releases roll → rivals act → market refresh →
 * overhead → (Fall only) year-end → bankruptcy check.
 */
export function advanceSeason(state: GameState): GameState {
  if (state.pendingEvents.length > 0 || state.gameOver) return state;
  const rng = makeRng(state.rngState);
  let s: GameState = { ...state, films: { ...state.films }, newsLog: [...state.newsLog] };
  const endingSeason = s.clock;

  // ── 1. films advance a stage-season; production events spawn
  const pendingEvents: PendingEvent[] = [];
  for (const id of s.studio.filmIds) {
    const film = s.films[id];
    if (!film) continue;
    if (film.stage === "production") {
      const left = film.stageSeasonsLeft - 1;
      if (left <= 0) {
        s.films[id] = { ...film, stage: "post", stageSeasonsLeft: 0 };
      } else {
        s.films[id] = { ...film, stageSeasonsLeft: left };
        }
      const ev = spawnProductionEvent(rng, s, s.films[id]);
      if (ev && s.films[id].stage === "production") pendingEvents.push(ev);
    }
  }

  // ── 2. releases scheduled for the season we're finishing
  const releaseQueue: string[] = [];
  for (const id of s.studio.filmIds) {
    const film = s.films[id];
    if (!film || film.stage !== "scheduled" || !film.release) continue;
    if (!sameSeason(film.release.season, endingSeason)) continue;
    const director = directorOf(s, film);
    const result = rollRelease(rng, film, director, s.rivals);
    const legacy = seedLegacy(
      rng,
      { ...film, result },
      director,
      endingSeason.year,
    );
    // costs were sunk at greenlight/scheduling; what arrives now is gross-after-
    // backend = profit + costs. The library-sale lifeline shaves streaming income.
    const streamingHaircut = result.streaming * (1 - s.studio.streamingCut);
    const sunk = film.budget + film.marketing + film.overruns + film.talentCost;
    const received = result.profit + sunk - streamingHaircut;
    const adjusted =
      streamingHaircut > 0
        ? { ...result, profit: Math.round((result.profit - streamingHaircut) * 10) / 10 }
        : result;
    s.films[id] = { ...film, stage: "released", result: adjusted, legacy };
    s.studio = {
      ...s.studio,
      cash: Math.round((s.studio.cash + received) * 10) / 10,
    };
    releaseQueue.push(id);

    // fame is a market: results move the people who made them
    const hit = adjusted.profit > 0;
    const lauded = adjusted.criticScore >= 75;
    s.market = {
      ...s.market,
      directors: s.market.directors.map((d) =>
        d.id === film.directorId
          ? {
              ...d,
              heat: Math.round(clamp(d.heat + (hit ? 10 : -8) + (lauded ? 8 : 0), -50, 50)),
              trackRecord: [
                ...d.trackRecord.slice(-4),
                {
                  title: film.title,
                  year: endingSeason.year,
                  money: (hit ? 1 : adjusted.profit < -film.budget * 0.3 ? -1 : 0) as -1 | 0 | 1,
                  critic: adjusted.criticScore,
                  crowd: adjusted.crowdScore,
                  legacy: 0,
                },
              ],
            }
          : d,
      ),
      actors: s.market.actors.map((a) =>
        film.cast.some((c) => c.actorId === a.id && c.role !== "support")
          ? {
              ...a,
              heat: Math.round(clamp(a.heat + (hit ? 8 : -6) + (lauded ? 5 : 0), -50, 50)),
            }
          : a,
      ),
    };
  }
  s = updateReputation(s);

  // ── 3. rivals act
  const rivalTick = tickRivals(rng, s.rivals, endingSeason);
  s = { ...s, rivals: rivalTick.rivals, newsLog: [...s.newsLog, ...rivalTick.news] };

  // ── 4. market refresh
  s = refreshMarketSeason(rng, s);

  // ── 5. overhead
  const slots = productionSlots(s.studio.legacyPoints);
  const overhead = TUNING.overheadPerSeason + (slots - 1) * TUNING.overheadPerExtraSlot;
  s = { ...s, studio: { ...s.studio, cash: Math.round((s.studio.cash - overhead) * 10) / 10 } };

  // ── 6. advance the clock; Fall → year-end
  let yearEnd = null;
  if (endingSeason.season === 3) {
    const endedYear = endingSeason.year;
    // legacy ticks for the whole vault
    const legacyNews: NewsItem[] = [];
    let pointsGained = 0;
    let legacyCash = 0;
    for (const id of s.studio.filmIds) {
      const film = s.films[id];
      if (!film?.legacy || film.legacy.locked || !film.result) continue;
      const { legacy, event } = tickLegacy(rng, film.legacy, endedYear);
      s.films[id] = { ...film, legacy };
      if (event) {
        legacyCash += event.cash ?? 0;
        legacyNews.push({
          stamp: endingSeason,
          kind: "legacy",
          text: `${event.delta > 0 ? "▲" : "▼"} “${film.title.toUpperCase()}”: ${event.label.toUpperCase()}`,
        });
      }
      if (legacy.locked && legacy.finalScore !== undefined) {
        const pts = legacyPointsFor(legacy.finalScore);
        pointsGained += pts;
        const tier = legacyTierLabel(legacy.finalScore);
        if (tier) {
          legacyNews.push({
            stamp: endingSeason,
            kind: "legacy",
            text: `THE BOOKS CLOSE ON “${film.title.toUpperCase()}”: ${tier}`,
          });
        }
      }
    }

    const awards = runAwards(rng, s, endedYear, 0);
    if (awards) {
      for (const cat of awards.categories) {
        if (!cat.playerWon) continue;
        pointsGained += TUNING.awardWinLegacyPoints;
        const film = Object.values(s.films).find((f) => f.title === cat.winner.filmTitle);
        if (film) s.films[film.id] = { ...film, awards: [...film.awards, cat.name] };
      }
    }

    const yearFilms = s.studio.filmIds
      .map((id) => s.films[id])
      .filter((f): f is Film => !!f?.result && f.release?.season.year === endedYear);
    const revenue = yearFilms.reduce(
      (sum, f) => sum + f.result!.profit + f.budget + f.marketing + f.overruns + f.talentCost,
      0,
    );
    const costs = yearFilms.reduce(
      (sum, f) => sum + f.budget + f.marketing + f.overruns + f.talentCost,
      0,
    );

    s = {
      ...s,
      studio: {
        ...s.studio,
        legacyPoints: s.studio.legacyPoints + pointsGained,
        cash: Math.round((s.studio.cash + legacyCash) * 10) / 10,
      },
      newsLog: [...s.newsLog, ...legacyNews],
    };

    yearEnd = {
      year: endedYear,
      awards,
      legacyNews,
      revenue: Math.round(revenue),
      costs: Math.round(costs),
      rivalStandings: [
        {
          name: s.studio.name,
          money: Math.round(
            s.studio.filmIds.reduce((sum, id) => sum + (s.films[id]?.result?.profit ?? 0), 0),
          ),
          acclaim: s.studio.reputation.prestige,
          isPlayer: true,
        },
        ...s.rivals.map((r) => ({
          name: r.name,
          money: Math.round(r.score.money),
          acclaim: Math.round(clamp(50 + r.score.acclaim / 10)),
          isPlayer: false,
        })),
      ].sort((a, b) => b.money - a.money),
    };
    s = { ...s, yearEnd, clock: { year: endedYear + 1, season: 0 } };
    s = yearEndPeople(rng, s);

    // campaign end? (scenarios can also complete early by hitting their goal)
    const lengthYears =
      s.mode.kind === "campaign" || s.mode.kind === "scenario" ? s.mode.lengthYears : Infinity;
    const scenarioWon =
      s.mode.kind === "scenario" &&
      (scenarioById(s.mode.scenarioId)?.won(s) ?? false);
    if (endedYear >= lengthYears || scenarioWon) {
      s = {
        ...s,
        gameOver: { reason: "campaign-complete", score: computeCampaignScore(s) },
        screen: "game-over",
      };
    }
  } else {
    s = { ...s, clock: { year: endingSeason.year, season: ((endingSeason.season + 1) as 0 | 1 | 2 | 3) } };
  }

  // ── 7. bankruptcy check + the one lifeline
  // a finished film is collateral: the bank bridges small negative balances
  // (at interest) while something is scheduled, but there is a hard floor
  if (s.studio.cash < 0 && !s.gameOver) {
    const interest = Math.abs(s.studio.cash) * TUNING.debtInterest;
    s = {
      ...s,
      studio: { ...s.studio, cash: Math.round((s.studio.cash - interest) * 10) / 10 },
    };
  }
  const hasScheduled = s.studio.filmIds.some((id) => {
    const f = s.films[id];
    return f && (f.stage === "scheduled" || f.stage === "post" || f.stage === "production");
  });
  const broke =
    s.studio.cash < TUNING.debtFloor || (s.studio.cash < 0 && !hasScheduled);
  if (broke && !s.gameOver) {
    const releasedCount = s.studio.filmIds.filter((id) => s.films[id]?.stage === "released").length;
    if (!s.studio.lifelineUsed && releasedCount >= TUNING.lifelineMinFilms) {
      s = {
        ...s,
        studio: {
          ...s.studio,
          cash: Math.round((s.studio.cash + TUNING.lifelineCash) * 10) / 10,
          lifelineUsed: true,
          streamingCut: TUNING.lifelineStreamingCut,
        },
        newsLog: [
          ...s.newsLog,
          {
            stamp: s.clock,
            kind: "studio",
            text: `${s.studio.name.toUpperCase()} SELLS ITS LIBRARY TO STAY ALIVE — “A NEW CHAPTER,” INSISTS MEMO`,
          },
        ],
      };
    } else {
      s = {
        ...s,
        gameOver: { reason: "bankrupt", score: computeCampaignScore(s) },
        screen: "game-over",
      };
    }
  }

  // ── 8. surface release night / year-end / pending events
  const next: GameState = {
    ...s,
    pendingEvents,
    releaseQueue,
    rngState: rng.state,
  };
  if (!next.gameOver) {
    if (releaseQueue.length > 0) next.screen = "release-night";
    else if (yearEnd) next.screen = "year-end";
    else next.screen = "dashboard";
  }
  return next;
}
