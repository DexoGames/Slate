import { SAVE_VERSION } from "../engine/newGame";
import type { GameState } from "../engine/types";
import { load, remove, save } from "../lib/storage";

const KEY = "save";

interface SaveFile {
  version: number;
  state: GameState;
}

/**
 * Version-gated save migrations. When GameState changes shape, bump
 * SAVE_VERSION and add a step keyed by the OLD version that returns the state
 * upgraded one version.
 */
const migrations: Record<number, (old: unknown) => unknown> = {};

export function loadGame(): GameState | null {
  const file = load<SaveFile | null>(KEY, null);
  if (!file) return null;
  let { version } = file;
  let state: unknown = file.state;
  while (version < SAVE_VERSION) {
    const step = migrations[version];
    if (!step) return null; // unmigratable — treat as no save
    state = step(state);
    version++;
  }
  return state as GameState;
}

export function saveGame(state: GameState): void {
  save<SaveFile>(KEY, { version: SAVE_VERSION, state });
}

export function clearGame(): void {
  remove(KEY);
}
