import type { Film } from "./types";

/**
 * Does this film need the player right now, and for what? Pure helper shared
 * by the slate board (badges + sort) and film headers.
 */
export function filmNeedsAction(film: Film): string | null {
  switch (film.stage) {
    case "development":
      if (!film.directorId) return "NEEDS DIRECTOR";
      if (film.cast.length === 0) return "NEEDS CAST";
      return "READY TO GREENLIGHT";
    case "post":
      return "NEEDS RELEASE DATE";
    default:
      return null;
  }
}

export const STAGE_ORDER = ["development", "production", "post", "scheduled", "released"] as const;

export function stageIndex(film: Film): number {
  return STAGE_ORDER.indexOf(film.stage);
}
