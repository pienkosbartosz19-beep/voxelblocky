import * as THREE from 'three';
import { World } from './world';
import { buildChunkMesh } from './chunkMesh';
import { BLOCKS, WORLD_CONFIG } from './blocks';
import { getAtlasTexture } from './textureAtlas';
import { WorldWorkerBridge } from './worldWorkerClient';

export interface ChunkMeshes {
  cx: number;
  cz: number;
  solid?: THREE.Mesh;
  leaves?: THREE.Mesh;
  transparent?: THREE.Mesh;
  cross?: THREE.Mesh;
}

export interface PerfStats {
  drawCalls: number;
  triangles: number;
  chunksLoaded: number;
  chunksVisible: number;
  workerQueueDepth: number;
  frameTimeMs: number;
}

export class ChunkManager {
  scene: THREE.Scene;
  world: World;
  chunks: Map<string, ChunkMeshes> = new Map();
  renderDistance: number;
  solidMaterial: THREE.Material;
  leavesMaterial: THREE.Material;
  transparentMaterial: THREE.Material;
  crossMaterial: THREE.Material;
  pendingBuild: Set<string> = new Set();

  // Worker bridge (may be null if Workers unavailable in this environment)
  workerBridge: WorldWorkerBridge | null = null;

  // Frame-budget queue: chunks needing (re)meshing, processed in time-boxed batches
  private buildQueue: Array<{ cx: number; cz: number; dist: number }> = [];

  // Statistics
  triangleCount = 0;
  // Rolling frame-time budget for main-thread meshing (ms)
  frameBudgetMs = 4;

  constructor(scene: THREE.Scene, world: World, renderDistance: number = WORLD_CONFIG.RENDER_DISTANCE) {
    this.scene = scene;
    this.world = world;
    this.renderDistance = renderDistance;

    const atlas = getAtlasTexture();

    this.solidMaterial = new THREE.MeshLambertMaterial({
      map: atlas,
      vertexColors: true,
      side: THREE.FrontSide,
      alphaTest: 0.1,
    });

    // LEAVES — separate material: alpha-tested cutout (NOT real transparency).
    // depthWrite: true so leaves properly occlude things behind them.
    // alphaTest: 0.5 discards transparent texels (the leaf-shaped holes).
    this.leavesMaterial = new THREE.MeshLambertMaterial({
      map: atlas,
      vertexColors: true,
      side: THREE.FrontSide, // FrontSide + DoubleSide-on-leaves-was-the-cause-of-flicker; FrontSide culls back faces which is what we want
      alphaTest: 0.5,
      transparent: false,
      depthWrite: true,
    });

    this.transparentMaterial = new THREE.MeshLambertMaterial({
      map: atlas,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      alphaTest: 0.1,
    });

    this.crossMaterial = new THREE.MeshLambertMaterial({
      map: atlas,
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.5,
    });

    // Spin up the worker bridge (best-effort; degrades to main-thread if unavailable)
    try {
      this.workerBridge = new WorldWorkerBridge(world);
    } catch (e) {
      console.warn('[ChunkManager] WorldWorkerBridge unavailable, falling back to main-thread meshing:', e);
      this.workerBridge = null;
    }
  }

