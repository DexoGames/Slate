/**
 * Deterministic RNG. The mulberry32 state is threaded through explicitly (an
 * `Rng` box the caller owns) so the whole game is replayable from a seed.
 */
export interface Rng {
  state: number;
}

export function makeRng(seed: number): Rng {
  return { state: seed >>> 0 };
}

/** uniform [0, 1) */
export function next(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function range(rng: Rng, min: number, max: number): number {
  return min + next(rng) * (max - min);
}

export function int(rng: Rng, min: number, max: number): number {
  return Math.floor(range(rng, min, max + 1));
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[int(rng, 0, arr.length - 1)];
}

export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = int(rng, 0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function chance(rng: Rng, p: number): boolean {
  return next(rng) < p;
}

/** normal via Box–Muller */
export function normal(rng: Rng, mu = 0, sigma = 1): number {
  let u = 0;
  while (u === 0) u = next(rng); // avoid log(0)
  const v = next(rng);
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** multiplicative lognormal factor with median 1 (mean e^{σ²/2} > 1) */
export function lognormalFactor(rng: Rng, sigma: number): number {
  return Math.exp(normal(rng, 0, sigma));
}

/**
 * Multiplicative lognormal factor with MEAN exactly 1 (median e^{−σ²/2} < 1).
 * The plain lognormal above skews the average upward, so a film's realised
 * money systematically beats its forecast centre — "the average isn't the
 * average." Subtracting σ²/2 pins the mean to 1 so the forecast is honest and
 * the upside is a genuine tail, not a free bias.
 */
export function lognormalMeanOne(rng: Rng, sigma: number): number {
  return Math.exp(normal(rng, 0, sigma) - (sigma * sigma) / 2);
}

/** two normals with correlation rho — for appeal/craft style anti-correlated draws */
export function correlatedPair(
  rng: Rng,
  rho: number,
): [number, number] {
  const z1 = normal(rng);
  const z2 = normal(rng);
  return [z1, rho * z1 + Math.sqrt(1 - rho * rho) * z2];
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

/** short unique id from the rng + a counter kept in GameState */
export function makeId(rng: Rng, counter: number, prefix: string): string {
  const rand = Math.floor(next(rng) * 36 ** 4)
    .toString(36)
    .padStart(4, "0");
  return `${prefix}_${counter.toString(36)}${rand}`;
}
