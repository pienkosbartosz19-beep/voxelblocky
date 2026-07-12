/**
 * src/game/blockHealth.ts
 * BlockHealthMap — sparse damage tracking for progressive destruction (Faza 3 prep)
 *
 * Ported from GLM ETAP-2:
 * - Only stores damaged blocks (RAM efficient)
 * - defaultHealth = clamp(hardness * 4, 1, 16)
 * - 4 damage stages for crack overlays
 * - Auto-clean when health=0 or back to pristine
 *
 * Integrates with sub-voxel later (4x4x4 mini-voxels will use similar sparse map per block)
 */

import { SeededPRNG } from './prng';
import { BlockType } from './types';

export class BlockHealthMap {
  private map = new Map<string, number>(); // key = `${x},${y},${z}` → current health

  constructor(private prng?: SeededPRNG) {}

  private key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  defaultHealthFor(blockType: BlockType): number {
    // TODO: map from blocks.ts hardness when full BlockDef exists
    const hardness = [1, 2, 3, 4, 5][blockType % 5] || 2; // placeholder
    return Math.max(1, Math.min(16, Math.ceil(hardness * 4)));
  }

  get(x: number, y: number, z: number, blockType: BlockType): number {
    const k = this.key(x, y, z);
    if (!this.map.has(k)) {
      return this.defaultHealthFor(blockType);
    }
    return this.map.get(k)!;
  }

  damage(x: number, y: number, z: number, blockType: BlockType, amount: number): number {
    const k = this.key(x, y, z);
    const current = this.get(x, y, z, blockType);
    const next = Math.max(0, current - amount);
    if (next <= 0) {
      this.map.delete(k);
      return 0;
    }
    this.map.set(k, next);
    return next;
  }

  isDamaged(x: number, y: number, z: number): boolean {
    return this.map.has(this.key(x, y, z));
  }

  getDamageStage(x: number, y: number, z: number, blockType: BlockType): number {
    const health = this.get(x, y, z, blockType);
    const max = this.defaultHealthFor(blockType);
    if (health >= max) return 0;
    const ratio = 1 - (health / max);
    return Math.min(3, Math.floor(ratio * 4)); // 0..3 stages
  }

  remove(x: number, y: number, z: number): void {
    this.map.delete(this.key(x, y, z));
  }

  // For persistence later (Faza 7)
  serialize(): string {
    return JSON.stringify(Array.from(this.map.entries()));
  }

  deserialize(data: string): void {
    this.map.clear();
    const arr = JSON.parse(data);
    for (const [k, v] of arr) this.map.set(k, v);
  }
}
