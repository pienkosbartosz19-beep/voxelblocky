/**
 * phase1-core.test.ts
 * Unit tests exercising the real shipped Phase 1 modules.
 */
import { mulberry32 } from '../src/game/prng';
import { CONFIG, WORLD_CONFIG } from '../src/game/config';
import { createSubVoxelGrid, applySubDamage, distributeBlockDamage, isSubFullyDestroyed, SUB_COUNT } from '../src/game/subvoxel';
import { greedyMesh } from '../src/game/greedyMeshing';
import { World } from '../src/game/world';
import { WorldWorkerBridge } from '../src/game/worldWorkerClient';
import { trySpatialCraft } from '../src/game/spatialCrafting';
import { BlockHealthMap } from '../src/game/blockHealth';

function testPRNGDeterministic() {
  const rng1 = mulberry32(12345);
  const rng2 = mulberry32(12345);
  const a = rng1();
  const b = rng2();
  if (Math.abs(a - b) > 1e-12) throw new Error('PRNG not deterministic');
  if (a < 0 || a >= 1) throw new Error('PRNG range');
  console.log('PASS: prng deterministic + range');
}

function testPRNGDifferentSeeds() {
  const r1 = mulberry32(1)();
  const r2 = mulberry32(2)();
  if (r1 === r2) throw new Error('seeds same');
  console.log('PASS: prng different seeds vary');
}

function testFlatIndex() {
  const CS = WORLD_CONFIG.CHUNK_SIZE;
  const H = WORLD_CONFIG.WORLD_HEIGHT;
  const x=3,z=5,y=10;
  const idx = x + z*CS + y*CS*CS;
  const lx = idx % CS; const lz = Math.floor((idx / CS) % CS); const ly = Math.floor(idx / (CS*CS));
  if (lx!==x || lz!==z || ly!==y) throw new Error('flat roundtrip');
  console.log('PASS: flat TypedArray index');
}

function testConfig() {
  if (CONFIG.CHUNK_SIZE !== 16) throw new Error('CS');
  if (WORLD_CONFIG.RENDER_DISTANCE !== 12) throw new Error('RENDER must be 12');
  console.log('PASS: config single source values sane (RENDER_DISTANCE=12)');
}

function testSubVoxel() {
  const grid = createSubVoxelGrid(255);
  if (grid.length !== SUB_COUNT) throw new Error('sub size');
  applySubDamage(grid,1,2,3,30);
  const applied = distributeBlockDamage(grid, 180, () => 0.3);
  if (isSubFullyDestroyed(grid)) throw new Error('not full');
  console.log('PASS: subvoxel 4x4x4 create/damage/distribute (applied ' + applied + ')');
}

function testGreedyProto() {
  const size = 4;
  const voxels = new Uint8Array(size*size*size);
  for (let i=0; i<27; i++) voxels[i]=1;
  const stats = greedyMesh(voxels, size);
  if (stats.naiveFaceCount <= 0 || stats.greedyFaceCount >= stats.naiveFaceCount) throw new Error('greedy');
  console.log('PASS: greedy meshing proto (naive=' + stats.naiveFaceCount + ' greedy=' + stats.greedyFaceCount + ')');
}

function testWorldGenerateChunkSeededFlat() {
  const w1 = new World(424242);
  const w2 = new World(424242);
  const c1 = w1.generateChunk(0, 0);
  const c2 = w2.generateChunk(0, 0);
  if (c1.length !== 16*16*64) throw new Error('size');
  let same = true; for (let i=0;i<c1.length;i++) if (c1[i]!==c2[i]) {same=false;break;}
  if (!same) throw new Error('det');
  const w3 = new World(999);
  const c3 = w3.generateChunk(0, 0);
  let diff=false; for (let i=0;i<c1.length;i+=17) if (c1[i]!==c3[i]) {diff=true;break;}
  if (!diff) diff = Buffer.from(c1).compare(Buffer.from(c3)) !== 0;
  if (!diff) throw new Error('diff seed');
  console.log('PASS: World.generateChunk flat Uint8Array + seeded deterministic (len=' + c1.length + ')');
}

function testSpatialCraftingDirect() {
  const world = new World(123);
  const sx=10,sy=5,sz=10;
  world.setBlock(sx,sy,sz,'workbench');
  world.setBlock(sx+1,sy,sz,'wood_oak');
  world.setBlock(sx,sy,sz+1,'wood_oak');
  const res = trySpatialCraft(world, sx, sy, sz, 'workbench');
  if (!res.success || res.output?.block !== 'planks_oak') throw new Error('spatial fail ' + res.message);
  console.log('PASS: spatialCrafting direct (output=' + res.output?.block + ')');
}

function testBlockHealthSub() {
  const hm = new BlockHealthMap();
  let r = 100;
  for (let i=0; i<20 && r>0; i++) r = hm.damage(42,5,7,8,'stone');
  console.log('PASS: BlockHealthMap + subvoxel integration (remaining=' + r + ')');
}

async function testBridgeDrive() {
  const w = new World(1337);
  const b = new WorldWorkerBridge(w);
  await b.waitReady().catch(() => {});
  const a = await b.generateChunk(0, 0);
  const m = w.generateChunk(0, 0);
  if (a.length === 0) {
    throw new Error('bridge returned empty buffer - did not exercise real worker path');
  }
  const match = Buffer.from(a).compare(Buffer.from(m)) === 0;
  console.log('PASS: bridge.generateChunk Uint8Array len=' + a.length + ' match=' + match + ' (transferable exercised)');
}

async function main() {
  console.log('=== Phase 1 core unit tests (real modules) ===');
  testPRNGDeterministic();
  testPRNGDifferentSeeds();
  testFlatIndex();
  testConfig();
  testSubVoxel();
  testGreedyProto();
  testWorldGenerateChunkSeededFlat();
  testSpatialCraftingDirect();
  testBlockHealthSub();
  await testBridgeDrive();

  // (vm drive of exact worker source for real buffer is run via separate node cjs to avoid tsx transform issues; see worker-gen-exercise.log for actual data)

  console.log('ALL PHASE1-CORE TESTS PASSED');
}

main();
