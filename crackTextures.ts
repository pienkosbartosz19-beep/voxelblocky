/**
 * src/game/crackTextures.ts
 * Procedural 4-stage crack overlays (32x32 CanvasTexture) — deterministic via SeededPRNG
 *
 * From GLM ETAP-2 VLM-verified:
 * - Stage 1: 4 hairline cracks
 * - Stage 4: 16 cracks + impact dots
 * - Used as overlay on damaged blocks (toggle visibility in frame loop)
 * - Zero external assets — pure procedural, perfect for WebGL
 */

import * as THREE from 'three';
import { SeededPRNG } from './prng';

export function createCrackTexture(stage: number, seed: number = 1337): THREE.CanvasTexture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { alpha: true })!;
  
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';

  const prng = new SeededPRNG(seed + stage * 17);

  const numCracks = 4 + stage * 4; // 4,8,12,16
  for (let i = 0; i < numCracks; i++) {
    const x1 = prng.nextFloat(2, size-2);
    const y1 = prng.nextFloat(2, size-2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    
    let x = x1, y = y1;
    const segments = 3 + prng.nextInt(0, 2);
    for (let s = 0; s < segments; s++) {
      x += prng.nextFloat(-8, 8);
      y += prng.nextFloat(-8, 8);
      ctx.lineTo(Math.max(1, Math.min(size-1, x)), Math.max(1, Math.min(size-1, y)));
    }
    ctx.stroke();
  }

  // Impact dots on higher stages
  if (stage >= 2) {
    const dots = stage * 3;
    for (let d = 0; d < dots; d++) {
      const dx = prng.nextFloat(4, size-4);
      const dy = prng.nextFloat(4, size-4);
      ctx.beginPath();
      ctx.arc(dx, dy, prng.nextFloat(1, 2.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

// Pre-generate 4 stages (call once at init)
export const CRACK_TEXTURES: THREE.CanvasTexture[] = [0,1,2,3].map(s => createCrackTexture(s));
