import type { Film, GameState } from "../engine/types";

/**
 * Preset short runs. `apply` tweaks a freshly created GameState; `won` is
 * checked at every year-end (early completion ends the run victorious).
 */
export interface Scenario {
  id: string;
  name: string;
  blurb: string;
  years: number;
  /** roughly how long a run takes a human */
  runtime: string;
  apply: (state: GameState) => GameState;
  won: (state: GameState) => boolean;
  winText: string;
  loseText: string;
}

function releasedFilms(state: GameState): Film[] {
  return state.studio.filmIds
    .map((id) => state.films[id])
    .filter((f): f is Film => !!f && f.stage === "released" && !!f.result);
}

export const SCENARIOS: Scenario[] = [
  {
    id: "one-for-them",
    name: "One for Them, One for Me",
    blurb:
      "Five years to prove the oldest theory in the business: make them a hit, make yourself a film. Release one picture that nets $60M+ AND one Legacy-eligible picture critics score 75+.",
    years: 5,
    runtime: "~15 min",
    apply: (s) => s,
    won: (s) => {
      const films = releasedFilms(s);
      const hit = films.some((f) => f.result!.profit >= 60);
      const art = films.some(
        (f) => f.legacy?.eligible && f.result!.criticScore >= 75,
      );
      return hit && art;
    },
    winText: "Both of them. The trades don't know which photo of you to run.",
    loseText: "The theory survives. Your studio didn't prove it.",
  },
  {
    id: "prestige-in-debt",
    name: "The House of Medals",
    blurb:
      "You inherit a beloved, broke prestige house: $28M in the bank, shelves of laurels, creditors circling. Eight years to bank 70 legacy points without going under.",
    years: 8,
    runtime: "~25 min",
    apply: (s) => ({
      ...s,
      studio: {
        ...s.studio,
        cash: 28,
        legacyPoints: 30,
        reputation: { crowd: 35, prestige: 72 },
      },
    }),
    won: (s) => s.studio.legacyPoints >= 70,
    winText: "The medals stay on the wall, and the lights stay on. Rarest double in the business.",
    loseText: "The name outlived the money. It usually does.",
  },
];

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
