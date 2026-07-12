// src/game/chunkGen.ts
// Pure, testable chunk generation logic. No DOM, no Three, no class state.
// Used by World (main) and world.worker.ts (worker) for consistent, seeded, flat array output.
// All randomness via mulberry32 from prng.ts (or noise hashes for compat).

import { hash2, hash3, fbm2D, computeHeightField, worley2D } from './noise';
import type { BlockType } from './types';
import { mulberry32 } from './prng';

// The worker source had its own copies of helpers; here we share.

type TreeSpecies = 'oak' | 'pine' | 'spruce' | 'birch' | 'autumn_oak' | 'autumn_birch' | 'willow';

function clampDir(n: number): number {
  if (n > 0) return 1;
  if (n < 0) return -1;
  return 0;
}

export interface ChunkGenParams {
  cx: number;
  cz: number;
  seed: number;
  chunkSize: number;
  worldHeight: number;
  seaLevel: number;
  blockToId: (b: BlockType) => number;
}

export function generateChunkVoxels(params: ChunkGenParams): Uint8Array {
  const { cx, cz, seed, chunkSize: size, worldHeight, seaLevel, blockToId } = params;
  const total = size * size * worldHeight;
  const chunk = new Uint8Array(total);
  const baseX = cx * size;
  const baseZ = cz * size;

  // Precompute height/biome/clearing/foliage for the chunk using shared noise
  const heightmap = new Uint16Array(size * size);
  const biomemap = new Uint8Array(size * size);
  const foliageMap = new Float32Array(size * size);
  const clearingMap = new Float32Array(size * size);

  for (let lx = 0; lx < size; lx++) {
    for (let lz = 0; lz < size; lz++) {
      const wx = baseX + lx;
      const wz = baseZ + lz;
      const hf = computeHeightField(wx, wz, seed, seaLevel);
      const h = Math.floor(Math.max(1, Math.min(worldHeight - 1, hf.baseHeight)));
      heightmap[lx + lz * size] = h;

      const temp = fbm2D(wx * 0.003, wz * 0.003, seed + 9000, 2);
      const humid = fbm2D(wx * 0.003, wz * 0.003, seed + 13000, 2);
      const foliage = fbm2D(wx * 0.006, wz * 0.006, seed + 17000, 2);
      const b = getBiome(temp, humid, hf.baseHeight, foliage, seaLevel);
      biomemap[lx + lz * size] = b;
      foliageMap[lx + lz * size] = foliage;
      clearingMap[lx + lz * size] = hf.clearing;
    }
  }

  // Fill terrain columns (richer than basic: ores, caves, proper surface/subsurface)
  for (let lx = 0; lx < size; lx++) {
    for (let lz = 0; lz < size; lz++) {
      const wx = baseX + lx;
      const wz = baseZ + lz;
      const heightInt = heightmap[lx + lz * size];
      const biome = biomemap[lx + lz * size];

      for (let y = 0; y <= heightInt; y++) {
        let block: BlockType = 'stone';
        if (y === 0) {
          block = 'bedrock';
        } else if (y < heightInt - 4) {
          block = 'stone';
          const oreNoise = hash3(wx, y, wz * 31 + 7, seed + 2000);
          const depth = heightInt - y;
          if (depth > 5) {
            if (oreNoise > 0.985 && y < 12) block = 'diamond_ore';
            else if (oreNoise > 0.97 && y < 20) block = 'mithril_ore';
            else if (oreNoise > 0.96 && y < 22) block = 'gold_ore';
            else if (oreNoise > 0.945 && y < 32) block = 'iron_ore';
            else if (oreNoise > 0.93 && y < 40) block = 'copper_ore';
            else if (oreNoise > 0.92 && y < 45) block = 'tin_ore';
            else if (oreNoise > 0.918 && y < 50) block = 'zinc_ore';
            else if (oreNoise > 0.89) block = 'coal_ore';
            else if (oreNoise > 0.885 && y > 30) block = 'sulfur_ore';
            else if (oreNoise > 0.88 && y > 10) block = 'salt_ore';
            else {
              const stoneVar = hash3(wx * 0.3, y * 0.3, wz * 0.3, seed + 3000);
              if (stoneVar > 0.94) block = 'granite';
              else if (stoneVar > 0.92) block = 'slate';
              else if (stoneVar > 0.91 && y > 12) block = 'marble';
              else if (stoneVar > 0.905) block = 'cracked_stone';
            }
          }
        } else if (y < heightInt) {
          block = getSubsurfaceBlock(biome);
        } else {
          block = getSurfaceBlock(biome, y, heightInt, seaLevel);
        }

        // Cave carving (simple deterministic)
        if (y > 1 && y < heightInt - 2 && block !== 'bedrock') {
          const n1 = hash3(wx * 3, y * 5, wz * 3, seed + 7777);
          const n2 = hash3(wx * 7, y * 3, wz * 5, seed + 8888);
          if (n1 > 0.92 && n2 > 0.75) {
            block = 'air';
          } else if (y < 10 && n1 > 0.96 && n2 > 0.85) {
            block = 'magma';
          }
        }

        const idx = lx + lz * size + y * size * size;
        chunk[idx] = blockToId(block);
      }

      // Fill water up to sea level
      for (let y = heightInt + 1; y <= seaLevel; y++) {
        const idx = lx + lz * size + y * size * size;
        if (chunk[idx] === blockToId('air') || chunk[idx] === 0) {
          chunk[idx] = blockToId('water');
        }
      }

      // Surface decorations (trees/plants using clearing + biome)
      if (heightInt >= seaLevel && heightInt < worldHeight - 8) {
        placeDecorations(chunk, lx, lz, heightInt, wx, wz, biome, biomemap, size, foliageMap[lx + lz * size], clearingMap[lx + lz * size], blockToId, seed, seaLevel, worldHeight);
      }
    }
  }

  return chunk;
}

