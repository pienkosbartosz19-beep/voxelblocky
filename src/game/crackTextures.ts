// ETAP 2.2 — Procedural crack overlay textures.
//
// Generates 4 canvas-based crack textures (one per damage stage 1..4) that get
// applied to a slightly-larger-than-1 cube overlaying the block being mined.
// Stage 1 = few hairline cracks, Stage 4 = dense shattered-web pattern.
//
// Each texture is a transparent canvas with black crack lines drawn on it.
// The overlay mesh swaps textures based on BlockHealthMap.getDamageStage().

import * as THREE from 'three';

const TEX_SIZE = 32; // 32×32 — matches voxel block aesthetic

function makeCrackCanvas(stage: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);

  // Crack color: dark gray, semi-transparent so it doesn't fully black out the block
  ctx.strokeStyle = 'rgba(20, 18, 22, 0.85)';
  ctx.lineCap = 'round';

  // Deterministic PRNG so each stage looks the same every run
  let seed = stage * 9173 + 12345;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Each stage adds more cracks. We draw the cracks from all lower stages too,
  // so stage 4 includes stage 1-3 cracks plus its own — visual progression.
  const totalCracks = stage * 4;
  ctx.lineWidth = stage >= 3 ? 1.4 : 1.0;

  for (let i = 0; i < totalCracks; i++) {
    // Start point
    const sx = rng() * TEX_SIZE;
    const sy = rng() * TEX_SIZE;
    // Each crack is a polyline with 2-4 segments
    const segments = 2 + Math.floor(rng() * 3);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    let cx = sx, cy = sy;
    for (let s = 0; s < segments; s++) {
      // Crack grows in a random direction with limited step length
      const angle = rng() * Math.PI * 2;
      const len = 2 + rng() * 5;
      cx += Math.cos(angle) * len;
      cy += Math.sin(angle) * len;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Stage 3+ adds a few "impact" dots for chunk-breaking texture
  if (stage >= 3) {
    ctx.fillStyle = 'rgba(20, 18, 22, 0.6)';
    const dots = (stage - 2) * 5;
    for (let i = 0; i < dots; i++) {
      const dx = rng() * TEX_SIZE;
      const dy = rng() * TEX_SIZE;
      const r = 0.5 + rng() * 1.0;
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return c;
}

let cachedTextures: THREE.Texture[] | null = null;

/** Returns 4 CanvasTextures indexed 0..3 (crack stages 1..4). Lazy-initialized. */
export function getCrackTextures(): THREE.Texture[] {
  if (cachedTextures) return cachedTextures;
  cachedTextures = [];
  for (let stage = 1; stage <= 4; stage++) {
    const canvas = makeCrackCanvas(stage);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    // NOTE: transparent + opacity are set on the MeshBasicMaterial in use-game.ts,
    // not on the texture itself (THREE.Texture doesn't accept those properties).
    cachedTextures.push(tex);
  }
  return cachedTextures;
}

/** Dispose textures (call on game teardown). */
export function disposeCrackTextures() {
  if (cachedTextures) {
    for (const t of cachedTextures) t.dispose();
    cachedTextures = null;
  }
}
