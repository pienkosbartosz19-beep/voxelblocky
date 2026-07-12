import { generateChunkVoxels } from "./chunkGen";

let blockIdMap = null;

self.onmessage = (e) => {
  const { type, cx, cz, seed, blockIds } = e.data || {};
  if (type === "INIT") {
    blockIdMap = blockIds || {};
    self.postMessage({ type: "INIT_DONE" });
    return;
  }
  if (type === "GENERATE") {
    const voxels = generateChunkVoxels({
      cx, cz,
      seed: seed || 424242,
      chunkSize: 16,
      worldHeight: 64,
      seaLevel: 24,
      blockToId: (b) => (blockIdMap ? blockIdMap[b] || 0 : 0)
    });
    self.postMessage({ type: "CHUNK_GENERATED", cx, cz, voxels }, [voxels.buffer]);
  }
};
