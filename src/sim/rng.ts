// Seeded random number generator (mulberry32).
// The simulation must never call Math.random(): the same seed has to give the same
// numbers on every client, otherwise multiplayer players would see different worlds.

export type Rng = () => number;

/** Returns a function that yields floats in [0, 1), the same sequence for the same seed. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