  key(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  /**
   * Process the build queue using a time-boxed budget. Called once per render frame.
   * This is the single entry point that respects the 4ms frame budget rule.
   *
   * Worker pipeline:
   *   1. If a job's voxel data isn't yet requested from the worker, request it
   *      (fire-and-forget postMessage).
   *   2. When voxels arrive (set via noteChunkDataFromWorker), the job is now
   *      "meshable" — build its THREE.BufferGeometry on the main thread, which
   *      is fast (≤4ms) because most voxels are air.
   *   3. If worker is unavailable, fall back to synchronous World.ensureChunkData.
   */
  processBuildQueue(budgetMs?: number): number {
    const budget = budgetMs ?? this.frameBudgetMs;
    const start = performance.now();
    let built = 0;

    // First: kick off worker generation for any jobs that don't have voxels yet.
    if (this.workerBridge && this.workerBridge.isReady()) {
      for (const job of this.buildQueue) {
        if (!this.world.hasChunkData(job.cx, job.cz) && !this.workerPending.has(this.key(job.cx, job.cz))) {
          this.workerPending.add(this.key(job.cx, job.cz));
          const k = this.key(job.cx, job.cz);
          this.workerBridge.generateChunk(job.cx, job.cz).then((voxels) => {
            this.workerPending.delete(k);
            if (voxels.length > 0) {
              this.world.setChunkData(job.cx, job.cz, voxels);
            } else {
              // Worker unavailable — force main-thread generation
              this.world.ensureChunkData(job.cx, job.cz);
            }
          });
        }
      }
    } else {
      // No worker — eagerly generate voxel data on main thread for queued chunks
      for (const job of this.buildQueue) {
        if (!this.world.hasChunkData(job.cx, job.cz)) {
          this.world.ensureChunkData(job.cx, job.cz);
        }
      }
    }

    // Then: mesh any jobs whose voxel data is now ready, respecting the budget.
    while (this.buildQueue.length > 0) {
      if (performance.now() - start >= budget) break;
      const job = this.buildQueue[0];
      if (!this.world.hasChunkData(job.cx, job.cz)) {
        // Voxel data not ready yet — leave it queued, try next frame
        break;
      }
      this.buildQueue.shift();
      this.ensureChunk(job.cx, job.cz);
      built++;
    }
    return built;
  }

  /** Set of chunks for which a worker generation request is in-flight. */
  private workerPending: Set<string> = new Set();

  ensureChunk(cx: number, cz: number): ChunkMeshes | null {
    const k = this.key(cx, cz);
    const existing = this.chunks.get(k);
    if (existing) return existing;

    this.world.ensureChunkData(cx, cz);
    const c = this.buildChunk(cx, cz);
    if (c) this.chunks.set(k, c);

    return c;
  }

  rebuildIfLoaded(cx: number, cz: number) {
    const k = this.key(cx, cz);
    if (this.chunks.has(k)) {
      this.rebuildChunk(cx, cz);
    }
  }

  buildChunk(cx: number, cz: number): ChunkMeshes {
    const meshData = buildChunkMesh(this.world, cx, cz);
    const result: ChunkMeshes = { cx, cz };

    if (meshData.solid) {
      result.solid = new THREE.Mesh(meshData.solid, this.solidMaterial);
      result.solid.position.set(cx * 16, 0, cz * 16);
      result.solid.userData = { cx, cz, kind: 'solid' };
      result.solid.frustumCulled = true;
      this.scene.add(result.solid);
      this.triangleCount += (meshData.solid.getIndex()?.count ?? 0) / 3;
    }
    if (meshData.leaves) {
      result.leaves = new THREE.Mesh(meshData.leaves, this.leavesMaterial);
      result.leaves.position.set(cx * 16, 0, cz * 16);
      result.leaves.userData = { cx, cz, kind: 'leaves' };
      result.leaves.frustumCulled = true;
      this.scene.add(result.leaves);
      this.triangleCount += (meshData.leaves.getIndex()?.count ?? 0) / 3;
    }
    if (meshData.transparent) {
      result.transparent = new THREE.Mesh(meshData.transparent, this.transparentMaterial);
      result.transparent.position.set(cx * 16, 0, cz * 16);
      result.transparent.userData = { cx, cz, kind: 'transparent' };
      result.transparent.frustumCulled = true;
      this.scene.add(result.transparent);
      this.triangleCount += (meshData.transparent.getIndex()?.count ?? 0) / 3;
    }
    if (meshData.cross) {
      result.cross = new THREE.Mesh(meshData.cross, this.crossMaterial);
      result.cross.position.set(cx * 16, 0, cz * 16);
      result.cross.userData = { cx, cz, kind: 'cross' };
      result.cross.frustumCulled = true;
      this.scene.add(result.cross);
      this.triangleCount += (meshData.cross.getIndex()?.count ?? 0) / 3;
    }

    return result;
  }

  rebuildChunk(cx: number, cz: number) {
    const k = this.key(cx, cz);
    const existing = this.chunks.get(k);
    if (existing) {
      this.disposeChunk(existing);
      this.chunks.delete(k);
    }
    const fresh = this.buildChunk(cx, cz);
    this.chunks.set(k, fresh);
  }

  disposeChunk(c: ChunkMeshes) {
    if (c.solid) {
      this.scene.remove(c.solid);
      c.solid.geometry.dispose();
      this.triangleCount -= (c.solid.geometry.getIndex()?.count ?? 0) / 3;
    }
    if (c.leaves) {
      this.scene.remove(c.leaves);
      c.leaves.geometry.dispose();
      this.triangleCount -= (c.leaves.geometry.getIndex()?.count ?? 0) / 3;
    }
    if (c.transparent) {
      this.scene.remove(c.transparent);
      c.transparent.geometry.dispose();
      this.triangleCount -= (c.transparent.geometry.getIndex()?.count ?? 0) / 3;
    }
    if (c.cross) {
      this.scene.remove(c.cross);
      c.cross.geometry.dispose();
      this.triangleCount -= (c.cross.geometry.getIndex()?.count ?? 0) / 3;
    }
  }

  unloadChunk(cx: number, cz: number) {
    const k = this.key(cx, cz);
    const c = this.chunks.get(k);
    if (!c) return;
    this.disposeChunk(c);
    this.chunks.delete(k);
  }

  /**
   * Update visible chunks based on player position. Queues chunks for building
   * rather than building them inline — `processBuildQueue()` does the time-boxed work.
   */
  update(playerX: number, playerZ: number, _maxPerFrame: number = 2) {
    const pcx = Math.floor(playerX / 16);
    const pcz = Math.floor(playerZ / 16);

    // Build a list of chunks needing load
    const toLoad: Array<{ cx: number; cz: number; dist: number }> = [];
    for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
      for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const k = this.key(cx, cz);
        if (this.chunks.has(k)) continue;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > this.renderDistance + 0.5) continue;
        toLoad.push({ cx, cz, dist });
      }
    }
    toLoad.sort((a, b) => a.dist - b.dist);

    // Pre-generate voxel data for the next N chunks (off-thread if Worker available,
    // else eagerly on main thread — but only the data, not the mesh).
    // Then queue them for time-boxed meshing.
    const maxNewQueuedPerUpdate = 6; // cap to keep memory bounded
    let newlyQueued = 0;
    for (const job of toLoad) {
      if (newlyQueued >= maxNewQueuedPerUpdate) break;
      const k = this.key(job.cx, job.cz);
      if (this.pendingBuild.has(k)) continue;
      this.pendingBuild.add(k);
      // Note: voxel data is generated by the worker when processBuildQueue runs.
      // We don't call ensureChunkData here — that would block the main thread.
      this.buildQueue.push(job);
      newlyQueued++;
    }

    // Unload distant chunks
    const unloadDist = this.renderDistance + 2;
    for (const [k, c] of this.chunks) {
      const dx = c.cx - pcx;
      const dz = c.cz - pcz;
      if (Math.abs(dx) > unloadDist || Math.abs(dz) > unloadDist) {
        this.disposeChunk(c);
        this.chunks.delete(k);
        this.pendingBuild.delete(k);
      }
    }

    // Also drop stale pending-build entries that are now far away
    for (const k of Array.from(this.pendingBuild)) {
      const [cxStr, czStr] = k.split(',');
      const cx = parseInt(cxStr, 10);
      const cz = parseInt(czStr, 10);
      if (Math.abs(cx - pcx) > unloadDist || Math.abs(cz - pcz) > unloadDist) {
        this.pendingBuild.delete(k);
      }
    }

    // Remove already-built jobs from the queue
    this.buildQueue = this.buildQueue.filter(job => !this.chunks.has(this.key(job.cx, job.cz)));

    this.world.unloadDistantChunks(pcx, pcz, unloadDist);
  }

  /** When a chunk is freshly built, remove it from the pending set. */
  noteBuilt(cx: number, cz: number) {
    this.pendingBuild.delete(this.key(cx, cz));
  }

  /** Compute current performance stats for the HUD overlay. */
  computePerfStats(renderer: THREE.WebGLRenderer, frameTimeMs: number): PerfStats {
    const info = renderer.info.render;
    return {
      drawCalls: info.calls,
      triangles: info.triangles,
      chunksLoaded: this.chunks.size,
      chunksVisible: this.chunks.size, // frustum-culled ones are still "loaded"; renderer.info gives true visible
      workerQueueDepth: this.buildQueue.length,
      frameTimeMs,
    };
  }

  isBlockSolidAt(x: number, y: number, z: number): boolean {
    const bt = this.world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return BLOCKS[bt].solid;
  }

  findGroundHeight(x: number, z: number, startY: number): number {
    for (let y = startY; y >= 0; y--) {
      const bt = this.world.getBlock(Math.floor(x), y, Math.floor(z));
      if (BLOCKS[bt].solid) return y + 1;
    }
    return 1;
  }

  dispose() {
    for (const [, c] of this.chunks) {
      this.disposeChunk(c);
    }
    this.chunks.clear();
    this.solidMaterial.dispose();
    this.leavesMaterial.dispose();
    this.transparentMaterial.dispose();
    this.crossMaterial.dispose();
    if (this.workerBridge) {
      this.workerBridge.dispose();
    }
  }
}