// helpers (pure)
function getBiome(temp: number, humid: number, height: number, foliage: number, seaLevel: number): number {
  if (height > seaLevel + 22) return 4;
  if (temp < 0.32) return 3;
  if (temp > 0.42 && temp < 0.55 && humid > 0.55 && foliage > 0.5) return 6;
  if (temp > 0.65 && humid < 0.4) return 2;
  if (temp < 0.45 && humid > 0.5) return 5;
  if (humid > 0.7 && height < seaLevel + 3) return 7;
  if (humid > 0.55) return 1;
  if (humid < 0.35) return 2;
  return 0;
}

function getSubsurfaceBlock(biome: number): BlockType {
  switch (biome) {
    case 2: return 'sand';
    case 3:
    case 5: return 'dirt';
    case 7: return 'mud';
    default: return 'dirt';
  }
}

function getSurfaceBlock(biome: number, y: number, height: number, seaLevel: number): BlockType {
  if (y === height) {
    switch (biome) {
      case 2: return 'sand';
      case 3: return 'snow';
      case 4: return height > seaLevel + 18 ? 'stone' : 'snow_grass';
      case 5: return 'snow_grass';
      case 7: return 'mud';
      case 6: return 'grass_autumn';
      default: return 'grass';
    }
  }
  return getSubsurfaceBlock(biome);
}

