import {
  ACTION_NOUNS,
  CHARACTER_NAMES,
  GENRE_LOGLINES,
  HORROR_NOUNS,
  LOGLINE_GOALS,
  LOGLINE_PROTAGONISTS,
  PRESTIGE_WORDS,
  TITLE_ADJS,
  TITLE_NOUNS,
  TITLE_PLACES,
  TITLE_SUFFIXES,
} from "../../data/names";
import { GENRE_NORMS, TUNING } from "../tuning";
import type { Genre, RewritePass, Script, Writer } from "../types";
import { chance, clamp, correlatedPair, makeId, pick, range, type Rng } from "../rng";

interface IdBox {
  counter: number;
}

function baseTitle(rng: Rng, genre: Genre): string {
  switch (genre) {
    case "action":
      return chance(rng, 0.5)
        ? `${pick(rng, ACTION_NOUNS)}`
        : `${pick(rng, TITLE_ADJS)} ${pick(rng, ACTION_NOUNS)}`;
    case "horror":
      return chance(rng, 0.5)
        ? `The ${pick(rng, HORROR_NOUNS)}`
        : `${pick(rng, HORROR_NOUNS)} ${pick(rng, ["House", "Season", "Hollow", "Road"] as const)}`;
    case "drama":
      if (chance(rng, 0.45)) return pick(rng, PRESTIGE_WORDS);
      return `The ${pick(rng, TITLE_NOUNS)} of ${pick(rng, TITLE_PLACES)}`;
    default: {
      const roll = range(rng, 0, 1);
      if (roll < 0.35) return `The ${pick(rng, TITLE_ADJS)} ${pick(rng, TITLE_NOUNS)}`;
      if (roll < 0.6) return `${pick(rng, TITLE_ADJS)} ${pick(rng, TITLE_NOUNS)}s`;
      if (roll < 0.8) return `The ${pick(rng, TITLE_NOUNS)} of ${pick(rng, TITLE_PLACES)}`;
      return pick(rng, PRESTIGE_WORDS);
    }
  }
}

/**
 * Sometimes the title is just the hero's (or villain's) name doing all the
 * marketing, and sometimes whatever title comes out gets a tacked-on suffix
 * — a cheap sequel-bait or genre-mismatch punchline.
 */
export function generateTitle(rng: Rng, genre: Genre): string {
  const title = chance(rng, 0.2) ? pick(rng, CHARACTER_NAMES[genre]) : baseTitle(rng, genre);
  return chance(rng, 0.15) ? `${title} ${pick(rng, TITLE_SUFFIXES)}` : title;
}

/**
 * Every genre gets its own well-worn protagonist and well-worn fate — the
 * market is supposed to read as shamelessly familiar. A blend occasionally
 * borrows a beat from the sub-genre.
 */
export function generateLogline(rng: Rng, genre?: Genre, subGenre?: Genre): string {
  const primary = genre ? GENRE_LOGLINES[genre] : { protagonists: LOGLINE_PROTAGONISTS, goals: LOGLINE_GOALS };
  const secondary = subGenre ? GENRE_LOGLINES[subGenre] : undefined;
  const p = secondary && chance(rng, 0.35) ? pick(rng, secondary.protagonists) : pick(rng, primary.protagonists);
  const g = secondary && chance(rng, 0.35) ? pick(rng, secondary.goals) : pick(rng, primary.goals);
  return `${p.charAt(0).toUpperCase()}${p.slice(1)} ${g}.`;
}

/**
 * Notable genre blends and what they do to a script. Key is "a+b" sorted.
 * Unlisted combos read as shelf-less oddities: a small hook penalty.
 */
const COMBOS: Record<string, { hook?: number; ambition?: number; sigma?: number }> = {
  "comedy+horror": { hook: 8, sigma: 3 },
  "romance+scifi": { ambition: 10, hook: -4, sigma: 2 },
  "action+comedy": { hook: 6 },
  "comedy+crime": { hook: 5, ambition: 4 },
  "horror+scifi": { hook: 4 },
  "drama+musical": { ambition: 6 },
  "romance+war": { ambition: 5 },
  "romance+thriller": { hook: 3, sigma: 2 },
  "crime+thriller": { hook: 4 },
  "drama+scifi": { ambition: 8, sigma: 2 },
  "family+scifi": { hook: 5 },
  "action+horror": { hook: 4, sigma: 3 },
};

export function comboEffects(a: Genre, b: Genre): { hook: number; ambition: number; sigma: number } {
  const key = [a, b].sort().join("+");
  const c = COMBOS[key];
  if (!c) return { hook: -4, ambition: 0, sigma: 1 }; // audiences need a shelf
  return { hook: c.hook ?? 0, ambition: c.ambition ?? 0, sigma: c.sigma ?? 0 };
}

