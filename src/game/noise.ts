// Simple deterministic noise functions for terrain generation
// Using mulberry32 PRNG (from dedicated prng.ts) + value noise with smooth interpolation

import { mulberry32 } from './prng';
export { mulberry32 } from './prng';

export function hash2(x: number, z: number, seed: number): number {
  let h = seed;
  h = Math.imul(h ^ Math.floor(x), 0x27d4eb2d);
  h = Math.imul(h ^ Math.floor(z), 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// 2D value noise
export function valueNoise2D(x: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;

  const v00 = hash2(xi, zi, seed);
  const v10 = hash2(xi + 1, zi, seed);
  const v01 = hash2(xi, zi + 1, seed);
  const v11 = hash2(xi + 1, zi + 1, seed);

  const u = smoothstep(xf);
  const v = smoothstep(zf);

  return lerp(lerp(v00, v10, u), lerp(v01, v11, u), v);
}

// Fractal Brownian Motion (fBm) - multiple octaves of noise
export function fbm2D(
  x: number,
  z: number,
  seed: number,
  octaves: number = 4,
  lacunarity: number = 2,
  gain: number = 0.5,
): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise2D(x * freq, z * freq, seed + i * 1013) * amp;
    max += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / max;
}

// 3D value noise for caves
export function valueNoise3D(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;

  // hash 8 corners
  const h000 = hash3(xi, yi, zi, seed);
  const h100 = hash3(xi + 1, yi, zi, seed);
  const h010 = hash3(xi, yi + 1, zi, seed);
  const h110 = hash3(xi + 1, yi + 1, zi, seed);
  const h001 = hash3(xi, yi, zi + 1, seed);
  const h101 = hash3(xi + 1, yi, zi + 1, seed);
  const h011 = hash3(xi, yi + 1, zi + 1, seed);
  const h111 = hash3(xi + 1, yi + 1, zi + 1, seed);

  const u = smoothstep(xf);
  const v = smoothstep(yf);
  const w = smoothstep(zf);

  const x00 = lerp(h000, h100, u);
  const x10 = lerp(h010, h110, u);
  const x01 = lerp(h001, h101, u);
  const x11 = lerp(h011, h111, u);

  const y0 = lerp(x00, x10, v);
  const y1 = lerp(x01, x11, v);

  return lerp(y0, y1, w);
}

export function hash3(x: number, y: number, z: number, seed: number): number {
  let h = seed;
  h = Math.imul(h ^ Math.floor(x), 0x27d4eb2d);
  h = Math.imul(h ^ Math.floor(y), 0x85ebca6b);
  h = Math.imul(h ^ Math.floor(z), 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export function fbm3D(
  x: number,
  y: number,
  z: number,
  seed: number,
  octaves: number = 3,
): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise3D(x * freq, y * freq, z * freq, seed + i * 7919) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / max;
}

// Worley/Cellular noise — returns the distance to the nearest feature point.
// Feature points are placed one per integer cell, with hash-based jitter so
// the pattern looks organic. Used to carve natural clearings in forests:
// positions whose F1 distance is below `clearingRadius` get no trees, which
// opens up small meadows the player can walk through.
export function worley2D(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  let minDist = Infinity;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx;
      const cz = iz + dz;
      const fx = cx + hash2(cx, cz, seed);
      const fz = cz + hash2(cx, cz, seed + 1733);
      const ddx = fx - x;
      const ddz = fz - z;
      const d = Math.sqrt(ddx * ddx + ddz * ddz);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

// Multi-layer heightmap field — the new continental/hills/mountain/erosion stack
// used by both World.generateChunk (main thread) and the worker source mirror.
//
// Layers:
//   continental: very low frequency, broad altitude variation (continents vs seas)
//   hills:       medium frequency, gentle rolling hills
//   mountain:    high-amplitude, but masked so it only rises where continental
//                is above average — prevents mountains from popping up in oceans
//   erosion:     high-frequency detail subtracted from mountains to weather them
//
// Terracing: above seaLevel + 14, the height is quantized to integer multiples
// of TERRACE_STEP — this creates the stepped cliff faces the user asked for.
export interface HeightmapField {
  baseHeight: number;     // final terrain height (already terraced)
  continental: number;    // raw continental noise (for biome rules)
  mountainRaw: number;    // raw mountain amplitude (for surface selection)
  clearing: number;       // worley F1 distance — low values = inside a clearing
}

export const TERRACE_STEP = 4; // height delta per terrace band

export function computeHeightField(wx: number, wz: number, seed: number, seaLevel: number): HeightmapField {
  // Continental: 4 octaves, very low frequency → big landmass shapes
  const continental = fbm2D(wx * 0.0035, wz * 0.0035, seed, 4);
  // Hills: 3 octaves, medium frequency
  const hills = fbm2D(wx * 0.018, wz * 0.018, seed + 1000, 3);
  // Mountain mask — only mountains where continental is above midline
  const mountainMask = Math.max(0, continental - 0.5) * 2; // 0..~1
  // Mountain: 3 octaves, squared for sharp peaks
  const mountainRaw = Math.pow(fbm2D(wx * 0.0095, wz * 0.0095, seed + 5000, 3), 2.2);
  // Erosion: 3 octaves, high frequency, used to subtract from mountains
  const erosion = fbm2D(wx * 0.045, wz * 0.045, seed + 8000, 3);

  // Base altitude
  let baseHeight = seaLevel + 4;
  baseHeight += (continental - 0.5) * 22;  // ±11 — continents
  baseHeight += (hills - 0.5) * 6;          // ±3 — gentle hills
  // Mountain contribution (masked): up to +36 at peaks
  const mountainH = mountainRaw * 36 * mountainMask;
  baseHeight += mountainH;
  // Erosion carves into mountains only (where mountains exist)
  if (mountainH > 4) {
    baseHeight -= erosion * (mountainH * 0.35);
  }

  // Terracing: above the terrace threshold, quantize altitude to TERRACE_STEP bands.
  // The 0.5 rounding offset gives each band equal vertical thickness.
  const terraceThreshold = seaLevel + 14;
  if (baseHeight > terraceThreshold) {
    const excess = baseHeight - terraceThreshold;
    const stepped = Math.floor(excess / TERRACE_STEP + 0.5) * TERRACE_STEP;
    baseHeight = terraceThreshold + stepped;
  }

  // Worley F1 for clearings — feature points on a 12-block grid
  const clearing = worley2D(wx * (1 / 12), wz * (1 / 12), seed + 25000);

  return {
    baseHeight,
    continental,
    mountainRaw: mountainH,
    clearing,
  };
}
