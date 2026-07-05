import { PRODUCTION_EVENTS } from "../data/events";
import { scenarioById } from "../data/scenarios";
import { canAfford } from "../engine/economy";
import { applyRewrite } from "../engine/generate/scripts";
import { newGame } from "../engine/newGame";
import { developPassionScript, developSequelScript } from "../engine/franchise";
import { castChemistry, isPairKnown, pairKey, walkAwayRisk } from "../engine/negotiation";
import { computeLatent } from "../engine/quality";
import { minBudgetFor } from "../engine/schedule";
import { advanceSeason, directorOf } from "../engine/season";
import { computeCampaignScore } from "../engine/score";
import { GENRE_NORMS, TUNING } from "../engine/tuning";
import { computeHype } from "../engine/publicity";
import type {
  CastSlot,
  DemandDecision,
  DeRiskingState,
  Film,
  GameMode,
  GameState,
  Posture,
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
  | { type: "RENAME_FILM"; filmId: string; title: string }
  | { type: "ABANDON_FILM"; filmId: string }
  | { type: "HIRE_DIRECTOR"; filmId: string; directorId: string; decisions: DemandDecision[] }
  | { type: "SET_CAST"; filmId: string; cast: CastSlot[]; contractActorIds?: string[] }
  | { type: "SCREEN_TEST"; actorId: string }
  | { type: "CHEMISTRY_READ"; aId: string; bId: string }
  | { type: "GREENLIGHT"; filmId: string; budget: number; days: number; bond: boolean }
  | { type: "RESOLVE_EVENT"; filmId: string; eventId: string; choice: "trust" | "protect" }
  | {
      type: "SCHEDULE_RELEASE";
      filmId: string;
      deRisking: DeRiskingState;
      marketing: number;
      season: SeasonStamp;
      strategy: ReleaseStrategy;
      posture?: Posture;
    }
  | { type: "SUBMIT_FESTIVAL"; filmId: string }
  | { type: "DEVELOP_SEQUEL"; franchiseId: string }
  | { type: "BUY_IP"; ipId: string }
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
    case "NEW_GAME": {
      const fresh = newGame(action.seed, action.mode, action.studioName);
      if (action.mode.kind === "scenario") {
        return scenarioById(action.mode.scenarioId)?.apply(fresh) ?? fresh;
      }
      return fresh;
    }

    case "LOAD":
      return action.state;

    case "GO_TO":
      return { ...state, screen: action.screen };

    case "MARK_HINT":
      if (state.hintsSeen.includes(action.hint)) return state;
      return { ...state, hintsSeen: [...state.hintsSeen, action.hint] };

    case "BUY_SCRIPT": {
      const script = state.market.scripts.find((sc) => sc.id === action.scriptId);
      if (!script || !canAfford(state, script.askingPrice)) return state;
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
        castChemistry: 0,
        hype: 0,
        crowdPenalty: 0,
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
      if (!canAfford(state, cost)) return state;
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
      return withFilm(spend(state, cost), {
        ...film,
        script,
        // a rewrite renames from the new draft — unless the player chose a title (§11)
        title: film.customTitle ? film.title : script.title,
        visionLedger: ledger,
      });
    }

    case "RENAME_FILM": {
      const film = state.films[action.filmId];
      if (!film || film.stage !== "development") return state;
      const title = action.title.trim().slice(0, 40);
      if (!title) return state;
      return withFilm(state, { ...film, title, customTitle: true });
    }

    case "ABANDON_FILM": {
      const film = state.films[action.filmId];
      // any pre-release stage can be written off — no state may ever hard-lock
      if (!film || film.stage === "scheduled" || film.stage === "released") return state;
      const films = { ...state.films };
      delete films[action.filmId];
      return {
        ...state,
        films,
        studio: {
          ...state.studio,
          filmIds: state.studio.filmIds.filter((id) => id !== action.filmId),
        },
        pendingEvents: state.pendingEvents.filter((e) => e.filmId !== action.filmId),
        newsLog: [
          ...state.newsLog,
          {
            stamp: state.clock,
            kind: "studio",
            text:
              film.stage === "development"
                ? `“${film.title.toUpperCase()}” QUIETLY ENTERS TURNAROUND`
                : `${state.studio.name.toUpperCase()} EATS $${Math.round(film.talentCost + film.budget + film.overruns)}M SHUTTING DOWN “${film.title.toUpperCase()}”`,
          },
        ],
      };
    }

    case "HIRE_DIRECTOR": {
      const film = state.films[action.filmId];
      const director = state.market.directors.find((d) => d.id === action.directorId);
      if (!film || !director || film.stage !== "development") return state;
      if (!canAfford(state, director.salary)) return state;

      const rng = makeRng(state.rngState);
      const denied = action.decisions.filter((d) => !d.granted).map((d) => d.demand);
      // auteurs do instalments only when their weird thing is part of the deal
      const passionGranted = action.decisions.some(
        (d) => d.granted && d.demand.kind === "passion-project",
      );
      const passionRequired =
        !!film.franchiseId && director.style > TUNING.franchise.auteurRefusalStyle;
      const risk =
        passionRequired && !passionGranted ? 1 : walkAwayRisk(director, denied);
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
      // loyalty pays: people cut their rate for studios they trust
      const fam = state.studio.familiarity[director.id] ?? 0;
      const fee =
        fam > TUNING.contracts.troupeFamiliarity
          ? round1(director.salary * 0.95)
          : director.salary;
      s = spend(s, fee);
      s = relationship(s, director.id, grantedHeavy * 4 - denied.length * 4);

      // the promise goes in writing: their passion script lands on your desk
      if (passionGranted) {
        const ids = { counter: s.idCounter };
        const passionScript = developPassionScript(rng, ids, director);
        s = {
          ...s,
          rngState: rng.state,
          idCounter: ids.counter,
          market: { ...s.market, scripts: [...s.market.scripts, passionScript] },
          studio: {
            ...s.studio,
            promises: [
              ...s.studio.promises,
              {
                directorId: director.id,
                directorName: director.name,
                scriptId: passionScript.id,
                scriptTitle: passionScript.title,
                byYear: s.clock.year + TUNING.franchise.passionDeadlineYears,
              },
            ],
          },
          newsLog: [
            ...s.newsLog,
            {
              stamp: s.clock,
              kind: "market",
              text: `${director.name.toUpperCase()} TAKES THE SEQUEL, AND ${s.studio.name.toUpperCase()} OWES THEM ONE WEIRD MOVIE`,
            },
          ],
        };
      }

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
      // contracted players work at their locked rate; new multi-film signings
      // take a discount now in exchange for a locked (exclusive) future
      const contractIds = new Set(action.contractActorIds ?? []);
      const contracts = { ...state.studio.contracts };
      const cast = action.cast.map((c) => {
        const existing = contracts[c.actorId];
        if (existing) {
          if (existing.filmsLeft > 1) {
            contracts[c.actorId] = { ...existing, filmsLeft: existing.filmsLeft - 1 };
          } else {
            delete contracts[c.actorId];
          }
          return { ...c, deal: { salary: existing.salary, backendPoints: 0 } };
        }
        if (contractIds.has(c.actorId)) {
          const locked = round1(c.deal.salary * TUNING.contracts.signingDiscount);
          contracts[c.actorId] = {
            salary: locked,
            filmsLeft: TUNING.contracts.filmCount - 1,
          };
          return { ...c, deal: { ...c.deal, salary: locked } };
        }
        return c;
      });
      const totalSalary = cast.reduce((sum, c) => sum + c.deal.salary, 0);
      if (!canAfford(state, totalSalary)) return state;
      let s = spend(state, totalSalary);
      s = { ...s, studio: { ...s.studio, contracts } };
      for (const c of cast) s = relationship(s, c.actorId, 3);
      return withFilm(s, {
        ...film,
        cast,
        castChemistry: castChemistry(state, cast),
        talentCost: round1(film.talentCost + totalSalary),
      });
    }

    case "SCREEN_TEST": {
      // pay to see an unknown clearly before you bet a film on them (§2b)
      const fam = state.studio.familiarity[action.actorId] ?? 0;
      if (fam >= 0.5 || !canAfford(state, TUNING.screenTestCost)) return state;
      const s = spend(state, TUNING.screenTestCost);
      return {
        ...s,
        studio: {
          ...s.studio,
          familiarity: { ...s.studio.familiarity, [action.actorId]: Math.min(1, fam + 0.5) },
        },
      };
    }

    case "CHEMISTRY_READ": {
      // pay to reveal an untested pairing before committing to it (§7)
      if (isPairKnown(state, action.aId, action.bId) || !canAfford(state, TUNING.chemistryReadCost)) {
        return state;
      }
      const s = spend(state, TUNING.chemistryReadCost);
      return {
        ...s,
        studio: {
          ...s.studio,
          chemistryReads: [...s.studio.chemistryReads, pairKey(action.aId, action.bId)],
        },
      };
    }

    case "GREENLIGHT": {
      const film = state.films[action.filmId];
      if (!film || film.stage !== "development" || !film.directorId || film.cast.length === 0) {
        return state;
      }
      // enforce granted floors
      const floor = film.demands.find((d) => d.granted && d.demand.kind === "budget-floor")?.demand.budgetFloor;
      const minDays = film.demands.find((d) => d.granted && d.demand.kind === "shooting-days")?.demand.days;
      const days = Math.max(action.days, minDays ?? 0);
      // a short shoot lets you make it cheap; the floor scales with the days (§1)
      const budget = Math.max(action.budget, floor ?? 0, minBudgetFor(film.genre, days, film.script.budgetTarget));
      const bondCost = action.bond ? round1(budget * TUNING.completionBondPct) : 0;
      // granted craft demands with price tags land on the production bill here
      const demandCosts = film.demands.reduce(
        (s, d) => s + (d.granted ? d.demand.effects?.cost ?? 0 : 0),
        0,
      );
      const total = budget + bondCost + demandCosts;
      if (!canAfford(state, total)) return state;

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
      let s = spend(state, total);

      // a kept promise: greenlighting an owed passion project settles the debt
      const owed = film.script.passionOf
        ? s.studio.promises.find((p) => p.directorId === film.script.passionOf)
        : undefined;
      if (owed) {
        s = relationship(s, owed.directorId, TUNING.franchise.passionKeepRelationship);
        s = {
          ...s,
          studio: {
            ...s.studio,
            promises: s.studio.promises.filter((p) => p.directorId !== owed.directorId),
          },
          newsLog: [
            ...s.newsLog,
            {
              stamp: s.clock,
              kind: "studio",
              text: `${s.studio.name.toUpperCase()} ACTUALLY GREENLIGHTS “${film.title.toUpperCase()}”: TOWN ASTONISHED A PROMISE GOT KEPT`,
            },
          ],
        };
      }

      // a lavish schedule costs a whole extra quarter in production (§1)
      const norm = GENRE_NORMS[film.genre];
      const extraSeason = days >= norm.days * TUNING.schedule.longScheduleExtraSeasonAt ? 1 : 0;
      return withFilm(s, {
        ...film,
        budget,
        shootingDays: days,
        overruns: round1(film.overruns + demandCosts),
        deRisking: { ...film.deRisking, completionBond: action.bond },
        stage: "production",
        stageSeasonsLeft: norm.prodSeasons + extraSeason,
        greenlitAt: state.clock,
        visionLedger: ledger,
      });
    }

    case "RESOLVE_EVENT": {
      const pending = state.pendingEvents.find(
        (e) => e.filmId === action.filmId && e.eventId === action.eventId,
      );
      const film = state.films[action.filmId];
      if (!pending || !film) return state;

      // a contracted star holds out: pay the new quote, or let them sleepwalk
      if (pending.eventId === "holdout" && pending.scandalActorId) {
        const c = TUNING.contracts;
        const actorId = pending.scandalActorId;
        const contract = state.studio.contracts[actorId];
        const marketRate = state.market.actors.find((a) => a.id === actorId)?.salary ?? 0;
        const clearPending = (st: GameState): GameState => ({
          ...st,
          pendingEvents: st.pendingEvents.filter(
            (e) => !(e.filmId === action.filmId && e.eventId === "holdout"),
          ),
        });
        if (action.choice === "trust") {
          // PAY: the bump lands on the film's bill; the contract resets to market
          const bump = round1(Math.max(0, marketRate - (contract?.salary ?? marketRate)));
          let s = spend(relationship(state, actorId, c.holdoutPayRelationship), bump);
          if (contract) {
            s = {
              ...s,
              studio: {
                ...s.studio,
                contracts: { ...s.studio.contracts, [actorId]: { ...contract, salary: marketRate } },
              },
            };
          }
          return clearPending(
            withFilm(s, {
              ...film,
              overruns: round1(film.overruns + bump),
              eventHistory: [
                ...film.eventHistory,
                { eventId: "holdout", label: pending.title, choice: "trust", effect: "paid the new quote" },
              ],
            }),
          );
        }
        // HOLD: the paper wins, the performance loses
        const s = relationship(state, actorId, c.holdoutHoldRelationship);
        return clearPending(
          withFilm(s, {
            ...film,
            productionPenalty: film.productionPenalty + c.holdoutEPenalty,
            eventHistory: [
              ...film.eventHistory,
              { eventId: "holdout", label: pending.title, choice: "protect", effect: "held them to the contract" },
            ],
          }),
        );
      }

      // scandals are their own species of fork
      if (pending.eventId === "scandal" && pending.scandalActorId) {
        const t = TUNING.scandal;
        const actorId = pending.scandalActorId;
        const clearPending = (st: GameState): GameState => ({
          ...st,
          pendingEvents: st.pendingEvents.filter(
            (e) => !(e.filmId === action.filmId && e.eventId === "scandal"),
          ),
        });
        if (action.choice === "trust") {
          // STAND BY THEM: the film carries the discourse
          let s = relationship(state, actorId, t.standByLoyalty);
          const next: Film = {
            ...film,
            crowdPenalty: film.crowdPenalty + Math.abs(t.standByCrowd),
            hype: Math.max(0, film.hype + t.standByHype),
            eventHistory: [
              ...film.eventHistory,
              { eventId: "scandal", label: pending.title, choice: "trust", effect: "stood by them" },
            ],
          };
          return clearPending(withFilm(s, next));
        }
        // CUT THEM LOOSE: recast at cost, their market value craters
        const cost = round1(film.budget * t.recastBudgetPct);
        let s = spend(relationship(state, actorId, t.recastRelationship), cost);
        const replacement = s.market.actors.find(
          (a) => !film.cast.some((c) => c.actorId === a.id),
        );
        const cast = film.cast.map((c) =>
          c.actorId === actorId && replacement
            ? {
                ...c,
                actorId: replacement.id,
                actorName: replacement.name,
                appeal: replacement.appeal,
                craft: replacement.craft,
                range: replacement.range,
                fanbase: replacement.fanbase,
                deal: { ...c.deal, backendPoints: 0 },
              }
            : c,
        );
        s = {
          ...s,
          market: {
            ...s.market,
            actors: s.market.actors.map((a) =>
              a.id === actorId
                ? { ...a, salary: round1(a.salary * t.marketValueMult), heat: -30 }
                : a,
            ),
          },
        };
        const next: Film = {
          ...film,
          cast,
          castChemistry: castChemistry(s, cast),
          overruns: round1(film.overruns + cost),
          eventHistory: [
            ...film.eventHistory,
            { eventId: "scandal", label: pending.title, choice: "protect", effect: "recast the role" },
          ],
        };
        return clearPending(withFilm(s, next));
      }

      const def = PRODUCTION_EVENTS.find((e) => e.id === action.eventId);
      if (!def) return state;
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
        shootingDays: film.shootingDays + (branch.days ?? 0),
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

    case "SUBMIT_FESTIVAL": {
      const film = state.films[action.filmId];
      const cost = TUNING.festival.entryCost;
      // submissions close before the Spring festival
      if (!film || film.stage !== "post" || film.festival || state.clock.season !== 0) return state;
      if (!canAfford(state, cost)) return state;
      return withFilm(spend(state, cost), { ...film, festival: "submitted" });
    }

    case "SCHEDULE_RELEASE": {
      const film = state.films[action.filmId];
      if (!film || film.stage !== "post") return state;
      const t = TUNING;
      const dr = action.deRisking;
      const posture = action.posture ?? "standard";

      // honour a granted no-test-screenings demand
      const noTests = film.demands.some((d) => d.granted && d.demand.kind === "no-test-screenings");
      const safeDr: DeRiskingState = noTests
        ? { ...dr, testScreeningHeld: false, notesImplemented: "none" }
        : dr;

      let cost = action.marketing * t.hype.postureCost[posture];
      if (safeDr.testScreeningHeld) cost += t.testScreeningCost;
      if (safeDr.notesImplemented === "minor") cost += t.notesCost.minor;
      if (safeDr.notesImplemented === "major") cost += t.notesCost.major;
      if (safeDr.studioReshoots) cost += round1(film.budget * t.reshootsBudgetPct);
      if (safeDr.focusMarketing) cost += round1(action.marketing * t.focusMarketingPct);
      cost = round1(cost);
      if (!canAfford(state, cost)) return state;

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

      const franchise = film.franchiseId
        ? state.studio.franchises.find((f) => f.id === film.franchiseId)
        : undefined;
      const withDr: Film = {
        ...film,
        deRisking: safeDr,
        marketing: action.marketing,
        release: { season: action.season, strategy: action.strategy, posture },
        hype: computeHype(film, posture, action.marketing, franchise),
        visionLedger: ledger,
        stage: "scheduled",
      };
      // freeze the latent quality vector now that every creative decision is in
      const latent = computeLatent(withDr, directorOf(state, withDr));
      return withFilm(spend(state, cost), { ...withDr, latent });
    }

    case "BUY_IP": {
      const listing = state.market.ips.find((l) => l.ip.id === action.ipId);
      if (!listing || !canAfford(state, listing.price)) return state;
      const s = spend(state, listing.price);
      return {
        ...s,
        studio: { ...s.studio, franchises: [...s.studio.franchises, listing.ip] },
        market: { ...s.market, ips: s.market.ips.filter((l) => l.ip.id !== action.ipId) },
        newsLog: [
          ...s.newsLog,
          {
            stamp: s.clock,
            kind: "market",
            text: `${s.studio.name.toUpperCase()} ACQUIRES “${listing.ip.name.toUpperCase()}” RIGHTS, FANS IMMEDIATELY SUSPICIOUS`,
          },
        ],
      };
    }

    case "DEVELOP_SEQUEL": {
      const ip = state.studio.franchises.find((f) => f.id === action.franchiseId);
      const cost = TUNING.franchise.sequelScriptCost;
      if (!ip || !canAfford(state, cost)) return state;
      const rng = makeRng(state.rngState);
      const ids = { counter: state.idCounter };
      // the instalment script gets whichever pro will take the call
      const writer = state.market.writers.reduce((a, b) => (a.craft > b.craft ? a : b));
      const script = developSequelScript(rng, ids, ip, writer);
      const filmId = makeId(rng, ids.counter++, "film");
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
        talentCost: cost,
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
        castChemistry: 0,
        hype: 0,
        crowdPenalty: 0,
        franchiseId: ip.id,
        eventHistory: [],
        overruns: 0,
        greenlitAt: state.clock,
        awards: [],
      };
      const s = spend({ ...state, rngState: rng.state, idCounter: ids.counter }, cost);
      return withFilm(
        { ...s, studio: { ...s.studio, filmIds: [...s.studio.filmIds, filmId] } },
        film,
      );
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
