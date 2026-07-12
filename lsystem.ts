/**
 * src/game/lsystem.ts
 * ADVANCED L-SYSTEM TREES for Faza 5 (ported & adapted from proven ETAP-2 implementation)
 *
 * Key improvements from GLM ETAP-2 (Lay of the Land reference → Prometeusz):
 * - Tapered trunks: 2×2 base for 1-2 blocks, then 1×1 column (more natural, less "pixel art" look)
 * - Recursive branching: depth=1, 2-3 splits per node, clampDir() for natural bending
 * - Light gaps in canopy: placeLeafClusterGapped() randomly skips 25-45% leaves → visible light shafts
 * - 7 species with seasonal variants (oak, pine, spruce, birch, autumn_oak, autumn_birch, willow)
 * - Uses SeededPRNG everywhere — zero Math.random
 * - Designed for Worker (flat TypedArray compatible via setter callback)
 *
 * Polish cultural touch: Willow (wierzba) as iconic Polish landscape element near water/meadows.
 */

import { SeededPRNG } from './prng';
import { BlockType } from './types';

export type TreeSpecies = 'oak' | 'pine' | 'spruce' | 'birch' | 'autumn_oak' | 'autumn_birch' | 'willow';

export interface TreePlacement {
  baseX: number;
  baseY: number;
  baseZ: number;
  species: TreeSpecies;
  height: number;
}

interface VoxelSetter {
  (x: number, y: number, z: number, type: BlockType): void;
}

/**
 * clampDir — keeps branch direction changes natural (small mutations only)
 */
function clampDir(dir: number[], prng: SeededPRNG): number[] {
  const newDir = [...dir];
  // Small random mutation
  for (let i = 0; i < 3; i++) {
    if (prng.next() < 0.3) {
      newDir[i] += prng.nextFloat(-0.6, 0.6);
    }
  }
  // Normalize roughly
  const len = Math.sqrt(newDir[0]**2 + newDir[1]**2 + newDir[2]**2) || 1;
  return newDir.map(d => d / len);
}

/**
 * placeLeafClusterGapped — creates light gaps by skipping random leaves
 */
function placeLeafClusterGapped(
  setter: VoxelSetter,
  cx: number, cy: number, cz: number,
  radius: number,
  leafType: BlockType,
  density: number, // 0.55 - 0.78
  prng: SeededPRNG
): void {
  const r2 = radius * radius;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx*dx + dy*dy + dz*dz > r2) continue;
        if (prng.next() > density) continue; // skip for gaps ~22-45%
        setter(cx + dx, cy + dy, cz + dz, leafType);
      }
    }
  }
}

/**
 * growBranch — recursive branching (depth limited for perf)
 */
function growBranch(
  setter: VoxelSetter,
  x: number, y: number, z: number,
  dir: number[],
  depth: number,
  branchType: BlockType,
  leafType: BlockType,
  prng: SeededPRNG,
  maxDepth = 2
): void {
  if (depth > maxDepth) return;

  const steps = prng.nextInt(2, 4);
  let cx = x, cy = y, cz = z;

  for (let s = 0; s < steps; s++) {
    cx = Math.floor(cx + dir[0] + prng.nextFloat(-0.3, 0.3));
    cy = Math.floor(cy + dir[1] + prng.nextFloat(-0.1, 0.4)); // bias upward
    cz = Math.floor(cz + dir[2] + prng.nextFloat(-0.3, 0.3));

    setter(cx, cy, cz, branchType);

    // Occasional leaf cluster on branch
    if (prng.next() < 0.6) {
      placeLeafClusterGapped(setter, cx, cy + 1, cz, 2, leafType, 0.65, prng);
    }
  }

  // 2-3 child branches
  const splits = prng.nextInt(2, 3);
  for (let i = 0; i < splits; i++) {
    const newDir = clampDir(dir, prng);
    growBranch(setter, cx, cy, cz, newDir, depth + 1, branchType, leafType, prng, maxDepth);
  }
}

/**
 * Main entry: generateTree — places full tree with tapered trunk + advanced canopy
 */
export function generateTree(
  setter: VoxelSetter,
  baseX: number,
  baseY: number,
  baseZ: number,
  species: TreeSpecies,
  prng: SeededPRNG,
  height: number = 7
): void {
  const woodType: BlockType = species.includes('autumn') || species === 'willow' ? 5 : 4; // placeholder ids — map to real BLOCKS later
  const leafType: BlockType = species.includes('autumn') ? 14 : (species === 'pine' || species === 'spruce' ? 15 : 6);

  // === TAPERED TRUNK (2x2 base → 1x1) ===
  const baseHeight = prng.nextInt(1, 2);
  for (let y = 0; y < baseHeight; y++) {
    for (let dx = 0; dx < 2; dx++) {
      for (let dz = 0; dz < 2; dz++) {
        setter(baseX + dx, baseY + y, baseZ + dz, woodType);
      }
    }
  }

  // Main 1-wide trunk column
  const trunkHeight = Math.max(3, height - baseHeight);
  for (let y = 0; y < trunkHeight; y++) {
    setter(baseX, baseY + baseHeight + y, baseZ, woodType);
  }

  const topY = baseY + baseHeight + trunkHeight - 1;

  // === RECURSIVE BRANCHING from upper trunk ===
  const initialDir: number[] = [0, 1, 0];
  growBranch(setter, baseX, topY - 1, baseZ, initialDir, 0, woodType, leafType, prng);

  // === CANOPY with light gaps ===
  // Main crown
  placeLeafClusterGapped(setter, baseX, topY + 2, baseZ, 4, leafType, 0.68, prng);
  // Secondary clusters for volume + gaps
  for (let i = 0; i < 3; i++) {
    const ox = prng.nextInt(-2, 2);
    const oy = prng.nextInt(-1, 3);
    const oz = prng.nextInt(-2, 2);
    placeLeafClusterGapped(setter, baseX + ox, topY + 1 + oy, baseZ + oz, 3, leafType, 0.72, prng);
  }

  // Willow special: hanging vines / long branches (Polish landscape feel)
  if (species === 'willow') {
    for (let i = 0; i < 5; i++) {
      const hx = baseX + prng.nextInt(-3, 3);
      const hz = baseZ + prng.nextInt(-3, 3);
      const hy = topY - prng.nextInt(0, 2);
      for (let d = 1; d < 5; d++) {
        setter(hx, hy - d, hz, leafType);
      }
    }
  }
}

/**
 * Helper to get leaf type per species (for world gen)
 */
export function getLeafType(species: TreeSpecies): BlockType {
  if (species.includes('autumn')) return 14;
  if (species === 'pine' || species === 'spruce') return 15;
  return 6;
}

export const TREE_SPECIES: TreeSpecies[] = ['oak', 'pine', 'spruce', 'birch', 'autumn_oak', 'autumn_birch', 'willow'];
