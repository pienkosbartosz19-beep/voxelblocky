/**
 * src/game/spatialCrafting.ts
 * FULL PROTOTYPE for Faza 4 — Physical Spatial Crafting at Workstations
 *
 * Ported & adapted from GLM ETAP-2 proven implementation (8 recipes, greedy AABB scan, position reuse prevention).
 * 
 * PROMETEUSZ IDENTITY:
 * - Składniki układa się w świecie (nie w menu)
 * - Prawdziwe rzemiosło przy stanowisku (anvil, forge, workbench, furnace)
 * - Konsumpcja bloków + output do ekwipunku
 * - Read-only panel pomocy (Q) zamiast interaktywnego craft menu
 */

import { BlockType } from './types';
import { SeededPRNG } from './prng';

export interface SpatialRecipe {
  station: BlockType;
  name: string;
  ingredients: BlockType[];
  output: BlockType;
  radius: number;
}

export const SPATIAL_RECIPES: SpatialRecipe[] = [
  { station: 10, name: 'Kowadło → Stal (2× żelazo + węgiel)', ingredients: [11, 11, 12], output: 13, radius: 2 },
  { station: 10, name: 'Kowadło → Bloki miedzi (2× ruda miedzi)', ingredients: [14, 14], output: 15, radius: 2 },
  { station: 16, name: 'Stół warsztatowy → Deski', ingredients: [3], output: 4, radius: 2 },
  { station: 16, name: 'Stół warsztatowy → Skrzynia (2× deski)', ingredients: [4, 4], output: 17, radius: 2 },
  { station: 18, name: 'Piec → Szkło (piasek + węgiel)', ingredients: [19, 12], output: 20, radius: 2 },
  { station: 18, name: 'Piec → Cegła (glina + węgiel)', ingredients: [21, 12], output: 22, radius: 2 },
  { station: 23, name: 'Kuźnia → Bloki żelaza (ruda + węgiel)', ingredients: [11, 12], output: 24, radius: 2 },
  { station: 23, name: 'Kuźnia → Bloki miedzi (ruda miedzi + węgiel)', ingredients: [14, 12], output: 15, radius: 2 }
];

export const WORKSTATION_MAP: Record<number, BlockType> = { 10: 10, 16: 16, 18: 18, 23: 23 };

export function isWorkstation(blockType: BlockType): boolean {
  return Object.values(WORKSTATION_MAP).includes(blockType);
}

export function trySpatialCraft(
  stationPos: { x: number; y: number; z: number },
  getBlock: (x: number, y: number, z: number) => BlockType,
  setBlock: (x: number, y: number, z: number, type: BlockType) => void,
  stationType: BlockType
): { success: boolean; output?: BlockType; consumed: Array<{x:number,y:number,z:number}>; message: string } {
  
  const recipe = SPATIAL_RECIPES.find(r => r.station === stationType);
  if (!recipe) return { success: false, consumed: [], message: 'Nieznane stanowisko.' };

  const r = recipe.radius || 2;
  const candidates: Array<{x:number,y:number,z:number, type: BlockType}> = [];
  for (let x = stationPos.x - r; x <= stationPos.x + r; x++) {
    for (let y = stationPos.y - r; y <= stationPos.y + r; y++) {
      for (let z = stationPos.z - r; z <= stationPos.z + r; z++) {
        const t = getBlock(x, y, z);
        if (t !== 0) candidates.push({x, y, z, type: t});
      }
    }
  }

  const consumed: Array<{x:number,y:number,z:number}> = [];
  const used = new Set<string>();

  for (const ing of recipe.ingredients) {
    const match = candidates.find(c => c.type === ing && !used.has(`${c.x},${c.y},${c.z}`));
    if (!match) {
      return { success: false, consumed: [], message: `Brakuje składnika: ${ing}` };
    }
    used.add(`${match.x},${match.y},${match.z}`);
    consumed.push({x: match.x, y: match.y, z: match.z});
  }

  for (const pos of consumed) setBlock(pos.x, pos.y, pos.z, 0);

  return { success: true, output: recipe.output, consumed, message: `✓ Utworzono: ${recipe.name}` };
}

export function getRecipeHelpText(): string {
  return SPATIAL_RECIPES.map(r => 
    `${r.name} | promień ${r.radius} | ${r.ingredients.length} składniki → ${r.output}`
  ).join('\n');
}
