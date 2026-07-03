import { PLAYER_STUDIO_NAMES } from "../data/names";
import { generateIPListing } from "./franchise";
import { generateActor, generateDirector, generateWriter } from "./generate/people";
import { generateScript } from "./generate/scripts";
import { makeRivals } from "./rivals";
import { TUNING } from "./tuning";
import type { GameMode, GameState, Market, Writer } from "./types";
import { int, makeRng, pick, type Rng } from "./rng";

export const SAVE_VERSION = 6;

export function createMarket(rng: Rng, ids: { counter: number }): Market {
  const used = new Set<string>();
  const directors = Array.from({ length: TUNING.marketSize.directors }, () =>
    generateDirector(rng, ids, used),
  );
  const writers = Array.from({ length: TUNING.marketSize.writers }, () =>
    generateWriter(rng, ids, used),
  );
  const actors = Array.from({ length: TUNING.marketSize.actors }, () =>
    generateActor(rng, ids, used),
  );
  const scripts = Array.from({ length: TUNING.marketSize.scripts }, () => {
    const writer: Writer = pick(rng, writers);
    return generateScript(rng, ids, writer);
  });
  return { directors, writers, actors, scripts, ips: [generateIPListing(rng, ids)] };
}

export function newGame(seed: number, mode: GameMode, studioName?: string): GameState {
  const rng = makeRng(seed);
  const ids = { counter: 1 };
  const market = createMarket(rng, ids);
  const name = studioName ?? pick(rng, PLAYER_STUDIO_NAMES);

  // the industry half-knows its veterans; newcomers are pure reputation
  const familiarity: Record<string, number> = {};
  for (const d of market.directors) {
    familiarity[d.id] = Math.max(0, Math.min(0.35, (d.age - 32) / 100));
  }

  return {
    version: SAVE_VERSION,
    mode,
    trends: { hot: null, cold: null },
    clock: { year: 1, season: 0 },
    rngState: rng.state,
    seed,
    studio: {
      name,
      cash: TUNING.startingCash,
      reputation: { crowd: 50, prestige: 50 },
      legacyPoints: 0,
      lifelineUsed: false,
      streamingCut: 1,
      filmIds: [],
      relationships: {},
      familiarity,
      franchises: [],
      contracts: {},
      promises: [],
    },
    rivals: makeRivals(rng),
    market,
    films: {},
    newsLog: [
      {
        stamp: { year: 1, season: 0 },
        kind: "studio",
        text: `${name.toUpperCase()} HANGS OUT ITS SHINGLE WITH $${TUNING.startingCash}M AND A DREAM`,
      },
    ],
    screen: "dashboard",
    pendingEvents: [],
    releaseQueue: [],
    yearEnd: null,
    idCounter: ids.counter,
    gameOver: null,
    hintsSeen: [],
  };
}

export function randomSeed(): number {
  return int(makeRng((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0), 1, 0x7fffffff);
}
