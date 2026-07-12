// ETAP 2.2 — Block integrity system.
//
// BlockHealthMap stores ONLY damaged blocks (sparse Map<"x,y,z", health>).
// Pristine blocks cost zero memory — they fall through to BlockDef.defaultHealth
// (or a hardness-derived fallback) on read.
//
// Lifecycle:
//   - damage(x,y,z, amount, blockType) → returns remaining health; if ≤ 0 the
//     entry is auto-removed so the block can be cleanly broken/re-placed.
//   - getDamageStage(x,y,z, blockType) → integer 0..4 used by the crack overlay
//     renderer to pick the right crack texture (0 = pristine, 4 = about to break).
//   - remove(x,y,z) → call when the block is destroyed or replaced, so stale
//     health entries don't accumulate for blocks the player has rebuilt.

import { BLOCKS } from './blocks';
import type { BlockType } from './types';
import { createSubVoxelGrid, distributeBlockDamage, isSubFullyDestroyed } from './subvoxel';
import { mulberry32 } from './prng';

/** Compute the default health for a block type (used when no explicit value is set). */
export function defaultHealthFor(bt: BlockType): number {
  const def = BLOCKS[bt];
  if (!def) return 1;
  if (!def.breakable) return Infinity;
  if (def.defaultHealth !== undefined) return def.defaultHealth;
  // hardness-derived: 1 health per 0.25 hardness, min 1, max 16
  return Math.max(1, Math.min(16, Math.ceil((def.hardness || 1) * 4)));
}

export class BlockHealthMap {
  private health: Map<string, number> = new Map();
  private subs: Map<string, Uint8Array> = new Map();

  key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  /** Current health (default if never damaged). */
  get(x: number, y: number, z: number, bt: BlockType): number {
    const h = this.health.get(this.key(x, y, z));
    if (h !== undefined) return h;
    return defaultHealthFor(bt);
  }

  /**
   * Apply damage. Returns remaining health (0 = destroyed).
   * When health reaches 0 the entry is removed from the map so the block can
   * be cleanly broken and rebuilt without stale state.
   */
  damage(x: number, y: number, z: number, amount: number, bt: BlockType): number {
    const max = defaultHealthFor(bt);
    if (!isFinite(max)) return Infinity; // unbreakable
    const k = this.key(x, y, z);
    const current = this.get(x, y, z, bt);
    const next = current - amount;

    // Faza 3: integrate 4x4x4 subvoxel damage (real effect on destruction)
    if (!this.subs.has(k)) this.subs.set(k, createSubVoxelGrid(255));
    const sub = this.subs.get(k)!;
    const seed = ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0;
    distributeBlockDamage(sub, Math.max(1, Math.floor(amount * 4)), mulberry32(seed));

    if (isSubFullyDestroyed(sub) || next <= 0) {
      this.health.delete(k);
      this.subs.delete(k);
      return 0;
    }
    if (next >= max) {
      this.health.delete(k);
      this.subs.delete(k);
    } else {
      this.health.set(k, next);
    }
    return next;
  }

  /** Force a specific health value (used when restoring from save). */
  set(x: number, y: number, z: number, value: number, bt: BlockType) {
    const max = defaultHealthFor(bt);
    if (!isFinite(max)) return;
    const k = this.key(x, y, z);
    if (value >= max || value <= 0) {
      this.health.delete(k);
    } else {
      this.health.set(k, value);
    }
  }

  /** Remove the entry entirely (call when block is destroyed or replaced). */
  remove(x: number, y: number, z: number) {
    const k = this.key(x, y, z);
    this.health.delete(k);
    this.subs.delete(k);
  }

  /** Has this block been damaged at all? */
  isDamaged(x: number, y: number, z: number): boolean {
    return this.health.has(this.key(x, y, z));
  }

  /**
   * Returns a damage stage 0..4 for the crack overlay.
   *   0 = pristine (no overlay)
   *   1 = ~20% damaged
   *   2 = ~40% damaged
   *   3 = ~60% damaged
   *   4 = ~80%+ damaged (about to break)
   */
  getDamageStage(x: number, y: number, z: number, bt: BlockType): number {
    const max = defaultHealthFor(bt);
    if (!isFinite(max)) return 0;
    const k = this.key(x, y, z);
    const h = this.health.get(k);
    if (h === undefined) return 0;
    const ratio = 1 - h / max; // 0 = pristine, 1 = destroyed
    if (ratio <= 0) return 0;
    return Math.min(4, Math.floor(ratio * 4) + 1);
  }

  /** Total number of damaged blocks currently tracked (for telemetry). */
  get size(): number {
    return this.health.size;
  }

  /** Clear all damage state (used on respawn / world reset). */
  clear() {
    this.health.clear();
    this.subs.clear();
  }
}
