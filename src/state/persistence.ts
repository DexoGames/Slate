import { SAVE_VERSION } from "../engine/newGame";
import { GENRE_NORMS } from "../engine/tuning";
import type { GameState, Genre } from "../engine/types";
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
  // v6 → v7: chemistry v2, hidden growth, cast passion, windfall-cut fields
  6: (old) => {
    const s = old as {
      studio: { pairChemistry?: Record<string, number>; chemistryReads?: string[] };
      market: {
        actors: { age: number; growth?: number }[];
        directors: { age: number; growth?: number }[];
        writers: { growth?: number }[];
      };
      films: Record<
        string,
        {
          customTitle?: boolean;
          cast: { passion?: number }[];
          result?: { profit: number; grossProfit?: number; windfallCut?: number };
        }
      >;
    };
    s.studio.pairChemistry ??= {};
    s.studio.chemistryReads ??= [];
    for (const a of s.market.actors) a.growth ??= Math.max(10, 70 - Math.max(0, a.age - 30) * 2);
    for (const d of s.market.directors) d.growth ??= Math.max(10, 60 - Math.max(0, d.age - 30) * 2);
    for (const w of s.market.writers) w.growth ??= 30;
    for (const f of Object.values(s.films)) {
      f.customTitle ??= false;
      for (const c of f.cast) c.passion ??= 20;
      if (f.result) {
        f.result.grossProfit ??= f.result.profit;
        f.result.windfallCut ??= 0;
      }
    }
    return s; // mode.lengthYears untouched — in-flight 25y campaigns finish at 25
  },
  // v7 → v8: experience axis, per-script budget targets, principal-photography swing
  7: (old) => {
    const s = old as {
      market: {
        directors: { age: number; experience?: number }[];
        writers: { age: number; experience?: number }[];
        actors: { age: number; experience?: number }[];
        scripts: { genre: string; budgetTarget?: number }[];
      };
      films: Record<
        string,
        {
          script: { genre: string; budgetTarget?: number };
          cast: { experience?: number }[];
        }
      >;
    };
    const expFromAge = (age: number) => Math.max(2, Math.min(100, Math.round((age - 24) * 2.3)));
    const targetFor = (genre: string) => GENRE_NORMS[genre as Genre]?.budget ?? 30;
    for (const d of s.market.directors) d.experience ??= expFromAge(d.age);
    for (const w of s.market.writers) w.experience ??= expFromAge(w.age);
    for (const a of s.market.actors) a.experience ??= expFromAge(a.age);
    for (const sc of s.market.scripts) sc.budgetTarget ??= targetFor(sc.genre);
    for (const f of Object.values(s.films)) {
      f.script.budgetTarget ??= targetFor(f.script.genre);
      for (const c of f.cast) c.experience ??= 50; // a signed actor is a known quantity
    }
    return s; // `shoot` stays undefined — pre-v8 films skip the swing entirely
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
