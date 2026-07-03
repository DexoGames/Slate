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
const migrations: Record<number, (old: unknown) => unknown> = {
  // v1 → v2: director familiarity map (perception system)
  1: (old) => {
    const s = old as { studio: { familiarity?: Record<string, number> } };
    s.studio.familiarity = s.studio.familiarity ?? {};
    return s;
  },
  // v2 → v3: genre trends, actors v2 (range/fanbase/scandalRisk), chemistry
  2: (old) => {
    const s = old as {
      trends?: unknown;
      market: { actors: Record<string, unknown>[] };
      films: Record<string, { castChemistry?: number; cast: Record<string, unknown>[] }>;
    };
    s.trends = s.trends ?? { hot: null, cold: null };
    for (const a of s.market.actors) {
      a.range = a.range ?? 50;
      a.fanbase = a.fanbase ?? "broad";
      a.scandalRisk = a.scandalRisk ?? (a.temperament as number | undefined) ?? 30;
    }
    for (const f of Object.values(s.films)) {
      f.castChemistry = f.castChemistry ?? 0;
      for (const c of f.cast) {
        c.range = c.range ?? 50;
        c.fanbase = c.fanbase ?? "broad";
      }
    }
    return s;
  },
  // v3 → v4: franchises + the IP market
  3: (old) => {
    const s = old as {
      studio: { franchises?: unknown[] };
      market: { ips?: unknown[] };
    };
    s.studio.franchises = s.studio.franchises ?? [];
    s.market.ips = s.market.ips ?? [];
    return s;
  },
  // v4 → v5: hype/posture, scandals, contracts
  4: (old) => {
    const s = old as {
      studio: { contracts?: Record<string, unknown> };
      films: Record<
        string,
        { hype?: number; crowdPenalty?: number; release: { posture?: string } | null }
      >;
    };
    s.studio.contracts = s.studio.contracts ?? {};
    for (const f of Object.values(s.films)) {
      f.hype = f.hype ?? 0;
      f.crowdPenalty = f.crowdPenalty ?? 0;
      if (f.release) f.release.posture = f.release.posture ?? "standard";
    }
    return s;
  },
  // v5 → v6: passion-project promises
  5: (old) => {
    const s = old as { studio: { promises?: unknown[] } };
    s.studio.promises = s.studio.promises ?? [];
    return s;
  },
};

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
