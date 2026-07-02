import { PRODUCTION_EVENTS } from "../data/events";
import { applyRewrite } from "../engine/generate/scripts";
import { newGame } from "../engine/newGame";
import { walkAwayRisk } from "../engine/negotiation";
import { computeLatent } from "../engine/quality";
import { advanceSeason, directorOf } from "../engine/season";
import { computeCampaignScore } from "../engine/score";
import { GENRE_NORMS, TUNING } from "../engine/tuning";
import type {
  CastSlot,
  DemandDecision,
  DeRiskingState,
  Film,
  GameMode,
  GameState,
  ReleaseStrategy,
  ScreenId,
  SeasonStamp,
} from "../engine/types";
import { rewriteVisionDelta } from "../engine/vision";
import { chance, makeId, makeRng } from "../engine/rng";

export type Action =
  | { type: "NEW_GAME"; seed: number; mode: GameMode; studioName?: string }
  | { type: "LOAD"; state: GameState }
  | { type: "GO_TO"; screen: ScreenId }
  | { type: "BUY_SCRIPT"; scriptId: string }
  | { type: "REWRITE"; filmId: string; byFixer: boolean }
  | { type: "ABANDON_FILM"; filmId: string }
  | { type: "HIRE_DIRECTOR"; filmId: string; directorId: string; decisions: DemandDecision[] }
  | { type: "SET_CAST"; filmId: string; cast: CastSlot[] }
  | { type: "GREENLIGHT"; filmId: string; budget: number; days: number; bond: boolean }
  | { type: "RESOLVE_EVENT"; filmId: string; eventId: string; choice: "trust" | "protect" }
  | {
      type: "SCHEDULE_RELEASE";
      filmId: string;
      deRisking: DeRiskingState;
      marketing: number;
      season: SeasonStamp;
      strategy: ReleaseStrategy;
    }
  | { type: "ADVANCE_SEASON" }
  | { type: "DISMISS_RELEASE" }
  | { type: "DISMISS_YEAR_END" }
  | { type: "CONTINUE_ENDLESS" }
  | { type: "MARK_HINT"; hint: string };

const round1 = (n: number) => Math.round(n * 10) / 10;

function withFilm(state: GameState, film: Film): GameState {
  return { ...state, films: { ...state.films, [film.id]: film } };
}

function spend(state: GameState, amount: number): GameState {
  return { ...state, studio: { ...state.studio, cash: round1(state.studio.cash - amount) } };
}

