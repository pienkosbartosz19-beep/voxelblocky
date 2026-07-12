// Quick driver for real evidence (pure chunkGen path)
import { generateChunkVoxels } from '../src/game/chunkGen.ts';

const params = {
  cx: 0, cz: 0,
  seed: 424242,
  chunkSize: 16,
  worldHeight: 64,
  seaLevel: 24,
  blockToId: (b) => {
    const map = { air:0, bedrock:1, stone:2, dirt:3, grass:4, water:5, wood_oak:6, leaves_oak:7, tall_grass:8, iron_ore:9, coal_ore:10 };
    return map[b] || 0;
  }
};

const v = generateChunkVoxels(params);
const len = v.length;
const nonZero = Array.from(v).filter(x => x > 0).length;
const sample = Array.from(v.slice(0, 24));
console.log('EVIDENCE: chunkGen generateChunkVoxels REAL');
console.log('LEN=' + len + ' (expected 16384)');
console.log('NONZERO=' + nonZero);
console.log('SAMPLE=' + JSON.stringify(sample));

import fs from 'fs';
const logPath = 'C:/Users/Bartek/AppData/Local/Temp/grok-goal-100626bfc687/implementer/worker-gen-exercise.log';
fs.appendFileSync(logPath, `EVIDENCE ${new Date().toISOString()} chunkGen: LEN=${len} NONZERO=${nonZero} SAMPLE=${JSON.stringify(sample)}\n`);
console.log('APPENDED to ' + logPath);
