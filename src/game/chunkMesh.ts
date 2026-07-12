import * as THREE from 'three';
import { BLOCKS, WORLD_CONFIG } from './blocks';
import { World } from './world';
import { TILES, tileUV, ATLAS_COLS, ATLAS_ROWS, TILE_SIZE } from './textureAtlas';
import type { BlockType } from './types';

const CHUNK_SIZE = WORLD_CONFIG.CHUNK_SIZE;
const WORLD_HEIGHT = WORLD_CONFIG.WORLD_HEIGHT;

// Cube face definitions: [normal, corners, side]
// Each face: 4 vertices, 2 triangles
// Face order: 0=+X(right), 1=-X(left), 2=+Y(top), 3=-Y(bottom), 4=+Z(front), 5=-Z(back)
interface FaceDef {
  dir: [number, number, number];
  corners: [number, number, number][];
  // UV mapping for each corner (in 0..1 tile space, will be remapped to atlas UVs)
  // Order matches corners[]
  tileUVs: [number, number][];
}

const FACES: FaceDef[] = [
  { // +X (right) - face index 0
    dir: [1, 0, 0],
    corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
    tileUVs: [[0, 0], [0, 1], [1, 1], [1, 0]],
  },
  { // -X (left) - face index 1
    dir: [-1, 0, 0],
    corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
    tileUVs: [[0, 0], [0, 1], [1, 1], [1, 0]],
  },
  { // +Y (top) - face index 2
    dir: [0, 1, 0],
    corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
    tileUVs: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
  { // -Y (bottom) - face index 3
    dir: [0, -1, 0],
    corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    tileUVs: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
  { // +Z (front) - face index 4
    dir: [0, 0, 1],
    corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
    tileUVs: [[0, 0], [0, 1], [1, 1], [1, 0]],
  },
  { // -Z (back) - face index 5
    dir: [0, 0, -1],
    corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
    tileUVs: [[0, 0], [0, 1], [1, 1], [1, 0]],
  },
];

// Cross faces for plants (X pattern)
const CROSS_FACES: { corners: [number, number, number][]; tileUVs: [number, number][] }[] = [
  {
    corners: [[0.15, 0, 0.15], [0.85, 0, 0.85], [0.85, 1, 0.85], [0.15, 1, 0.15]],
    tileUVs: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
  {
    corners: [[0.15, 0, 0.85], [0.85, 0, 0.15], [0.85, 1, 0.15], [0.15, 1, 0.85]],
    tileUVs: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
];

// Thin faces for torches
const TORCH_FACES: { corners: [number, number, number][]; tileUVs: [number, number][] }[] = [
  {
    corners: [[0.4, 0, 0.4], [0.6, 0, 0.6], [0.6, 1, 0.6], [0.4, 1, 0.4]],
    tileUVs: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
  {
    corners: [[0.4, 0, 0.6], [0.6, 0, 0.4], [0.6, 1, 0.4], [0.4, 1, 0.6]],
    tileUVs: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
];

// Face shading for fake ambient occlusion / directional lighting
const FACE_SHADING = [0.78, 0.78, 1.0, 0.55, 0.88, 0.88]; // +X, -X, +Y, -Y, +Z, -Z

// Bucket enum: which geometry bucket a face goes into.
// 0 = solid (opaque, full cube), 1 = leaves (alpha-tested cutout), 2 = transparent (water/glass), 3 = cross (plants)
const BUCKET_SOLID = 0;
const BUCKET_LEAVES = 1;
const BUCKET_TRANSPARENT = 2;
const BUCKET_CROSS = 3;
const NUM_BUCKETS = 4;

interface ChunkMeshData {
  positions: number[][];     // per-bucket vertex positions
  normals: number[][];
  uvs: number[][];
  colors: number[][];
  indices: number[][];
}

function newMeshData(): ChunkMeshData {
  const data: ChunkMeshData = {
    positions: [], normals: [], uvs: [], colors: [], indices: [],
  };
  for (let i = 0; i < NUM_BUCKETS; i++) {
    data.positions.push([]);
    data.normals.push([]);
    data.uvs.push([]);
    data.colors.push([]);
    data.indices.push([]);
  }
  return data;
}

function addFace(
  meshData: ChunkMeshData,
  bucket: number,
  corners: [number, number, number][],
  tileUVs: [number, number][],
  atlasUV: [number, number, number, number], // [u0, v0, u1, v1]
  normal: [number, number, number],
  shade: number, // 0..1 brightness multiplier
) {
  const startIdx = meshData.positions[bucket].length / 3;
  const r = shade, g = shade, b = shade;
  const [u0, v0, u1, v1] = atlasUV;
  const positions = meshData.positions[bucket];
  const normals = meshData.normals[bucket];
  const uvs = meshData.uvs[bucket];
  const colors = meshData.colors[bucket];
  const indices = meshData.indices[bucket];

  for (let i = 0; i < 4; i++) {
    positions.push(corners[i][0], corners[i][1], corners[i][2]);
    normals.push(normal[0], normal[1], normal[2]);
    const tu = tileUVs[i][0];
    const tv = tileUVs[i][1];
    const au = u0 + (u1 - u0) * tu;
    const av = v0 + (v1 - v0) * tv;
    uvs.push(au, av);
    colors.push(r, g, b);
  }
  indices.push(startIdx, startIdx + 1, startIdx + 2, startIdx, startIdx + 2, startIdx + 3);
}

// Resolve which tile index to use for a given block face direction.
// Returns the atlas UV rectangle [u0, v0, u1, v1].
function getFaceTileUV(bt: BlockType, faceIndex: number): [number, number, number, number] {
  const def = BLOCKS[bt];
  if (!def || !def.tiles) {
    // Fallback: use stone (NOT magenta checkerboard)
    return tileUV(TILES.STONE);
  }
  let tileIdx: number;
  if (def.tiles.all !== undefined) {
    tileIdx = def.tiles.all;
  } else {
    // faceIndex 2 = +Y (top), 3 = -Y (bottom), others = side
    if (faceIndex === 2 && def.tiles.top !== undefined) tileIdx = def.tiles.top;
    else if (faceIndex === 3 && def.tiles.bottom !== undefined) tileIdx = def.tiles.bottom;
    else if (faceIndex !== 2 && faceIndex !== 3 && def.tiles.side !== undefined) tileIdx = def.tiles.side;
    else if (def.tiles.top !== undefined) tileIdx = def.tiles.top;
    else if (def.tiles.side !== undefined) tileIdx = def.tiles.side;
    else tileIdx = TILES.STONE; // fallback to neutral stone, never magenta
  }
  // Bounds-check: if tileIdx is out of range, fall back to STONE
  if (tileIdx < 0 || tileIdx >= 256) {
    tileIdx = TILES.STONE;
  }
  return tileUV(tileIdx);
}

// Count leaf neighbors in 6-directional (face) adjacency for culling decisions.
function countLeafNeighbors(world: World, wx: number, y: number, wz: number): number {
  let count = 0;
  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  for (const d of dirs) {
    const bt = world.getBlockForMesh(wx + d[0], y + d[1], wz + d[2]);
    if (BLOCKS[bt]?.isLeaves) count++;
  }
  return count;
}

export function buildChunkMesh(world: World, cx: number, cz: number): {
  solid: THREE.BufferGeometry | null;
  leaves: THREE.BufferGeometry | null;
  transparent: THREE.BufferGeometry | null;
  cross: THREE.BufferGeometry | null;
} {
  const meshData = newMeshData();
  const baseX = cx * CHUNK_SIZE;
  const baseZ = cz * CHUNK_SIZE;

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        const wx = baseX + lx;
        const wz = baseZ + lz;
        const bt = world.getBlockForMesh(wx, y, wz);
        if (bt === 'air') continue;

        const def = BLOCKS[bt];

        // Cross-shape plants
        if (def.variant === 'cross') {
          const atlasUV = getFaceTileUV(bt, -1);
          for (const face of CROSS_FACES) {
            const corners = face.corners.map(c => [c[0] + lx, c[1] + y, c[2] + lz]) as [number, number, number][];
            addFace(meshData, BUCKET_CROSS, corners, face.tileUVs, atlasUV, [0, 1, 0], 1.0);
            const reversedCorners = [...corners].reverse() as [number, number, number][];
            addFace(meshData, BUCKET_CROSS, reversedCorners, face.tileUVs, atlasUV, [0, 1, 0], 1.0);
          }
          continue;
        }

        // Thin (torch)
        if (def.variant === 'thin') {
          const atlasUV = getFaceTileUV(bt, -1);
          for (const face of TORCH_FACES) {
            const corners = face.corners.map(c => [c[0] + lx, c[1] + y, c[2] + lz]) as [number, number, number][];
            addFace(meshData, BUCKET_TRANSPARENT, corners, face.tileUVs, atlasUV, [0, 1, 0], 1.0);
            const reversedCorners = [...corners].reverse() as [number, number, number][];
            addFace(meshData, BUCKET_TRANSPARENT, reversedCorners, face.tileUVs, atlasUV, [0, 1, 0], 1.0);
          }
          continue;
        }

        const isLeaf = !!def.isLeaves;

        // Cube faces - check neighbors for culling
        for (let f = 0; f < 6; f++) {
          const face = FACES[f];
          const nx = wx + face.dir[0];
          const ny = y + face.dir[1];
          const nz = wz + face.dir[2];
          const neighbor = world.getBlockForMesh(nx, ny, nz);
          const neighborDef = BLOCKS[neighbor];

          // Determine if face should be rendered
          if (isLeaf) {
            // LEAVES: render face if neighbor is air, OR neighbor is transparent-non-leaf,
            // OR neighbor is leaf but only if it's at the edge of the cluster (fewer than
            // 5 leaf neighbors means we're on the surface of the cluster).
            // Internal leaves (≥5 leaf neighbors) cull shared faces to save geometry.
            if (neighborDef.isLeaves) {
              // Both this and neighbor are leaves.
              // Only render the face if we're near the surface of the cluster (use this
              // block's leaf-neighbor count as a proxy).
              const myLeafN = countLeafNeighbors(world, wx, y, wz);
              if (myLeafN >= 5) continue; // interior of cluster: skip face
              // else fall through to render
            } else if (neighbor !== 'air' && neighborDef.solid && !neighborDef.transparent) {
              // Opaque solid neighbor hides our face
              continue;
            }
            // else: air or transparent non-leaf neighbor → render face
          } else if (def.transparent) {
            // Water/glass: render face if neighbor is air OR different transparent block
            if (neighbor === bt) continue;
            if (neighborDef.solid && !neighborDef.transparent) continue;
          } else {
            // Opaque: skip if neighbor is solid and opaque
            if (neighbor !== 'air' && !neighborDef.transparent && neighborDef.solid) continue;
            // Don't cull opaque-vs-leaves: leaves are alpha-tested so the opaque face
            // behind them stays visible through the gaps. This is intentional.
          }

          const atlasUV = getFaceTileUV(bt, f);
          const corners = face.corners.map(c => [c[0] + lx, c[1] + y, c[2] + lz]) as [number, number, number][];
          const bucket = isLeaf ? BUCKET_LEAVES : (def.transparent ? BUCKET_TRANSPARENT : BUCKET_SOLID);
          addFace(meshData, bucket, corners, face.tileUVs, atlasUV, face.dir, FACE_SHADING[f]);
        }
      }
    }
  }

  const solid = meshData.positions[BUCKET_SOLID].length > 0
    ? buildGeometry(meshData.positions[BUCKET_SOLID], meshData.normals[BUCKET_SOLID], meshData.uvs[BUCKET_SOLID], meshData.colors[BUCKET_SOLID], meshData.indices[BUCKET_SOLID])
    : null;
  const leaves = meshData.positions[BUCKET_LEAVES].length > 0
    ? buildGeometry(meshData.positions[BUCKET_LEAVES], meshData.normals[BUCKET_LEAVES], meshData.uvs[BUCKET_LEAVES], meshData.colors[BUCKET_LEAVES], meshData.indices[BUCKET_LEAVES])
    : null;
  const transparent = meshData.positions[BUCKET_TRANSPARENT].length > 0
    ? buildGeometry(meshData.positions[BUCKET_TRANSPARENT], meshData.normals[BUCKET_TRANSPARENT], meshData.uvs[BUCKET_TRANSPARENT], meshData.colors[BUCKET_TRANSPARENT], meshData.indices[BUCKET_TRANSPARENT])
    : null;
  const cross = meshData.positions[BUCKET_CROSS].length > 0
    ? buildGeometry(meshData.positions[BUCKET_CROSS], meshData.normals[BUCKET_CROSS], meshData.uvs[BUCKET_CROSS], meshData.colors[BUCKET_CROSS], meshData.indices[BUCKET_CROSS])
    : null;

  return { solid, leaves, transparent, cross };
}

function buildGeometry(
  positions: number[],
  normals: number[],
  uvs: number[],
  colors: number[],
  indices: number[],
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  return geo;
}

// Helper to find adjacent chunks that need to be re-meshed
export function getAffectedChunks(x: number, z: number, chunkSize: number): Array<[number, number]> {
  const cx = Math.floor(x / chunkSize);
  const cz = Math.floor(z / chunkSize);
  const lx = ((x % chunkSize) + chunkSize) % chunkSize;
  const lz = ((z % chunkSize) + chunkSize) % chunkSize;
  const result: Array<[number, number]> = [[cx, cz]];
  if (lx === 0) result.push([cx - 1, cz]);
  if (lx === chunkSize - 1) result.push([cx + 1, cz]);
  if (lz === 0) result.push([cx, cz - 1]);
  if (lz === chunkSize - 1) result.push([cx, cz + 1]);
  return result;
}