function relationship(state: GameState, personId: string, delta: number): GameState {
  const current = state.studio.relationships[personId] ?? 0;
  return {
    ...state,
    studio: {
      ...state.studio,
      relationships: {
        ...state.studio.relationships,
        [personId]: Math.max(-100, Math.min(100, current + delta)),
      },
    },
  };
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "NEW_GAME":
      return newGame(action.seed, action.mode, action.studioName);

    case "LOAD":
      return action.state;

    case "GO_TO":
      return { ...state, screen: action.screen };

    case "MARK_HINT":
      if (state.hintsSeen.includes(action.hint)) return state;
      return { ...state, hintsSeen: [...state.hintsSeen, action.hint] };

    case "BUY_SCRIPT": {
      const script = state.market.scripts.find((sc) => sc.id === action.scriptId);
      if (!script || state.studio.cash < script.askingPrice) return state;
      const rng = makeRng(state.rngState);
      const filmId = makeId(rng, state.idCounter, "film");
      const film: Film = {
        id: filmId,
        title: script.title,
        genre: script.genre,
        script,
        directorId: "",
        directorName: "",
        cast: [],
        budget: GENRE_NORMS[script.genre].budget,
        marketing: 0,
        shootingDays: GENRE_NORMS[script.genre].days,
        demands: [],
        talentCost: script.askingPrice,
        visionLedger: [],
        deRisking: {
          testScreeningHeld: false,
          notesImplemented: "none",
          studioReshoots: false,
          focusMarketing: false,
          completionBond: false,
        },
        release: null,
        stage: "development",
        stageSeasonsLeft: 0,
        productionPenalty: 0,
        productionBonus: 0,
        eventSigma: 0,
        eventHistory: [],
        overruns: 0,
        greenlitAt: state.clock,
        awards: [],
      };
      let s = spend(state, script.askingPrice);
      s = {
        ...s,
        rngState: rng.state,
        idCounter: s.idCounter + 1,
        market: { ...s.market, scripts: s.market.scripts.filter((sc) => sc.id !== script.id) },
        studio: { ...s.studio, cash: s.studio.cash, filmIds: [...s.studio.filmIds, filmId] },
      };
      return withFilm(s, film);
    }

    case "REWRITE": {
      const film = state.films[action.filmId];
      if (!film || film.stage !== "development") return state;
      const cost = action.byFixer ? TUNING.rewriteCostFixer : TUNING.rewriteCostOriginal;
      if (state.studio.cash < cost) return state;
      const writer = state.market.writers.find((w) => w.id === film.script.writerId);
      const script = applyRewrite(film.script, {
        byFixer: action.byFixer,
        originalVoice: writer?.voice ?? 50,
      });
      const passNo = script.rewrites.length;
      const vpDelta = rewriteVisionDelta(passNo, action.byFixer);
      const ledger =
        vpDelta !== 0
          ? [...film.visionLedger, { label: `Rewrite pass ${passNo}${action.byFixer ? " (fixer)" : ""}`, delta: vpDelta }]
          : film.visionLedger;
      return withFilm(spend(state, cost), { ...film, script, title: script.title, visionLedger: ledger });
    }

    case "ABANDON_FILM": {
      const film = state.films[action.filmId];
      if (!film || film.stage !== "development") return state;
      const films = { ...state.films };
      delete films[action.filmId];
      return {
        ...state,
        films,
        studio: {
          ...state.studio,
          filmIds: state.studio.filmIds.filter((id) => id !== action.filmId),
        },
        newsLog: [
          ...state.newsLog,
          {
            stamp: state.clock,
            kind: "studio",
            text: `“${film.title.toUpperCase()}” QUIETLY ENTERS TURNAROUND`,
          },
        ],
      };
    }

    case "HIRE_DIRECTOR": {
      const film = state.films[action.filmId];
      const director = state.market.directors.find((d) => d.id === action.directorId);
      if (!film || !director || film.stage !== "development") return state;
      if (state.studio.cash < director.salary) return state;

      const rng = makeRng(state.rngState);
      const denied = action.decisions.filter((d) => !d.granted).map((d) => d.demand);
      const risk = walkAwayRisk(director, denied);
      if (chance(rng, risk)) {
        // they walk — publicly
        let s = relationship({ ...state, rngState: rng.state }, director.id, -25);
        return {
          ...s,
          newsLog: [
            ...s.newsLog,
            {
              stamp: s.clock,
              kind: "market",
              text: `${director.name.toUpperCase()} EXITS “${film.title.toUpperCase()}” OVER “CREATIVE DIFFERENCES”`,
            },
          ],
        };
      }

      let ledger = film.visionLedger;
      for (const dec of action.decisions) {
        if (!dec.granted) {
          ledger = [
            ...ledger,
            {
              label: `Denied: ${dec.demand.label}`,
              delta: -TUNING.vpDenyPerWeight * dec.demand.weight,
            },
          ];
        }
      }
      const grantedHeavy = action.decisions.filter((d) => d.granted && d.demand.weight >= 2).length;
      let s: GameState = { ...state, rngState: rng.state };
      s = spend(s, director.salary);
      s = relationship(s, director.id, grantedHeavy * 4 - denied.length * 4);
      const next: Film = {
        ...film,
        directorId: director.id,
        directorName: director.name,
        demands: action.decisions,
        talentCost: round1(film.talentCost + director.salary),
        visionLedger: ledger,
      };
      return withFilm(s, next);
    }

    case "SET_CAST": {
      const film = state.films[action.filmId];
      if (!film || film.stage !== "development" || film.cast.length > 0) return state;
      const totalSalary = action.cast.reduce((sum, c) => sum + c.deal.salary, 0);
      if (state.studio.cash < totalSalary) return state;
      let s = spend(state, totalSalary);
      for (const c of action.cast) s = relationship(s, c.actorId, 3);
      return withFilm(s, {
        ...film,
        cast: action.cast,
        talentCost: round1(film.talentCost + totalSalary),
      });
    }

    case "GREENLIGHT": {
      const film = state.films[action.filmId];
      if (!film || film.stage !== "development" || !film.directorId || film.cast.length === 0) {
        return state;
      }
      // enforce granted floors
      const floor = film.demands.find((d) => d.granted && d.demand.kind === "budget-floor")?.demand.budgetFloor;
      const minDays = film.demands.find((d) => d.granted && d.demand.kind === "shooting-days")?.demand.days;
      const budget = Math.max(action.budget, floor ?? 0);
      const days = Math.max(action.days, minDays ?? 0);
      const bondCost = action.bond ? round1(budget * TUNING.completionBondPct) : 0;
      const total = budget + bondCost;
      if (state.studio.cash < total) return state;

      // in-flight limit by prestige tier
      const inFlight = state.studio.filmIds.filter((id) => {
        const f = state.films[id];
        return f && (f.stage === "production" || f.stage === "post" || f.stage === "scheduled");
      }).length;
      const slots = TUNING.slotsByTier[
        Math.min(TUNING.slotsByTier.length - 1, tierIndex(state.studio.legacyPoints))
      ];
      if (inFlight >= slots) return state;

      let ledger = film.visionLedger;
      if (floor === undefined) {
        const askedFloor = film.demands.find((d) => d.demand.kind === "budget-floor");
        if (askedFloor && !askedFloor.granted && budget < (askedFloor.demand.budgetFloor ?? 0)) {
          // the deny hit was already taken at negotiation; going under just makes it real
        }
      }
      const s = spend(state, total);
      return withFilm(s, {
        ...film,
        budget,
        shootingDays: days,
        deRisking: { ...film.deRisking, completionBond: action.bond },
        stage: "production",
        stageSeasonsLeft: GENRE_NORMS[film.genre].prodSeasons,
        greenlitAt: state.clock,
        visionLedger: ledger,
      });
    }

    case "RESOLVE_EVENT": {
      const pending = state.pendingEvents.find(
        (e) => e.filmId === action.filmId && e.eventId === action.eventId,
      );
      const film = state.films[action.filmId];
      const def = PRODUCTION_EVENTS.find((e) => e.id === action.eventId);
      if (!pending || !film || !def) return state;
      const branch = action.choice === "trust" ? def.trust : def.protect;
      const bondCovers = def.bondable && film.deRisking.completionBond;
      const cash = bondCovers ? 0 : Math.abs(branch.cash ?? 0);

      let s = spend(state, cash);
      if ("relationship" in branch && branch.relationship) {
        s = relationship(s, film.directorId, branch.relationship);
      }
      const sigma = action.choice === "trust" && "sigma" in def.trust ? def.trust.sigma ?? 0 : 0;
      const next: Film = {
        ...film,
        productionBonus: film.productionBonus + (branch.eBonus ?? 0),
        productionPenalty: film.productionPenalty + (branch.ePenalty ?? 0),
        eventSigma: film.eventSigma + sigma,
        overruns: round1(film.overruns + cash),
        visionLedger: branch.vp
          ? [...film.visionLedger, { label: pending.title, delta: branch.vp }]
          : film.visionLedger,
        eventHistory: [
          ...film.eventHistory,
          { eventId: def.id, label: pending.title, choice: action.choice, effect: branch.effect },
        ],
      };
      return {
        ...withFilm(s, next),
        pendingEvents: s.pendingEvents.filter(
          (e) => !(e.filmId === action.filmId && e.eventId === action.eventId),
        ),
      };
    }

    case "SCHEDULE_RELEASE": {
      const film = state.films[action.filmId];
      if (!film || film.stage !== "post") return state;
      const t = TUNING;
      const dr = action.deRisking;

      // honour a granted no-test-screenings demand
      const noTests = film.demands.some((d) => d.granted && d.demand.kind === "no-test-screenings");
      const safeDr: DeRiskingState = noTests
        ? { ...dr, testScreeningHeld: false, notesImplemented: "none" }
        : dr;

      let cost = action.marketing;
      if (safeDr.testScreeningHeld) cost += t.testScreeningCost;
      if (safeDr.notesImplemented === "minor") cost += t.notesCost.minor;
      if (safeDr.notesImplemented === "major") cost += t.notesCost.major;
      if (safeDr.studioReshoots) cost += round1(film.budget * t.reshootsBudgetPct);
      if (safeDr.focusMarketing) cost += round1(action.marketing * t.focusMarketingPct);
      cost = round1(cost);
      if (state.studio.cash < cost) return state;

      let ledger = film.visionLedger.slice();
      if (safeDr.notesImplemented === "minor") ledger.push({ label: "Test-screening notes (minor)", delta: t.vpNotesMinor });
      if (safeDr.notesImplemented === "major") ledger.push({ label: "Test-screening recut (major)", delta: t.vpNotesMajor });
      if (safeDr.studioReshoots) ledger.push({ label: "Studio reshoots", delta: t.vpStudioReshoots });
      if (safeDr.focusMarketing) ledger.push({ label: "Focus-grouped marketing", delta: t.vpFocusMarketing });
      if (action.strategy === "streaming") ledger.push({ label: "Sold to streaming", delta: t.vpStreamingDump });

      // final cut honoured: granted, and the cut was never touched
      const finalCut = film.demands.some((d) => d.granted && d.demand.kind === "final-cut");
      if (finalCut && safeDr.notesImplemented === "none" && !safeDr.studioReshoots) {
        ledger.push({ label: "Final cut honoured", delta: t.vpFinalCutHonoured });
      }

      const withDr: Film = {
        ...film,
        deRisking: safeDr,
        marketing: action.marketing,
        release: { season: action.season, strategy: action.strategy },
        visionLedger: ledger,
        stage: "scheduled",
      };
      // freeze the latent quality vector now that every creative decision is in
      const latent = computeLatent(withDr, directorOf(state, withDr));
      return withFilm(spend(state, cost), { ...withDr, latent });
    }

    case "ADVANCE_SEASON":
      return advanceSeason(state);

    case "DISMISS_RELEASE": {
      const [, ...rest] = state.releaseQueue;
      if (rest.length > 0) return { ...state, releaseQueue: rest };
      const screen: ScreenId = state.yearEnd && state.clock.season === 0 ? "year-end" : "dashboard";
      return { ...state, releaseQueue: [], screen };
    }

    case "DISMISS_YEAR_END":
      return { ...state, yearEnd: null, screen: "dashboard" };

    case "CONTINUE_ENDLESS":
      if (state.gameOver?.reason !== "campaign-complete") return state;
      return { ...state, mode: { kind: "endless" }, gameOver: null, screen: "dashboard" };

    default:
      return state;
  }
}

function tierIndex(legacyPoints: number): number {
  let idx = 0;
  TUNING.tierThresholds.forEach((th, i) => {
    if (legacyPoints >= th) idx = i;
  });
  return idx;
}

export function finalScorePreview(state: GameState) {
  return computeCampaignScore(state);
}
