import { BLOCKS, WORLD_CONFIG } from './blocks';
import { generateChunkVoxels } from './chunkGen';
import type { BlockType, ChunkVoxels } from './types';
import { hash2, fbm2D, computeHeightField } from './noise';
import { mulberry32 } from './prng';

type TreeSpecies = 'oak' | 'pine' | 'spruce' | 'birch' | 'autumn_oak' | 'autumn_birch' | 'willow';

// Clamp a direction component to {-1, 0, 1} — used by growBranch to keep
// branches on the integer grid while allowing lateral drift.
function clampDir(n: number): number {
  if (n > 0) return 1;
  if (n < 0) return -1;
  return 0;
}

export class World {
  seed: number;
  chunkSize: number;
  worldHeight: number;
  seaLevel: number;
  // chunkKey: "cx,cz" -> Uint8Array (block ids index by x + z*size + y*size*size)
  chunks: Map<string, ChunkVoxels> = new Map();
  modifiedBlocks: Map<string, BlockType> = new Map();

  blockIdMap: Map<BlockType, number> = new Map();
  idBlockMap: BlockType[] = [];

  constructor(seed: number = 1337) {
    this.seed = seed;
    this.chunkSize = WORLD_CONFIG.CHUNK_SIZE;
    this.worldHeight = WORLD_CONFIG.WORLD_HEIGHT;
    this.seaLevel = WORLD_CONFIG.SEA_LEVEL;

    let id = 0;
    for (const bt of Object.keys(BLOCKS) as BlockType[]) {
      this.blockIdMap.set(bt, id);
      this.idBlockMap.push(bt);
      id++;
    }
  }

  blockToId(bt: BlockType): number {
    return this.blockIdMap.get(bt) ?? 0;
  }

  idToBlock(id: number): BlockType {
    return this.idBlockMap[id] ?? 'air';
  }

  worldToChunk(x: number, z: number): { cx: number; cz: number; lx: number; lz: number } {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const lx = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const lz = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;
    return { cx, cz, lx, lz };
  }

  chunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  blockKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  getBlock(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= this.worldHeight) return 'air';
    const modKey = this.blockKey(x, y, z);
    const mod = this.modifiedBlocks.get(modKey);
    if (mod !== undefined) return mod;

