// ETAP 2.3 — Spatial crafting prototype.
//
// Replaces the traditional crafting-menu interaction with a spatial one:
//   1. Player places a workstation block (anvil / workbench / furnace / forge).
//   2. Player drops raw-material blocks adjacent to (or within radius of) the station.
//   3. Player right-clicks the station. The game scans the surrounding radius,
//      verifies required materials are present, consumes one of each, and spawns
//      the output either at the station's position or in the player's inventory.
//
// This is the "Lay of the Land" crafting model: no menu UI, world is the UI.
//
// The implementation is intentionally a PROTOTYPE for ETAP 2:
//   - Only a small recipe set is wired up (anvil + iron → steel, workbench +
//     wood → planks, furnace + sand + coal → glass).
//   - Recipes specify a search radius; we scan that AABB around the station.
//   - We consume ONE block per ingredient (not the full count the recipe asks
//     for, to keep the prototype simple — easy to extend later).

import { BLOCKS } from './blocks';
import type { BlockType } from './types';
import type { World } from './world';

export type WorkstationType = 'workbench' | 'furnace' | 'anvil' | 'forge';

export interface SpatialRecipe {
  id: string;
  station: WorkstationType;
  ingredients: BlockType[];        // blocks that must be present in radius
  output: { block: BlockType; count: number };
  radius: number;                  // search AABB radius around the station
  message: string;                 // shown on success
  consumePerIngredient?: number;   // default 1
}

// Prototype recipe set — designed to demonstrate the spatial crafting flow
// without needing a full recipe DB. Each recipe maps a station + nearby raw
// materials to an output that materializes in the player's inventory.
export const SPATIAL_RECIPES: SpatialRecipe[] = [
  {
    id: 'anvil_steel',
    station: 'anvil',
    ingredients: ['iron_block', 'iron_block', 'coal_block'],
    output: { block: 'steel_block', count: 1 },
    radius: 2,
    message: 'Wykowano blok stali z żelaza i węgla',
  },
  {
    id: 'anvil_iron_to_copper',
    station: 'anvil',
    ingredients: ['copper_ore', 'copper_ore'],
    output: { block: 'copper_block', count: 1 },
    radius: 2,
    message: 'Wykowano miedziany blok z rudy miedzi',
  },
  {
    id: 'workbench_planks',
    station: 'workbench',
    ingredients: ['wood_oak'],
    output: { block: 'planks_oak', count: 4 },
    radius: 2,
    message: 'Rozłużono dębowe kłody na deski',
  },
  {
    id: 'workbench_chest',
    station: 'workbench',
    ingredients: ['planks_oak', 'planks_oak'],
    output: { block: 'chest', count: 1 },
    radius: 2,
    message: 'Sklecono skrzynię z desek',
  },
  {
    id: 'furnace_glass',
    station: 'furnace',
    ingredients: ['sand', 'coal_block'],
    output: { block: 'glass', count: 2 },
    radius: 2,
    message: 'Wytapiono szkło z piasku',
  },
  {
    id: 'furnace_brick',
    station: 'furnace',
    ingredients: ['clay', 'coal_block'],
    output: { block: 'brick', count: 2 },
    radius: 2,
    message: 'Wypalono cegły z gliny',
  },
  {
    id: 'forge_iron_ingot',
    station: 'forge',
    ingredients: ['iron_ore', 'coal_block'],
    output: { block: 'iron_block', count: 1 },
    radius: 2,
    message: 'Wytapiono blok żelaza z rudy',
  },
  {
    id: 'forge_copper_ingot',
    station: 'forge',
    ingredients: ['copper_ore', 'coal_block'],
    output: { block: 'copper_block', count: 1 },
    radius: 2,
    message: 'Wytapiono blok miedzi z rudy',
  },
];

export interface SpatialCraftResult {
  success: boolean;
  message: string;
  output?: { block: BlockType; count: number };
  consumedPositions: Array<{ x: number; y: number; z: number; block: BlockType }>;
}

/**
 * Try every recipe matching `stationType` in turn. The first one whose
 * ingredients are all present (in the required count) within the recipe's
 * radius around (sx, sy, sz) is executed: ingredients are consumed (set to
 * 'air'), and the result is returned so the caller can spawn it in inventory
 * (or on the ground).
 *
 * Returns the result of the first successful recipe, or a failure object with
 * a hint about which recipe was closest (for UI feedback).
 */
