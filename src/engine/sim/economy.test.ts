import { describe, expect, it } from "vitest";
import { gameReducer } from "../../state/gameReducer";
import { canAfford, creditLimit, estimateCommitments, interestDue } from "../economy";
import { newGame } from "../newGame";
import { advanceSeason } from "../season";
import { TUNING } from "../tuning";
import type { Film, GameState } from "../types";

function withCash(state: GameState, cash: number): GameState {
  return { ...state, studio: { ...state.studio, cash } };
}

describe("credit facility", () => {
  const g = newGame(11, { kind: "campaign", lengthYears: 25 });

  it("allows spending into the overdraft up to the limit", () => {
    const limit = creditLimit(g);
    expect(limit).toBe(TUNING.credit.base); // tier 1, nothing scheduled
    expect(canAfford(withCash(g, 5), 5 + limit)).toBe(true);
    expect(canAfford(withCash(g, 5), 5 + limit + 1)).toBe(false);
  });

  it("charges interest on drawn credit at the season tick", () => {
    const inDebt = withCash(g, -10);
    // rounded to $0.1M: 10 × 2.5% = 0.25 → 0.3
    expect(interestDue(inDebt)).toBe(Math.round(10 * TUNING.credit.interest * 10) / 10);
    const after = advanceSeason(inDebt);
    // overhead + interest both came out
    expect(after.studio.cash).toBeLessThan(-10 - TUNING.overheadPerSeason);
  });

  it("does not bankrupt inside the limit, does past it", () => {
    const nearLimit = withCash(g, -TUNING.credit.base + 5);
    expect(advanceSeason(nearLimit).gameOver).toBeNull();
    const pastLimit = withCash(g, -TUNING.credit.base - 5);
    expect(advanceSeason(pastLimit).gameOver?.reason).toBe("bankrupt");
  });
});

describe("no soft-locks (the owner's trap)", () => {
  it("a studio that overspent on development can still greenlight on credit, or abandon", () => {
    let g = newGame(23, { kind: "campaign", lengthYears: 25 });
    const script = g.market.scripts.reduce((a, b) => (a.askingPrice < b.askingPrice ? a : b));
    g = gameReducer(g, { type: "BUY_SCRIPT", scriptId: script.id });
    const filmId = g.studio.filmIds[0];
    // simulate the trap: nearly no cash left after hiring sprees
    g = withCash(g, 2);
    const film = g.films[filmId] as Film;
    expect(film.stage).toBe("development");
    // credit makes the greenlight path legal…
    expect(canAfford(g, 20)).toBe(true);
    // …and abandonment is always available pre-release
    const abandoned = gameReducer(g, { type: "ABANDON_FILM", filmId });
    expect(abandoned.films[filmId]).toBeUndefined();
  });

  it("abandon works from production and post too", () => {
    let g = newGame(31, { kind: "campaign", lengthYears: 25 });
    const script = g.market.scripts[0];
    g = gameReducer(g, { type: "BUY_SCRIPT", scriptId: script.id });
    const filmId = g.studio.filmIds[0];
    const film = g.films[filmId] as Film;
    // force the film into production without the full hiring dance
    g = {
      ...g,
      films: {
        ...g.films,
        [filmId]: {
          ...film,
          directorId: "dir_x",
          directorName: "X",
          cast: [
            {
              role: "lead" as const,
              actorId: "act_x",
              actorName: "Y",
              deal: { salary: 1, backendPoints: 0 },
              againstType: false,
              appeal: 50,
              craft: 50,
              range: 50,
              experience: 50,
              fanbase: "broad" as const,
              passion: 20,
            },
          ],
          stage: "production",
          stageSeasonsLeft: 1,
        },
      },
    };
    const after = gameReducer(g, { type: "ABANDON_FILM", filmId });
    expect(after.films[filmId]).toBeUndefined();
    expect(after.studio.filmIds).not.toContain(filmId);
  });
});

describe("commitments estimator", () => {
  it("projects budget + marketing for a development film", () => {
    let g = newGame(7, { kind: "campaign", lengthYears: 25 });
    const script = g.market.scripts[0];
    g = gameReducer(g, { type: "BUY_SCRIPT", scriptId: script.id });
    const film = g.films[g.studio.filmIds[0]] as Film;
    const c = estimateCommitments(g, film);
    expect(c.committed).toBeCloseTo(script.askingPrice, 1);
    expect(c.stillToPay).toBeGreaterThan(0);
    expect(c.allIn).toBeCloseTo(c.committed + c.stillToPay, 1);
    expect(c.cashAfter).toBeCloseTo(g.studio.cash - c.stillToPay, 1);
  });
});
