import type { Genre } from "../engine/types";

/** the CSS variable carrying this genre's accent colour */
export function genreColor(genre: Genre): string {
  return `var(--g-${genre})`;
}
