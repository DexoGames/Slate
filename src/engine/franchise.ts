import { PRESTIGE_WORDS } from "../data/names";
import { generateLogline, generateTitle } from "./generate/scripts";
import { GENRE_NORMS, TUNING } from "./tuning";
import type { Director, Film, FranchiseIP, GameState, Genre, IPListing, Script, Writer } from "./types";
import { chance, clamp, int, makeId, pick, range, type Rng } from "./rng";

/**
 * Franchises: awareness is bankable safety, expectation is the bill for it.
 * Every instalment either feeds the machine or damages it.
 */

export function franchiseOf(state: GameState, film: Film): FranchiseIP | undefined {
  return film.franchiseId
    ? state.studio.franchises.find((f) => f.id === film.franchiseId)
    : undefined;
}

/** a smash mints an IP: profitable AND loved */
export function qualifiesAsFranchise(film: Film): boolean {
  const t = TUNING.franchise;
  const r = film.result;
  if (!r) return false;
  // read the pre-cut gross: a smash is a smash before the town takes its cut (§5)
  return r.grossProfit >= film.budget * t.mintProfitOverBudget && r.crowdScore >= t.mintCrowdMin;
}

export function mintFranchise(rng: Rng, ids: { counter: number }, film: Film): FranchiseIP {
  const r = film.result!;
  return {
    id: makeId(rng, ids.counter++, "ip"),
    name: film.title,
    kind: "original-hit",
    genre: film.genre,
    awareness: Math.round(clamp(r.crowdScore / 2 + Math.min(50, r.profit / 4))),
    expectation: r.crowdScore,
    fatigue: 0,
    instalments: [film.id],
    sourceFilmId: film.id,
  };
}

const NUMERALS = ["II", "III", "IV", "V", "VI"];
const SUBTITLES = [
  "RECKONING", "HOMECOMING", "LEGACY", "REQUIEM", "RESURRECTION",
  "ORIGINS", "AFTERMATH", "ETERNAL", "REDEMPTION",
];

export function sequelTitle(rng: Rng, ip: FranchiseIP): string {
  const n = ip.instalments.length; // 1 = first sequel
  if (n <= NUMERALS.length && chance(rng, 0.55)) return `${ip.name} ${NUMERALS[n - 1]}`;
  return `${ip.name}: ${pick(rng, SUBTITLES)}`;
}

/** develop the next instalment: hook is bought, ambition is capped */
export function developSequelScript(
  rng: Rng,
  ids: { counter: number },
  ip: FranchiseIP,
  writer: Writer,
): Script {
  const t = TUNING.franchise;
  const hook = clamp(Math.round(55 + ip.awareness / 4 + range(rng, -4, 4)));
  const ambition = clamp(
    Math.round(Math.min(20 + writer.ambitionStat * 0.4, t.ambitionCap)),
  );
  return {
    id: makeId(rng, ids.counter++, "scr"),
    title: sequelTitle(rng, ip),
    logline: generateLogline(rng, ip.genre),
    genre: ip.genre,
    hook,
    ambition,
    coherence: clamp(Math.round(40 + writer.craft * 0.5 + range(rng, -8, 8))),
    buzz: clamp(Math.round(ip.awareness * 0.8)),
    // a franchise instalment wants a full canvas — awareness is spectacle money
    budgetTarget: Math.round(GENRE_NORMS[ip.genre].budget * (0.85 + ip.awareness / 400) * 10) / 10,
    writerId: writer.id,
    writerName: writer.name,
    rewrites: [],
    askingPrice: t.sequelScriptCost,
  };
}

/**
 * The weird thing an auteur trades a sequel for. They wrote it themselves,
 * they bring it for free — the price is the promise to make it.
 */
export function developPassionScript(rng: Rng, ids: { counter: number }, director: Director): Script {
  const loved = Object.entries(director.genres).sort((a, b) => b[1] - a[1])[0]?.[0] as
    | Genre
    | undefined;
  const genre = loved ?? "drama";
  return {
    id: makeId(rng, ids.counter++, "scr"),
    title: generateTitle(rng, genre),
    logline: generateLogline(rng, genre),
    genre,
    hook: clamp(int(rng, 25, 50)), // nobody else would touch it
    ambition: clamp(Math.round(55 + director.vision * 0.4 + range(rng, -5, 5))),
    coherence: clamp(Math.round(50 + director.craft * 0.3 + range(rng, -6, 6))),
    buzz: clamp(int(rng, 5, 25)),
    // the weird little thing nobody would fund — a small canvas by definition
    budgetTarget: Math.round(GENRE_NORMS[genre].budget * 0.5 * 10) / 10,
    writerId: director.id,
    writerName: director.name,
    rewrites: [],
    passionOf: director.id,
    askingPrice: 0,
  };
}

/** external IP arrives on the market: books, remake rights, comics */
export function generateIPListing(rng: Rng, ids: { counter: number }): IPListing {
  const kinds = ["adaptation", "remake"] as const;
  const kind = pick(rng, kinds);
  const genres = ["scifi", "family", "horror", "thriller", "action", "romance", "drama"] as const;
  const genre = pick(rng, genres);
  const word = pick(rng, PRESTIGE_WORDS);
  const name = kind === "remake" ? `${word} ('${int(rng, 58, 89)})` : `The ${word} ${pick(rng, ["Chronicles", "Cycle", "Papers", "Saga", "Letters"] as const)}`;
  const awareness = int(rng, 45, 85);
  return {
    ip: {
      id: makeId(rng, ids.counter++, "ip"),
      name,
      kind,
      genre,
      awareness,
      // fans hold adaptations to imagined standards
      expectation: int(rng, 62, 80),
      fatigue: kind === "remake" ? int(rng, 10, 30) : 0,
      instalments: [],
    },
    price: Math.round((2 + (awareness / 100) * 10) * 10) / 10,
    blurb:
      kind === "remake"
        ? "“They don't make them like this anymore. You could, though.”"
        : "“The fans have already cast it in their heads. Disappoint them carefully.”",
  };
}

/**
 * Post-release bookkeeping: expectation ratchet, fatigue, awareness. Returns
 * the updated IP and a verdict for the news feed.
 */
export function settleInstalment(
  ip: FranchiseIP,
  film: Film,
): { ip: FranchiseIP; verdict: "met" | "missed" | null } {
  const t = TUNING.franchise;
  const r = film.result;
  if (!r) return { ip, verdict: null };
  const missed = r.crowdScore < ip.expectation - t.expectationMissTol;
  return {
    ip: {
      ...ip,
      instalments: [...ip.instalments, film.id],
      fatigue: clamp(ip.fatigue + t.fatiguePerInstalment + (missed ? t.missFatigue : 0)),
      awareness: clamp(ip.awareness + (missed ? t.missAwareness : t.meetAwareness)),
      expectation: missed
        ? ip.expectation
        : clamp(Math.max(ip.expectation, r.crowdScore) + t.expectationRatchet),
    },
    verdict: missed ? "missed" : "met",
  };
}
