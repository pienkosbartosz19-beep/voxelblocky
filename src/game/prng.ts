// prng.ts — Mulberry32 Seeded PRNG (zero Math.random in core path)
// Per PROJECT_CONTEXT: seeded PRNG everywhere for deterministic, reproducible world gen.

export type PRNG = () => number;

/**
 * Mulberry32 PRNG. Returns a function that produces [0,1) floats.
 * Deterministic given seed. Used for all noise, tree placement, etc.
 */
export function mulberry32(seed: number): PRNG {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience: create a PRNG and return both the fn and a helper for int range. */
export function createPRNG(seed: number) {
  const rng = mulberry32(seed);
  return {
    rng,
    int: (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min,
    range: (min: number, max: number) => rng() * (max - min) + min,
  };
}
