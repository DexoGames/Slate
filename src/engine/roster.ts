import type { GameState } from "./types";

/**
 * "Your people" helpers (§3): the studio's relationship with the talent it has
 * actually worked with, derived by scanning the film library.
 */

/** how many of the studio's films this person has worked on (cast or directed) */
export function filmsTogether(state: GameState, personId: string): number {
  let n = 0;
  for (const id of state.studio.filmIds) {
    const f = state.films[id];
    if (!f) continue;
    if (f.directorId === personId || f.cast.some((c) => c.actorId === personId)) n++;
  }
  return n;
}

/** everyone the studio has a standing connection to: rapport, familiarity, or a deal */
export function yourPeople(state: GameState): string[] {
  const ids = new Set<string>();
  for (const [id, rel] of Object.entries(state.studio.relationships)) if (rel !== 0) ids.add(id);
  for (const [id, fam] of Object.entries(state.studio.familiarity)) if (fam > 0) ids.add(id);
  for (const id of Object.keys(state.studio.contracts)) ids.add(id);
  return [...ids];
}
