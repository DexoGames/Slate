import {
  ACTION_NOUNS,
  HORROR_NOUNS,
  LOGLINE_GOALS,
  LOGLINE_PROTAGONISTS,
  PRESTIGE_WORDS,
  TITLE_ADJS,
  TITLE_NOUNS,
  TITLE_PLACES,
} from "../../data/names";
import { GENRE_NORMS, TUNING } from "../tuning";
import type { Genre, RewritePass, Script, Writer } from "../types";
import { chance, clamp, correlatedPair, makeId, pick, range, type Rng } from "../rng";

interface IdBox {
  counter: number;
}

export function generateTitle(rng: Rng, genre: Genre): string {
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

export function generateLogline(rng: Rng): string {
  const p = pick(rng, LOGLINE_PROTAGONISTS);
  const g = pick(rng, LOGLINE_GOALS);
  return `${p.charAt(0).toUpperCase()}${p.slice(1)} ${g}.`;
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
  const [zH, zA] = correlatedPair(rng, -0.35);
  const genreSkill = writer.genres[g] ?? 40;
  const hook = clamp(Math.round(50 + zH * 16 + (genreSkill - 50) * 0.2));
  const ambitionRaw = 30 + zA * 16 + writer.ambitionStat * 0.4;
  const ambition = clamp(Math.round(Math.min(ambitionRaw, norm.ambitionCap)));
  const coherence = clamp(Math.round(40 + writer.craft * 0.5 + range(rng, -8, 8)));
  const buzz = clamp(
    Math.round(hook * 0.5 + writer.fame * 0.3 + writer.heat + range(rng, -10, 10)),
  );
  const askingPrice =
    Math.round((0.5 + (buzz / 100) * 2.5 + (writer.fame / 100) * 1.5) * 10) / 10;
  return {
    id: makeId(rng, ids.counter++, "scr"),
    title: generateTitle(rng, g),
    logline: generateLogline(rng),
    genre: g,
    hook,
    ambition,
    coherence,
    buzz,
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
  let coherenceDelta = TUNING.rewriteCoherence[idx];
  let hookDelta = TUNING.rewriteHook[idx];
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