function placeDecorations(
  chunk: Uint8Array,
  lx: number,
  lz: number,
  heightInt: number,
  wx: number,
  wz: number,
  biome: number,
  biomemap: Uint8Array,
  size: number,
  foliage: number,
  clearing: number,
  blockToId: (b: BlockType) => number,
  seed: number,
  seaLevel: number,
  worldHeight: number,
) {
  const setInChunk = (y: number, block: BlockType) => {
    if (y < 0 || y >= worldHeight) return;
    const idx = lx + lz * size + y * size * size;
    chunk[idx] = blockToId(block);
  };
  const setInChunkOffset = (ox: number, oz: number, y: number, block: BlockType) => {
    const px = lx + ox, pz = lz + oz;
    if (px < 0 || px >= size || pz < 0 || pz >= size) return;
    if (y < 0 || y >= worldHeight) return;
    const idx = px + pz * size + y * size * size;
    chunk[idx] = blockToId(block);
  };

  const treeRoll = hash2(wx, wz, 1234); // seed part
  const flowerRoll = hash2(wx + 0.5, wz + 0.5, 5678);
  const grassRoll = hash2(wx + 0.7, wz + 0.3, 9876);
  const bushRoll = hash2(wx - 0.3, wz + 0.7, 4321);
  const detailRoll = hash2(wx + 0.1, wz - 0.2, 1111);

  const inClearing = clearing < 0.35;
  const treeAllowed = !inClearing;

  // Real L-system light trees (ported/adapted from World for shared pure path).
  // Produces tapered trunks, recursive branches, and gapped leaf clusters (density < 1.0 creates visible light gaps).
  if (treeAllowed && heightInt >= seaLevel) {
    const treeSeed1 = hash2(wx * 3.1, wz * 3.1, seed + 5000);
    const treeSeed2 = hash2(wx * 1.7, wz * 1.7, seed + 6000);
    const treeSeed3 = hash2(wx + 11, wz - 11, seed + 7000);
    const treeRng = mulberry32(Math.floor((treeSeed1 + treeSeed2 + treeSeed3) * 0x80000000) >>> 0);

    let species: TreeSpecies | null = null;
    if (biome === 1 && treeRoll > 0.80) { // forest
      const sp = hash2(wx * 1.7, wz * 1.7, seed + 2222);
      if (sp > 0.85) species = 'pine';
      else if (sp > 0.65) species = 'birch';
      else if (sp > 0.45) species = 'spruce';
      else species = 'oak';
    } else if (biome === 5 && treeRoll > 0.78) { // taiga
      species = (hash2(wx * 1.7, wz * 1.7, seed + 3333) > 0.55) ? 'spruce' : 'pine';
    } else if (biome === 6 && treeRoll > 0.72) { // autumn
      const sp = hash2(wx * 1.7, wz * 1.7, seed + 4444);
      species = (sp > 0.65) ? 'autumn_birch' : 'autumn_oak';
    } else if (biome === 0 && treeRoll > 0.96) {
      species = 'oak';
    } else if (biome === 3 && treeRoll > 0.93) {
      species = 'spruce';
    }

    if (species) {
      makeTreePure(setInChunkOffset, heightInt + 1, species, treeSeed1, treeSeed2, treeSeed3, treeRng, blockToId);
    }
  }

  // Plants / ground decor (non-tree)
  if (biome !== 2 && grassRoll > 0.5) {
    setInChunk(heightInt + 1, 'tall_grass');
  }
  if (bushRoll > 0.92 && biome !== 2 && biome !== 4) {
    setInChunk(heightInt + 1, 'bush');
  }
}

// === Pure (no-this) L-system tree implementations for chunkGen (shared with worker) ===

function makeTreePure(
  set: (ox: number, oz: number, y: number, b: BlockType) => void,
  baseY: number,
  species: TreeSpecies,
  s1: number, s2: number, s3: number,
  rng: () => number,
  blockToId: (b: BlockType) => number,
) {
  // Adapt set to use ids internally if needed (callers already pass blockToId-aware setter)
  const setId = set; // the provided set already does blockToId
  switch (species) {
    case 'oak': makeOakTreePure(setId, baseY, s1, s2, s3, rng); break;
    case 'pine': makePineTreePure(setId, baseY, s1, s2, s3, rng); break;
    case 'spruce': makeSpruceTreePure(setId, baseY, s1, s2, s3, rng); break;
    case 'birch': makeBirchTreePure(setId, baseY, s1, s2, s3, rng); break;
    case 'autumn_oak': makeAutumnOakTreePure(setId, baseY, s1, s2, s3, rng); break;
    case 'autumn_birch': makeAutumnBirchTreePure(setId, baseY, s1, s2, s3, rng); break;
    case 'willow': makeWillowTreePure(setId, baseY, s1, s2, s3, rng); break;
  }
}

function placeLeafClusterGappedPure(
  set: (ox: number, oz: number, y: number, b: BlockType) => void,
  ox: number, oz: number, y: number,
  radius: number,
  leafType: BlockType,
  rng: () => number,
  density: number,
) {
  const r = Math.ceil(radius);
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const d = Math.sqrt(dx * dx + dz * dz + dy * dy * 1.5);
        if (d <= radius + 0.3) {
          if (rng() < density) {
            set(ox + dx, oz + dz, y + dy, leafType);
          }
        }
      }
    }
  }
}

