import { RIVAL_STUDIOS } from "../data/names";
import { generateTitle } from "./generate/scripts";
import { GENRE_NORMS } from "./tuning";
import type { Genre, NewsItem, RivalFilm, RivalStudio, SeasonStamp } from "./types";
import { chance, clamp, int, normal, pick, range, type Rng } from "./rng";

/**
 * Rivals are lightweight pressure, not full sims: they greenlight by
 * personality, contest release windows, post scores, and heat up the talent
 * market. One quality roll per film.
 */

const PERSONALITY_GENRES: Record<RivalStudio["personality"], Genre[]> = {
  blockbuster: ["action", "scifi", "family", "comedy"],
  prestige: ["drama", "war", "crime", "musical", "romance"],
  "genre-factory": ["horror", "thriller", "scifi", "comedy"],
};

export function makeRivals(rng: Rng): RivalStudio[] {
  return RIVAL_STUDIOS.map((r, i) => ({
    id: `rival_${i}`,
    name: r.name,
    personality: r.personality,
    aggression: range(rng, 0.35, 0.75),
    slate: [],
    score: { money: 0, acclaim: 0, legacy: 0 },
  }));
}

function sizeFor(p: RivalStudio["personality"], rng: Rng): RivalFilm["size"] {
  if (p === "blockbuster") return chance(rng, 0.6) ? "tentpole" : "mid";
  if (p === "prestige") return chance(rng, 0.7) ? "small" : "mid";
  return chance(rng, 0.6) ? "small" : "mid";
}

/** each season: maybe greenlight, release due films, post news */
export function tickRivals(
  rng: Rng,
  rivals: RivalStudio[],
  now: SeasonStamp,
): { rivals: RivalStudio[]; news: NewsItem[] } {
  const news: NewsItem[] = [];
  const updated = rivals.map((rival) => {
    let slate = rival.slate.slice();
    // greenlight: keep 1–3 films in the pipeline
    const pending = slate.filter((f) => !f.released).length;
    if (pending < 3 && chance(rng, 0.35 + rival.aggression * 0.3)) {
      const genre = pick(rng, PERSONALITY_GENRES[rival.personality]);
      const size = sizeFor(rival.personality, rng);
      const lead = size === "tentpole" ? 3 : 2; // seasons until release
      const releaseSeason: SeasonStamp = {
        year: now.year + Math.floor((now.season + lead) / 4),
        season: (((now.season + lead) % 4) as 0 | 1 | 2 | 3),
      };
      slate.push({
        title: generateTitle(rng, genre),
        genre,
        size,
        releaseSeason,
        released: false,
      });
    }

    // release due films
    const score = { ...rival.score };
    slate = slate.map((f) => {
      if (f.released || f.releaseSeason.year !== now.year || f.releaseSeason.season !== now.season) {
        return f;
      }
      const base = rival.personality === "prestige" ? 62 : 55;
      const crowdScore = Math.round(clamp(base + normal(rng, 0, 14)));
      const criticScore = Math.round(
        clamp((rival.personality === "prestige" ? 66 : 50) + normal(rng, 0, 15)),
      );
      const budget =
        f.size === "tentpole" ? GENRE_NORMS[f.genre].budget * 1.2 : f.size === "mid" ? GENRE_NORMS[f.genre].budget * 0.8 : GENRE_NORMS[f.genre].budget * 0.45;
      const mult = 0.6 + (crowdScore / 100) * 2.2 * Math.exp(normal(rng, 0, 0.35));
      const profit = Math.round(budget * (mult - 1));
      score.money += profit;
      score.acclaim += Math.max(0, criticScore - 55);
      if (criticScore >= 80 && chance(rng, 0.3)) score.legacy += int(rng, 3, 12);
      if (Math.abs(profit) > 20 || criticScore >= 82) {
        news.push({
          stamp: now,
          kind: "rival",
          text:
            profit > 0
              ? `${rival.name.toUpperCase()} ${profit > 60 ? "PRINTS MONEY" : "SCORES"} WITH “${f.title.toUpperCase()}” ($${Math.round(profit)}M)`
              : criticScore >= 82
                ? `CRITICS SWOON FOR ${rival.name.toUpperCase()}'S “${f.title.toUpperCase()}”`
                : `${rival.name.toUpperCase()} EATS $${Math.abs(Math.round(profit))}M ON “${f.title.toUpperCase()}”`,
        });
      }
      return { ...f, released: true, crowdScore, criticScore, profit };
    });

    // prune old releases so saves stay lean
    slate = slate.filter(
      (f) => !f.released || (now.year - f.releaseSeason.year) < 2,
    );

    return { ...rival, slate, score };
  });
  return { rivals: updated, news };
}

/** rival poaching pressure on a market script each season */
export function rivalBuysScript(rng: Rng, buzz: number, aggressionMax: number): boolean {
  return chance(rng, (buzz / 100) * 0.12 * aggressionMax * 2);
}