export function trySpatialCraft(
  world: World,
  sx: number,
  sy: number,
  sz: number,
  stationType: WorkstationType,
): SpatialCraftResult {
  const candidates = SPATIAL_RECIPES.filter(r => r.station === stationType);

  for (const recipe of candidates) {
    const found = findIngredients(world, sx, sy, sz, recipe.radius, recipe.ingredients);
    if (found.length === recipe.ingredients.length) {
      // Consume each found ingredient block (set to air)
      const consumed: Array<{ x: number; y: number; z: number; block: BlockType }> = [];
      for (const match of found) {
        const bt = world.getBlock(match.x, match.y, match.z);
        world.setBlock(match.x, match.y, match.z, 'air');
        consumed.push({ x: match.x, y: match.y, z: match.z, block: bt });
      }
      return {
        success: true,
        message: recipe.message,
        output: recipe.output,
        consumedPositions: consumed,
      };
    }
  }

  // Failure: produce a hint message so the player knows what's missing
  if (candidates.length === 0) {
    return {
      success: false,
      message: `Ta stacja (${stationType}) nie ma żadnych receptur przestrzennych`,
      consumedPositions: [],
    };
  }
  // Find the recipe with the most matched ingredients for the hint
  let bestRecipe = candidates[0];
  let bestMatched = 0;
  for (const r of candidates) {
    const found = findIngredients(world, sx, sy, sz, r.radius, r.ingredients);
    if (found.length > bestMatched) {
      bestMatched = found.length;
      bestRecipe = r;
    }
  }
  const missing = bestRecipe.ingredients.length - bestMatched;
  return {
    success: false,
    message: `Brakuje ${missing} składnika(ów) w promieniu ${bestRecipe.radius} bloków od ${BLOCKS[bestRecipe.station === 'anvil' ? 'anvil' : bestRecipe.station === 'workbench' ? 'workbench' : bestRecipe.station === 'furnace' ? 'furnace' : 'forge'].name}. Wymagane: ${bestRecipe.ingredients.map(i => BLOCKS[i].name).join(', ')}`,
    consumedPositions: [],
  };
}

/**
 * Scan an AABB of radius `radius` around (sx, sy, sz) and return one position
 * per required ingredient (in order). If a required ingredient cannot be
 * found, the returned array is shorter than `ingredients.length`.
 *
 * Implementation note: we scan once per ingredient, marking matched positions
 * as "used" so the same block can't satisfy two ingredient slots.
 */
function findIngredients(
  world: World,
  sx: number,
  sy: number,
  sz: number,
  radius: number,
  ingredients: BlockType[],
): Array<{ x: number; y: number; z: number }> {
  // Snapshot all blocks in the AABB
  const positions: Array<{ x: number; y: number; z: number; block: BlockType }> = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue; // skip station itself
        const x = sx + dx, y = sy + dy, z = sz + dz;
        const bt = world.getBlock(x, y, z);
        if (bt !== 'air') positions.push({ x, y, z, block: bt });
      }
    }
  }

  // Match ingredients greedily, marking positions as used
  const used = new Set<number>();
  const matches: Array<{ x: number; y: number; z: number }> = [];
  for (const ing of ingredients) {
    let foundIdx = -1;
    for (let i = 0; i < positions.length; i++) {
      if (used.has(i)) continue;
      if (positions[i].block === ing) {
        foundIdx = i;
        break;
      }
    }
    if (foundIdx === -1) return matches; // missing this ingredient
    used.add(foundIdx);
    matches.push({ x: positions[foundIdx].x, y: positions[foundIdx].y, z: positions[foundIdx].z });
  }
  return matches;
}

/** Returns true if `bt` is a workstation block (has the `workstation` flag set). */
export function isWorkstation(bt: BlockType): boolean {
  const def = BLOCKS[bt];
  return !!def?.workstation;
}

/** Returns the workstation type for a block, or null if it isn't one. */
export function getWorkstationType(bt: BlockType): WorkstationType | null {
  const def = BLOCKS[bt];
  return def?.workstation ?? null;
}