function growBranchPure(
  set: (ox: number, oz: number, y: number, b: BlockType) => void,
  ox: number, oz: number, y: number,
  dx: number, dz: number, dy: number,
  length: number,
  depth: number,
  woodType: BlockType,
  leafType: BlockType,
  rng: () => number,
  leafRadius: number,
  leafDensity: number,
) {
  if (length <= 0) return;
  let cx = ox, cz = oz, cy = y;
  for (let i = 0; i < length; i++) {
    cx += dx; cz += dz; cy += dy;
    set(cx, cz, cy, woodType);
    if ((i === Math.floor(length * 0.5) && depth > 0) || i === length - 1) {
      placeLeafClusterGappedPure(set, cx, cz, cy + 1, leafRadius, leafType, rng, leafDensity);
    }
  }
  if (depth > 0 && length > 1) {
    const numSplits = 2 + (rng() < 0.4 ? 1 : 0);
    for (let i = 0; i < numSplits; i++) {
      const ndx = clampDir(dx + (rng() < 0.5 ? -1 : 1) * (rng() < 0.7 ? 1 : 0));
      const ndz = clampDir(dz + (rng() < 0.5 ? -1 : 1) * (rng() < 0.7 ? 1 : 0));
      const ndy = dy >= 0 && rng() < 0.7 ? 1 : (rng() < 0.4 ? 1 : 0);
      const nlen = Math.max(1, Math.floor(length * (0.45 + rng() * 0.3)));
      growBranchPure(set, cx, cz, cy, ndx, ndz, ndy, nlen, depth - 1, woodType, leafType, rng, leafRadius * 0.85, leafDensity);
    }
  }
}

function makeOakTreePure(set: (ox: number, oz: number, y: number, b: BlockType) => void, baseY: number, s1: number, s2: number, s3: number, rng: () => number) {
  const trunkHeight = 5 + Math.floor(s1 * 4);
  for (let i = 0; i < Math.min(2, trunkHeight); i++) {
    set(0, 0, baseY + i, 'wood_oak');
    set(1, 0, baseY + i, 'wood_oak');
    set(0, 1, baseY + i, 'wood_oak');
    set(1, 1, baseY + i, 'wood_oak');
  }
  for (let i = 2; i < trunkHeight; i++) {
    set(0, 0, baseY + i, 'wood_oak');
  }
  const canopyTop = baseY + trunkHeight;
  const branchStartY = baseY + Math.floor(trunkHeight * 0.55);
  const numBranches = 3 + Math.floor(s2 * 2);
  for (let i = 0; i < numBranches; i++) {
    const angle = (i / numBranches) * Math.PI * 2 + s3 * Math.PI;
    const dx = clampDir(Math.round(Math.cos(angle)));
    const dz = clampDir(Math.round(Math.sin(angle)));
    const branchLen = 2 + Math.floor(rng() * 3);
    growBranchPure(set, 0, 0, branchStartY + (i % 2), dx, dz, 1, branchLen, 1, 'wood_oak', 'leaves_oak', rng, 1.6, 0.72);
  }
  placeLeafClusterGappedPure(set, 0, 0, canopyTop - 2, 2.5, 'leaves_oak', rng, 0.78);
  placeLeafClusterGappedPure(set, 0, 0, canopyTop, 2.2, 'leaves_oak', rng, 0.72);
  placeLeafClusterGappedPure(set, 0, 0, canopyTop + 2, 1.6, 'leaves_oak', rng, 0.7);
  set(0, 0, canopyTop + 3, 'leaves_oak');
}

function makePineTreePure(set: (ox: number, oz: number, y: number, b: BlockType) => void, baseY: number, s1: number, s2: number, s3: number, rng: () => number) {
  const trunkHeight = 8 + Math.floor(s1 * 6);
  for (let i = 0; i < Math.min(2, trunkHeight); i++) {
    set(0, 0, baseY + i, 'wood_pine');
    set(1, 0, baseY + i, 'wood_pine');
    set(0, 1, baseY + i, 'wood_pine');
    set(1, 1, baseY + i, 'wood_pine');
  }
  for (let i = 2; i < trunkHeight; i++) {
    set(0, 0, baseY + i, 'wood_pine');
  }
  const canopyTop = baseY + trunkHeight;
  const canopyBottom = baseY + Math.floor(trunkHeight * 0.4);
  const totalLayers = canopyTop - canopyBottom + 1;
  const maxRadius = Math.max(2.5, totalLayers * 0.4);
  let layerIdx = 0;
  for (let y = canopyBottom; y <= canopyTop; y++) {
    const t = layerIdx / Math.max(1, totalLayers - 1);
    const radius = maxRadius * (1 - t * 0.85) + 0.5;
    const density = 0.55 + (1 - t) * 0.25;
    placeLeafClusterGappedPure(set, 0, 0, y, radius, 'leaves_pine', rng, density);
    layerIdx++;
  }
  set(0, 0, canopyTop + 1, 'leaves_pine');
}

