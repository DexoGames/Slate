import { describe, expect, it } from "vitest";
import { gameReducer } from "../../state/gameReducer";
import { runCampaign } from "./bots";
import { legacyPointsFor, resolveEpilogue } from "../legacy";
import { newGame } from "../newGame";
import { advanceSeason } from "../season";
import { makeRng } from "../rng";
import { TUNING } from "../tuning";
import type { Film, GameState, LegacyState } from "../types";

function withCash(state: GameState, cash: number): GameState {
  return { ...state, studio: { ...state.studio, cash } };
}

const legacyFilm = (over: Partial<LegacyState> = {}): Film => ({
  id: "f1",
  title: "THE LONG GAME",
  genre: "drama",
  script: {
    id: "s1", title: "THE LONG GAME", logline: "", genre: "drama",
    hook: 50, ambition: 70, coherence: 60, buzz: 40, budgetTarget: 20, writerId: "w", writerName: "W",
    rewrites: [], askingPrice: 1,
  },
  directorId: "d1", directorName: "D", cast: [], budget: 20, marketing: 10,
  shootingDays: 45, demands: [], talentCost: 5, visionLedger: [],
  deRisking: { testScreeningHeld: false, notesImplemented: "none", studioReshoots: false, focusMarketing: false, completionBond: false },
  release: { season: { year: 3, season: 3 }, strategy: "wide", posture: "standard" },
  hype: 40, crowdPenalty: 0, stage: "released", stageSeasonsLeft: 0,
  productionPenalty: 0, productionBonus: 0, eventSigma: 0, castChemistry: 0,
  eventHistory: [], overruns: 0, greenlitAt: { year: 3, season: 0 },
  latent: { E: 60, A: 70, X: 55 },
  result: {
    opening: 15, boxOffice: 60, streaming: 15, ancillary: 0, profit: 25,
    grossProfit: 25, windfallCut: 0, crowdScore: 72, criticScore: 80, verdict: "hit", breakdown: [],
  },
  legacy: { eligible: true, seed: 70, signalBand: [55, 85], events: [], locked: false, releasedYear: 3, ...over },
  awards: [],
});

describe("resolveEpilogue — ten years later (§8)", () => {
  const base = () => {
    const g = newGame(9, { kind: "campaign", lengthYears: 10 });
    const film = legacyFilm();
    return {
      ...g,
      clock: { year: 11 as const, season: 0 as const },
      films: { f1: film },
      studio: { ...g.studio, filmIds: ["f1"], legacyPoints: 0 },
    };
  };

  it("fast-forwards every eligible, unlocked film to a final verdict and credits points", () => {
    const { state, entries } = resolveEpilogue(makeRng(5), base());
    const f = state.films.f1;
    expect(f.legacy!.locked).toBe(true);
    expect(f.legacy!.finalScore).toBeGreaterThanOrEqual(0);
    expect(entries).toHaveLength(1);
    expect(entries[0].filmId).toBe("f1");
    expect(state.studio.legacyPoints).toBe(legacyPointsFor(f.legacy!.finalScore!));
    expect(entries[0].pointsGained).toBe(legacyPointsFor(f.legacy!.finalScore!));
  });

  it("leaves compromised (ineligible) films out of the reel", () => {
    const g = base();
    const compromised: Film = { ...legacyFilm(), legacy: { eligible: false, seed: 0, signalBand: [0, 0], events: [], locked: false, releasedYear: 3 } };
    const state = { ...g, films: { f1: compromised } };
    const { entries, state: after } = resolveEpilogue(makeRng(1), state);
    expect(entries).toHaveLength(0);
    expect(after.films.f1.legacy!.locked).toBe(false);
    expect(after.studio.legacyPoints).toBe(0);
  });
});

describe("the ten-year campaign (§8)", () => {
  it("ends after the tenth year with an epilogue, and can continue endless", () => {
    const game = runCampaign(1000, "maxSafety");
    expect(game.gameOver).not.toBeNull();
    expect(game.gameOver!.reason).toBe("campaign-complete");
    expect(game.clock.year).toBe(TUNING.campaignYears + 1);
    expect(game.screen).toBe("epilogue");
    expect(Array.isArray(game.gameOver!.epilogue)).toBe(true);
    // every eligible film that reached the end is locked by the epilogue
    for (const id of game.studio.filmIds) {
      const f = game.films[id];
      if (f?.legacy?.eligible) expect(f.legacy.locked).toBe(true);
    }
    // CONTINUE_ENDLESS still works off a completed campaign
    const endless = gameReducer(game, { type: "CONTINUE_ENDLESS" });
    expect(endless.gameOver).toBeNull();
    expect(endless.mode.kind).toBe("endless");
    expect(endless.screen).toBe("dashboard");
  });

  it("the bankrupt path skips the epilogue entirely", () => {
    const g = newGame(11, { kind: "campaign", lengthYears: 10 });
    const bust = advanceSeason(withCash(g, -TUNING.credit.base - 10));
    expect(bust.gameOver?.reason).toBe("bankrupt");
    expect(bust.gameOver?.epilogue).toBeUndefined();
    expect(bust.screen).toBe("game-over");
  });
});
