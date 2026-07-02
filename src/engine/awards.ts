import type { AwardsCeremony, Film, GameState, RivalStudio } from "./types";
import { chance, pick, range, type Rng } from "./rng";

/**
 * The Auric Awards — annual, at Winter year-end. Player films released in the
 * ceremony year compete against synthetic rival contenders.
 */

interface Contender {
  filmTitle: string;
  studio: string;
  score: number;
  playerFilmId?: string;
}

function rivalContenders(rng: Rng, rivals: RivalStudio[], year: number): Contender[] {
  const out: Contender[] = [];
  for (const r of rivals) {
    for (const f of r.slate) {
      if (f.released && f.releaseSeason.year === year && (f.criticScore ?? 0) >= 60) {
        out.push({ filmTitle: f.title, studio: r.name, score: f.criticScore ?? 60 });
      }
    }
    // prestige houses always field something
    if (r.personality === "prestige" && chance(rng, 0.7)) {
      out.push({
        filmTitle: "an untitled prestige picture",
        studio: r.name,
        score: range(rng, 62, 88),
      });
    }
  }
  return out;
}

export function runAwards(
  rng: Rng,
  state: GameState,
  year: number,
  campaignSpend: number,
): AwardsCeremony | null {
  const playerFilms = state.studio.filmIds
    .map((id) => state.films[id])
    .filter(
      (f): f is Film =>
        !!f && f.stage === "released" && !!f.result && f.release?.season.year === year,
    );

  const rivalsPool = rivalContenders(rng, state.rivals, year);
  if (playerFilms.length === 0 && rivalsPool.length === 0) return null;

  const spendBonus = Math.min(8, campaignSpend * 1.6);

  const mk = (
    name: string,
    playerScoreOf: (f: Film) => number,
  ): AwardsCeremony["categories"][number] => {
    const players: Contender[] = playerFilms
      .map((f) => ({
        filmTitle: f.title,
        studio: state.studio.name,
        score: playerScoreOf(f) + spendBonus + range(rng, -4, 4),
        playerFilmId: f.id,
      }))
      .filter((c) => c.score > 55);
    const field = [...players, ...rivalsPool.map((c) => ({ ...c, score: c.score + range(rng, -4, 4) }))]
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    if (field.length === 0) {
      const filler = { filmTitle: "a film no one saw", studio: pick(rng, state.rivals).name, score: 60 };
      field.push(filler);
    }
    const winner = field[0];
    return {
      name,
      nominees: field.map((c) => ({ filmTitle: c.filmTitle, studio: c.studio })),
      winner: { filmTitle: winner.filmTitle, studio: winner.studio },
      playerWon: winner.studio === state.studio.name,
    };
  };

  return {
    year,
    categories: [
      mk("Best Picture", (f) => (f.result!.criticScore + f.result!.crowdScore * 0.3) / 1.3),
      mk("Best Director", (f) => f.result!.criticScore),
      mk("Best Lead Performance", (f) => {
        const lead = f.cast.find((c) => c.role === "lead");
        return (f.result!.criticScore + (lead?.craft ?? 40)) / 2;
      }),
      mk("Best Screenplay", (f) => (f.result!.criticScore + f.script.ambition) / 2),
      mk("Crowd-Pleaser of the Year", (f) => f.result!.crowdScore),
    ],
  };
}