function makeSpruceTreePure(set: (ox: number, oz: number, y: number, b: BlockType) => void, baseY: number, s1: number, s2: number, s3: number, rng: () => number) {
  const trunkHeight = 7 + Math.floor(s1 * 5);
  for (let i = 0; i < Math.min(2, trunkHeight); i++) {
    set(0, 0, baseY + i, 'wood_spruce');
    set(1, 0, baseY + i, 'wood_spruce');
    set(0, 1, baseY + i, 'wood_spruce');
    set(1, 1, baseY + i, 'wood_spruce');
  }
  for (let i = 2; i < trunkHeight; i++) {
    set(0, 0, baseY + i, 'wood_spruce');
  }
  const canopyTop = baseY + trunkHeight;
  const canopyBottom = baseY + 1;
  const totalLayers = canopyTop - canopyBottom + 1;
  const maxRadius = Math.max(2.8, totalLayers * 0.42);
  let layerIdx = 0;
  for (let y = canopyBottom; y <= canopyTop; y++) {
    const t = layerIdx / Math.max(1, totalLayers - 1);
    const droop = Math.sin(t * Math.PI * 3) * 0.3;
    const radius = maxRadius * (1 - t * 0.85) + droop + 0.5;
    const density = 0.6 + (1 - t) * 0.2;
    placeLeafClusterGappedPure(set, 0, 0, y, radius, 'leaves_spruce', rng, density);
    layerIdx++;
  }
  set(0, 0, canopyTop + 1, 'leaves_spruce');
}

function makeBirchTreePure(set: (ox: number, oz: number, y: number, b: BlockType) => void, baseY: number, s1: number, s2: number, s3: number, rng: () => number) {
  const trunkHeight = 6 + Math.floor(s1 * 4);
  for (let i = 0; i < Math.min(1, trunkHeight); i++) {
    set(0, 0, baseY + i, 'wood_birch');
    set(1, 0, baseY + i, 'wood_birch');
    set(0, 1, baseY + i, 'wood_birch');
    set(1, 1, baseY + i, 'wood_birch');
  }
  for (let i = 1; i < trunkHeight; i++) {
    set(0, 0, baseY + i, 'wood_birch');
  }
  const canopyTop = baseY + trunkHeight;
  placeLeafClusterGappedPure(set, 0, 0, canopyTop - 1, 1.8, 'leaves_birch', rng, 0.6);
  placeLeafClusterGappedPure(set, 0, 0, canopyTop + 1, 2.2, 'leaves_birch', rng, 0.55);
  placeLeafClusterGappedPure(set, 0, 0, canopyTop + 2, 1.2, 'leaves_birch', rng, 0.6);
  if (s2 > 0.4) {
    growBranchPure(set, 0, 0, canopyTop - 1, 1, 0, 0, 2, 0, 'wood_birch', 'leaves_birch', rng, 1.2, 0.7);
    growBranchPure(set, 0, 0, canopyTop - 1, -1, 0, 0, 2, 0, 'wood_birch', 'leaves_birch', rng, 1.2, 0.7);
  }
  set(0, 0, canopyTop + 3, 'leaves_birch');
}

