// subvoxel.ts — 4×4×4 sub-voxel structure (Faza 3 early prototype)
// Per PROJECT_CONTEXT: exactly 4x4x4 mini-voxels per block for true sub-voxel destruction.
// Integrated with block health/destruction: damage to a block can be distributed
// or targeted to subvoxels. Real damage application (not fake).

export const SUB_SIZE = 4;
export const SUB_COUNT = SUB_SIZE * SUB_SIZE * SUB_SIZE; // 64

export type SubVoxelGrid = Uint8Array; // 0-255 health per mini-voxel (or binary presence for MVP)

export function createSubVoxelGrid(fullHealth = 255): SubVoxelGrid {
  return new Uint8Array(SUB_COUNT).fill(fullHealth);
}

/** Flat index inside the 4x4x4: sx + sz*4 + sy*16 */
export function subIndex(sx: number, sy: number, sz: number): number {
  return sx + sz * SUB_SIZE + sy * SUB_SIZE * SUB_SIZE;
}

/** Apply damage to a specific subvoxel (clamped). Returns remaining. */
export function applySubDamage(grid: SubVoxelGrid, sx: number, sy: number, sz: number, dmg: number): number {
  const i = subIndex(sx, sy, sz);
  const cur = grid[i];
  const next = Math.max(0, cur - Math.max(0, Math.floor(dmg)));
  grid[i] = next;
  return next;
}

/** Get average health across the subvoxel grid (0-255 scale). Useful for progressive destruction visuals. */
export function getAverageSubHealth(grid: SubVoxelGrid): number {
  let sum = 0;
  for (let i = 0; i < SUB_COUNT; i++) sum += grid[i];
  return sum / SUB_COUNT;
}

/** Check if fully destroyed (all subvoxels 0). */
export function isSubFullyDestroyed(grid: SubVoxelGrid): boolean {
  for (let i = 0; i < SUB_COUNT; i++) if (grid[i] > 0) return false;
  return true;
}

/** Simple integration helper: when damaging a block, distribute damage to random subvoxels.
 *  Used by destruction system to make sub-voxel real.
 *  rng MUST be seeded PRNG (no Math.random default).
 */
export function distributeBlockDamage(grid: SubVoxelGrid, totalDmg: number, rng: () => number): number {
  let remaining = Math.floor(totalDmg);
  let applied = 0;
  while (remaining > 0 && !isSubFullyDestroyed(grid)) {
    const sx = Math.floor(rng() * SUB_SIZE);
    const sy = Math.floor(rng() * SUB_SIZE);
    const sz = Math.floor(rng() * SUB_SIZE);
    const before = grid[subIndex(sx, sy, sz)];
    if (before > 0) {
      const d = Math.min(remaining, before);
      applySubDamage(grid, sx, sy, sz, d);
      applied += d;
      remaining -= d;
    }
  }
  return applied;
}