/**
 * hook and ambition are drawn anti-correlated (ρ ≈ −0.35): crowd-pleasing
 * concepts and thematic depth rarely arrive in the same draft.
 */
export function generateScript(
  rng: Rng,
  ids: IdBox,
  writer: Writer,
  genre?: Genre,
): Script {
  const g =
    genre ??
    (Object.keys(writer.genres).length > 0 && chance(rng, 0.75)
      ? (pick(rng, Object.keys(writer.genres) as Genre[]) as Genre)
      : pick(rng, Object.keys(GENRE_NORMS) as Genre[]));
  const norm = GENRE_NORMS[g];
  // ~35% of scripts are blends
  let subGenre: Genre | undefined;
  if (chance(rng, 0.35)) {
    const others = (Object.keys(GENRE_NORMS) as Genre[]).filter((x) => x !== g);
    subGenre = pick(rng, others);
  }
  const combo = subGenre ? comboEffects(g, subGenre) : { hook: 0, ambition: 0, sigma: 0 };
  const [zH, zA] = correlatedPair(rng, -0.35);
  const genreSkill = writer.genres[g] ?? 40;
  const hook = clamp(Math.round(50 + zH * 16 + (genreSkill - 50) * 0.2 + combo.hook));
  const ambitionCap = subGenre
    ? Math.max(norm.ambitionCap, GENRE_NORMS[subGenre].ambitionCap)
    : norm.ambitionCap;
  const ambitionRaw = 30 + zA * 16 + writer.ambitionStat * 0.4 + combo.ambition;
  const ambition = clamp(Math.round(Math.min(ambitionRaw, ambitionCap)));
  const coherence = clamp(Math.round(40 + writer.craft * 0.5 + range(rng, -8, 8)));
  const buzz = clamp(
    Math.round(hook * 0.5 + writer.fame * 0.3 + writer.heat + range(rng, -10, 10)),
  );
  const askingPrice = Math.min(
    3.5,
    // buzz-0 specs from unknowns can go near $0.3M — the micro-budget on-ramp (§2c)
    Math.round((0.3 + (buzz / 100) * 2 + (writer.fame / 100) * 1) * 10) / 10,
  );
  // the concept's natural budget (§4): high-concept, hooky, ambitious scripts
  // want a bigger canvas; small scrappy ones want less and cap lower on appeal
  const bt = TUNING.scriptBudget;
  const scaleFactor =
    bt.floorFactor + (hook / 100) * bt.hookScale + (ambition / 100) * bt.ambitionScale + range(rng, -bt.jitter, bt.jitter);
  const budgetTarget = Math.max(
    TUNING.schedule.absoluteFloor,
    Math.round(norm.budget * clamp(scaleFactor, bt.minFactor, bt.maxFactor) * 10) / 10,
  );
  return {
    id: makeId(rng, ids.counter++, "scr"),
    title: generateTitle(rng, g),
    logline: generateLogline(rng, g, subGenre),
    genre: g,
    subGenre,
    hook,
    ambition,
    coherence,
    buzz,
    budgetTarget,
    writerId: writer.id,
    writerName: writer.name,
    rewrites: [],
    askingPrice,
  };
}

/**
 * Apply one rewrite pass. Mutates nothing — returns the new script.
 * Pass 1 sharpens; the stack is the trap (§5.3 of the design).
 */
export function applyRewrite(
  script: Script,
  opts: { byFixer: boolean; originalVoice: number },
): Script {
  const passNo = script.rewrites.length + 1;
  const idx = Math.min(passNo - 1, TUNING.rewriteCoherence.length - 1);
  let coherenceDelta: number = TUNING.rewriteCoherence[idx];
  let hookDelta: number = TUNING.rewriteHook[idx];
  let ambitionDelta = 0;
  if (opts.byFixer && coherenceDelta < 0) {
    coherenceDelta *= TUNING.fixerCoherenceMult;
    // distinctive scripts fall apart hardest in other hands
    if (opts.originalVoice >= TUNING.highVoiceThreshold) {
      coherenceDelta *= TUNING.highVoiceExtraMult;
    }
    coherenceDelta = Math.round(coherenceDelta);
  }
  if (opts.byFixer) {
    // the fixer trades soul for saleability
    ambitionDelta = -TUNING.fixerAmbitionToHook;
    hookDelta += Math.round(TUNING.fixerAmbitionToHook / 2);
  }
  const pass: RewritePass = { pass: passNo, byFixer: opts.byFixer, coherenceDelta, hookDelta, ambitionDelta };
  return {
    ...script,
    hook: clamp(script.hook + hookDelta),
    ambition: clamp(script.ambition + ambitionDelta),
    coherence: clamp(script.coherence + coherenceDelta),
    rewrites: [...script.rewrites, pass],
  };
}