function makeAutumnOakTreePure(set: (ox: number, oz: number, y: number, b: BlockType) => void, baseY: number, s1: number, s2: number, s3: number, rng: () => number) {
  const trunkHeight = 5 + Math.floor(s1 * 4);
  for (let i = 0; i < Math.min(2, trunkHeight); i++) {
    set(0, 0, baseY + i, 'wood_oak');
    set(1, 0, baseY + i, 'wood_oak');
    set(0, 1, baseY + i, 'wood_oak');
    set(1, 1, baseY + i, 'wood_oak');
  }
  for (let i = 2; i < trunkHeight; i++) {
    set(0, 0, baseY + i, 'wood_oak');
  }
  const canopyTop = baseY + trunkHeight;
  const branchStartY = baseY + Math.floor(trunkHeight * 0.55);
  const numBranches = 3 + Math.floor(s2 * 2);
  for (let i = 0; i < numBranches; i++) {
    const angle = (i / numBranches) * Math.PI * 2 + s3 * Math.PI;
    const dx = clampDir(Math.round(Math.cos(angle)));
    const dz = clampDir(Math.round(Math.sin(angle)));
    const branchLen = 2 + Math.floor(rng() * 3);
    growBranchPure(set, 0, 0, branchStartY + (i % 2), dx, dz, 1, branchLen, 1, 'wood_oak', 'leaves_autumn_red', rng, 1.6, 0.72);
  }
  placeLeafClusterGappedPure(set, 0, 0, canopyTop - 2, 2.5, 'leaves_autumn_orange', rng, 0.78);
  placeLeafClusterGappedPure(set, 0, 0, canopyTop, 2.2, 'leaves_autumn_yellow', rng, 0.72);
  placeLeafClusterGappedPure(set, 0, 0, canopyTop + 2, 1.6, 'leaves_autumn_mixed', rng, 0.7);
  set(0, 0, canopyTop + 3, 'leaves_autumn_red');
}

function makeAutumnBirchTreePure(set: (ox: number, oz: number, y: number, b: BlockType) => void, baseY: number, s1: number, s2: number, s3: number, rng: () => number) {
  const trunkHeight = 6 + Math.floor(s1 * 4);
  for (let i = 0; i < Math.min(1, trunkHeight); i++) {
    set(0, 0, baseY + i, 'wood_birch');
    set(1, 0, baseY + i, 'wood_birch');
    set(0, 1, baseY + i, 'wood_birch');
    set(1, 1, baseY + i, 'wood_birch');
  }
  for (let i = 1; i < trunkHeight; i++) {
    set(0, 0, baseY + i, 'wood_birch');
  }
  const canopyTop = baseY + trunkHeight;
  const leaf = (s2 > 0.5) ? 'leaves_autumn_yellow' : 'leaves_autumn_orange';
  placeLeafClusterGappedPure(set, 0, 0, canopyTop - 1, 1.8, leaf, rng, 0.6);
  placeLeafClusterGappedPure(set, 0, 0, canopyTop + 1, 2.2, leaf, rng, 0.55);
  placeLeafClusterGappedPure(set, 0, 0, canopyTop + 2, 1.2, leaf, rng, 0.6);
  set(0, 0, canopyTop + 3, leaf);
}

function makeWillowTreePure(set: (ox: number, oz: number, y: number, b: BlockType) => void, baseY: number, s1: number, s2: number, s3: number, rng: () => number) {
  const trunkHeight = 4 + Math.floor(s1 * 3);
  for (let i = 0; i < Math.min(2, trunkHeight); i++) {
    set(0, 0, baseY + i, 'wood_oak');
    set(1, 0, baseY + i, 'wood_oak');
    set(0, 1, baseY + i, 'wood_oak');
    set(1, 1, baseY + i, 'wood_oak');
  }
  for (let i = 2; i < trunkHeight; i++) {
    set(0, 0, baseY + i, 'wood_oak');
  }
  const canopyTop = baseY + trunkHeight;
  placeLeafClusterGappedPure(set, 0, 0, canopyTop, 2.7, 'leaves_willow', rng, 0.65);
  placeLeafClusterGappedPure(set, 0, 0, canopyTop + 1, 2.2, 'leaves_willow', rng, 0.6);
  for (let angle = 0; angle < 8; angle++) {
    const a = (angle / 8) * Math.PI * 2;
    const dx = Math.round(Math.cos(a) * 2);
    const dz = Math.round(Math.sin(a) * 2);
    const hang = 2 + Math.floor(s2 * 2);
    for (let i = 0; i < hang; i++) {
      if (rng() < 0.75) set(dx, dz, canopyTop - i, 'leaves_willow');
    }
  }
  set(0, 0, canopyTop + 2, 'leaves_willow');
}