    const { cx, cz, lx, lz } = this.worldToChunk(x, z);
    const key = this.chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = this.generateChunk(cx, cz);
      this.chunks.set(key, chunk);
    }
    const idx = lx + lz * this.chunkSize + y * this.chunkSize * this.chunkSize;
    return this.idToBlock(chunk[idx]);
  }

  getBlockForMesh(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= this.worldHeight) return 'air';
    const modKey = this.blockKey(x, y, z);
    const mod = this.modifiedBlocks.get(modKey);
    if (mod !== undefined) return mod;

    const { cx, cz, lx, lz } = this.worldToChunk(x, z);
    const key = this.chunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return 'air';

    const idx = lx + lz * this.chunkSize + y * this.chunkSize * this.chunkSize;
    return this.idToBlock(chunk[idx]);
  }

  ensureChunkData(cx: number, cz: number) {
    const key = this.chunkKey(cx, cz);
    if (!this.chunks.has(key)) {
      this.chunks.set(key, this.generateChunk(cx, cz));
    }
  }

  /**
   * Inject voxels produced by the worker (zero-copy transfer of ownership).
   * The Uint8Array is stored as-is — caller must not retain references to it.
   */
  setChunkData(cx: number, cz: number, voxels: Uint8Array) {
    if (voxels.length === 0) return; // ignore empty (worker-unavailable) results
    const key = this.chunkKey(cx, cz);
    // Only accept if we don't already have data, OR if the existing data
    // was a "lazy generate" that got superseded. We always overwrite because
    // worker generation is deterministic (same seed → same voxels) and the
    // modifiedBlocks overlay keeps player edits intact.
    this.chunks.set(key, voxels);
  }

  /** Returns true if voxel data for this chunk is already loaded in memory. */
  hasChunkData(cx: number, cz: number): boolean {
    return this.chunks.has(this.chunkKey(cx, cz));
  }

  unloadDistantChunks(pcx: number, pcz: number, distance: number) {
    for (const key of Array.from(this.chunks.keys())) {
      const [cxStr, czStr] = key.split(',');
      const cx = parseInt(cxStr, 10);
      const cz = parseInt(czStr, 10);
      if (Math.abs(cx - pcx) > distance || Math.abs(cz - pcz) > distance) {
        this.chunks.delete(key);
      }
    }
  }

  setBlock(x: number, y: number, z: number, bt: BlockType, markModified = true): boolean {
    if (y < 0 || y >= this.worldHeight) return false;

    if (markModified) {
      this.modifiedBlocks.set(this.blockKey(x, y, z), bt);
    }

    const { cx, cz, lx, lz } = this.worldToChunk(x, z);
    const key = this.chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = this.generateChunk(cx, cz);
      this.chunks.set(key, chunk);
    }
    const idx = lx + lz * this.chunkSize + y * this.chunkSize * this.chunkSize;
    chunk[idx] = this.blockToId(bt);
    return true;
  }

  generateChunk(cx: number, cz: number): ChunkVoxels {
    return generateChunkVoxels({
      cx,
      cz,
      seed: this.seed,
      chunkSize: this.chunkSize,
      worldHeight: this.worldHeight,
      seaLevel: this.seaLevel,
      blockToId: this.blockToId.bind(this),
    });
  }

  getBiome(temp: number, humid: number, height: number, foliage: number): number {
    if (height > this.seaLevel + 22) return 4; // mountains
    if (temp < 0.32) return 3; // snow
    if (temp > 0.42 && temp < 0.55 && humid > 0.55 && foliage > 0.5) return 6; // autumn_forest
    if (temp > 0.65 && humid < 0.4) return 2; // desert
    if (temp < 0.45 && humid > 0.5) return 5; // taiga (cold forest)
    if (humid > 0.7 && height < this.seaLevel + 3) return 7; // swamp
    if (humid > 0.55) return 1; // forest
    if (humid < 0.35) return 2; // desert edge
    return 0; // plains
  }

  getBiomeName(b: number): string {
    return ['Równiny', 'Las', 'Pustynia', 'Tundra', 'Góry', 'Tajga', 'Jesienno-Liściasty', 'Bagno'][b] || 'Nieznany';
  }

  getSurfaceBlock(biome: number, y: number, height: number): BlockType {
    if (y === height) {
      switch (biome) {
        case 2: return 'sand';
        case 3: return 'snow';
        case 4: return height > this.seaLevel + 18 ? 'stone' : 'snow_grass';
        case 5: return 'snow_grass';
        case 7: return 'mud';
        case 6: return 'grass_autumn';
        default: return 'grass';
      }
    }
    return this.getSubsurfaceBlock(biome);
  }

  getSubsurfaceBlock(biome: number): BlockType {
    switch (biome) {
      case 2: return 'sand';
      case 3:
      case 5: return 'dirt';
      case 7: return 'mud';
      default: return 'dirt';
    }
  }

  // (old placeDecorations + full L-system tree code removed; logic now lives exclusively in pure chunkGen.ts for worker + main sharing)

  isSolid(x: number, y: number, z: number): boolean {
    const bt = this.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    const def = BLOCKS[bt];
    return def.solid;
  }

  findSpawn(): { x: number; y: number; z: number } {
    // Scan outward in a spiral and pick the most open grassy position
    // Prefer autumn forest biome (biomeId 6) for the lush Lay-of-the-Land-style forest feel
    const candidates: { x: number; y: number; z: number; treeScore: number; surfaceType: number; biomeScore: number }[] = [];

    for (let attempt = 0; attempt < 400; attempt++) {
      // Spiral outward from origin
      const angle = attempt * 0.4;
      const radius = Math.floor(attempt * 1.5);
      const x = Math.round(Math.cos(angle) * radius);
      const z = Math.round(Math.sin(angle) * radius);

      const biomeId = this.getBiomeAt(x, z);
      // Skip desert (2), mountains (4), water/sea level
      if (biomeId === 2 || biomeId === 4) continue;

      for (let y = this.worldHeight - 1; y >= 2; y--) {
        const bt = this.getBlock(x, y, z);
        const above = this.getBlock(x, y + 1, z);
        const above2 = this.getBlock(x, y + 2, z);
        const def = BLOCKS[bt];
        const isGround = def.solid && bt !== 'water' && !def.isLeaves && !def.isWood && bt !== 'magma';
        if (isGround && above === 'air' && above2 === 'air') {
          // Prefer grass surface, then dirt/sand, avoid stone-only mountains
          let surfaceScore = 0;
          if (bt === 'grass' || bt === 'grass_spring' || bt === 'grass_autumn') surfaceScore = 0;
          else if (bt === 'dirt' || bt === 'dirt_path' || bt === 'sand' || bt === 'snow_grass') surfaceScore = 1;
          else if (bt === 'snow') surfaceScore = 2;
          else if (bt === 'stone' || bt === 'cobblestone' || bt === 'granite' || bt === 'slate') surfaceScore = 5;
          else surfaceScore = 3;

          // Biome preference: autumn forest (6) is best, then forest (1), taiga (5), then plains (0)
          let biomeScore = 0;
          if (biomeId === 6) biomeScore = 0;       // autumn forest - best
          else if (biomeId === 1) biomeScore = 1;  // forest
          else if (biomeId === 5) biomeScore = 2;  // taiga
          else if (biomeId === 0) biomeScore = 3;  // plains
          else if (biomeId === 7) biomeScore = 4;  // swamp
          else if (biomeId === 3) biomeScore = 5;  // snow
          else biomeScore = 6;

          // Check if there are trees nearby (within 7 blocks horizontally)
          let treeScore = 0;
          for (let dx = -7; dx <= 7; dx++) {
            for (let dz = -7; dz <= 7; dz++) {
              for (let dy = 0; dy <= 12; dy++) {
                const nb = this.getBlock(x + dx, y + 1 + dy, z + dz);
                const ndef = BLOCKS[nb];
                if (ndef.isLeaves || ndef.isWood) {
                  // Weight closer trees higher
                  const dist = Math.sqrt(dx * dx + dz * dz);
                  treeScore += dist < 3 ? 10 : dist < 5 ? 3 : 1;
                }
              }
            }
          }
          candidates.push({ x: x + 0.5, y: y + 1.5, z: z + 0.5, treeScore, surfaceType: surfaceScore, biomeScore });
          if (candidates.length >= 50) break;
        }
      }
      if (candidates.length >= 50) break;
    }

    if (candidates.length > 0) {
      // Sort: best biome first, then grass surface, then moderate treeScore (some trees in distance, not on player)
      candidates.sort((a, b) => {
        if (a.biomeScore !== b.biomeScore) return a.biomeScore - b.biomeScore;
        if (a.surfaceType !== b.surfaceType) return a.surfaceType - b.surfaceType;
        // Prefer moderate treeScore (visible distant trees but not too close)
        const scoreA = Math.abs(a.treeScore - 25);
        const scoreB = Math.abs(b.treeScore - 25);
        return scoreA - scoreB;
      });
      return { x: candidates[0].x, y: candidates[0].y, z: candidates[0].z };
    }

    // Fallback - find highest solid in column 0,0
    for (let y = this.worldHeight - 1; y >= 1; y--) {
      const bt = this.getBlock(0, y, 0);
      if (bt !== 'air' && bt !== 'water' && bt !== 'magma' && BLOCKS[bt].solid) {
        return { x: 0.5, y: y + 1.5, z: 0.5 };
      }
    }
    return { x: 0.5, y: this.seaLevel + 2, z: 0.5 };
  }

  raycast(
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    maxDistance: number,
  ): {
    hit: boolean;
    block: { x: number; y: number; z: number };
    normal: { x: number; y: number; z: number };
    blockType: BlockType;
  } {
    const ox = origin.x;
    const oy = origin.y;
    const oz = origin.z;

    let x = Math.floor(ox);
    let y = Math.floor(oy);
    let z = Math.floor(oz);

    const stepX = dir.x > 0 ? 1 : -1;
    const stepY = dir.y > 0 ? 1 : -1;
    const stepZ = dir.z > 0 ? 1 : -1;

    const tDeltaX = Math.abs(1 / dir.x);
    const tDeltaY = Math.abs(1 / dir.y);
    const tDeltaZ = Math.abs(1 / dir.z);

    const nextBoundaryX = x + (stepX > 0 ? 1 : 0);
    const nextBoundaryY = y + (stepY > 0 ? 1 : 0);
    const nextBoundaryZ = z + (stepZ > 0 ? 1 : 0);

    let tMaxX = (nextBoundaryX - ox) / dir.x;
    let tMaxY = (nextBoundaryY - oy) / dir.y;
    let tMaxZ = (nextBoundaryZ - oz) / dir.z;
    if (!isFinite(tMaxX)) tMaxX = Infinity;
    if (!isFinite(tMaxY)) tMaxY = Infinity;
    if (!isFinite(tMaxZ)) tMaxZ = Infinity;

    let normal = { x: 0, y: 0, z: 0 };
    let t = 0;

    while (t <= maxDistance) {
      const bt = this.getBlock(x, y, z);
      const def = BLOCKS[bt];
      if (bt !== 'air' && bt !== 'water' && def.solid) {
        return {
          hit: true,
          block: { x, y, z },
          normal,
          blockType: bt,
        };
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        x += stepX;
        t = tMaxX;
        tMaxX += tDeltaX;
        normal = { x: -stepX, y: 0, z: 0 };
      } else if (tMaxY < tMaxZ) {
        y += stepY;
        t = tMaxY;
        tMaxY += tDeltaY;
        normal = { x: 0, y: -stepY, z: 0 };
      } else {
        z += stepZ;
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        normal = { x: 0, y: 0, z: -stepZ };
      }
    }

    return {
      hit: false,
      block: { x: 0, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 0 },
      blockType: 'air',
    };
  }

  getBiomeAt(x: number, z: number): number {
    // Use the new multi-layer height field for consistency with chunk generation
    const hf = computeHeightField(x, z, this.seed, this.seaLevel);
    const baseHeight = hf.baseHeight;
    const temp = fbm2D(x * 0.003, z * 0.003, this.seed + 9000, 2);
    const humid = fbm2D(x * 0.003, z * 0.003, this.seed + 13000, 2);
    const foliage = fbm2D(x * 0.006, z * 0.006, this.seed + 17000, 2);
    return this.getBiome(temp, humid, baseHeight, foliage);
  }
}
