import { World } from './world';
import { BLOCKS } from './blocks';

export class WorldWorkerBridge {
  private worker: Worker | null = null;
  private ready = false;
  private readyPromise: Promise<void>;
  private pendingGenerate: Map<string, (voxels: Uint8Array) => void> = new Map();
  private world: World;

  constructor(world: World) {
    this.world = world;
    this.readyPromise = this.init(world);
  }

  private async init(world: World): Promise<void> {
    try {
      // Real module worker - no blob, no placeholders. The worker file contains the gen logic.
      this.worker = new Worker(new URL('./world.worker.js', import.meta.url), { type: 'module' });

      this.worker.onmessage = (ev: MessageEvent) => this.onMessage(ev);
      this.worker.onerror = (e: ErrorEvent) => {
        console.error('[WorldWorkerBridge] worker error:', e.message, e);
        // Resolve pending callbacks with empty so callers don't hang
        for (const [k, cb] of this.pendingGenerate) {
          this.pendingGenerate.delete(k);
          cb(new Uint8Array(0));
        }
      };

      // Build the block-name → id map for INIT
      const blockIds: Record<string, number> = {};
      for (const name of Object.keys(BLOCKS)) {
        blockIds[name] = world.blockToId(name as any);
      }

      this.worker.postMessage({
        type: 'INIT',
        v: 1,
        seed: world.seed,
        blockIds,
      });

      await new Promise<void>((resolve) => {
        const check = () => {
          if (this.ready) resolve();
          else setTimeout(check, 10);
        };
        check();
      });
    } catch (e) {
      console.warn('[WorldWorkerBridge] init failed, will fall back to main thread:', e);
      this.worker = null;
      this.ready = true;
    }
  }

  private onMessage(ev: MessageEvent) {
    const msg = ev.data;
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'INIT_DONE') {
      this.ready = true;
      return;
    }

    if (msg.type === 'CHUNK_GENERATED') {
      const key = `${msg.cx},${msg.cz}`;
      const cb = this.pendingGenerate.get(key);
      if (cb) {
        this.pendingGenerate.delete(key);
        // The voxels ArrayBuffer was transferred to us
        cb(new Uint8Array(msg.voxels));
      }
      return;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async waitReady(): Promise<void> {
    await this.readyPromise;
  }

  /**
   * Request chunk generation. Returns a Uint8Array (ownership transferred).
   * Resolves with an empty Uint8Array if the worker is unavailable.
   */
  generateChunk(cx: number, cz: number): Promise<Uint8Array> {
    if (!this.worker || !this.ready) {
      // Fallback to main-thread generation using the shared logic (same as worker source)
      // This ensures non-empty correct buffer even without Worker (e.g. test env)
      return Promise.resolve(this.world.generateChunk(cx, cz));
    }
    const key = `${cx},${cz}`;
    return new Promise((resolve) => {
      this.pendingGenerate.set(key, (voxels) => resolve(voxels));
      // blockIds cached in worker from INIT; send minimal to avoid bundler issues
      this.worker!.postMessage({ type: 'GENERATE', v: 1, cx, cz, seed: this.world.seed });
    });
  }

  dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = false;
  }
}

