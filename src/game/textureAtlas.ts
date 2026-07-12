// Procedural texture atlas generator - builds a pixel-art atlas on a canvas at startup.
// Atlas: 16x16 grid of 16x16 pixel tiles = 256x256 total.
// Tiles are addressed by integer index 0..255. Tile 0 is reserved as "missing".

import * as THREE from 'three';

export const TILE_SIZE = 16;
export const ATLAS_COLS = 16;
export const ATLAS_ROWS = 16;
export const ATLAS_W = TILE_SIZE * ATLAS_COLS; // 256
export const ATLAS_H = TILE_SIZE * ATLAS_ROWS; // 256

// Tile indices - single source of truth for the entire game
export const TILES = {
  // Row 0 - terrain basics
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  COBBLESTONE: 4,
  SAND: 5,
  BEDROCK: 6,
  CLAY: 7,
  GRAVEL: 8,
  SNOW: 9,
  SNOW_GRASS_TOP: 10,
  SNOW_GRASS_SIDE: 11,
  ICE: 12,
  WATER: 13,
  MOSSY_STONE: 14,
  MOSSY_COBBLE: 15,

  // Row 1 - ores & minerals
  COAL_ORE: 16,
  IRON_ORE: 17,
  COPPER_ORE: 18,
  GOLD_ORE: 19,
  DIAMOND_ORE: 20,
  GRANITE: 21,
  MARBLE: 22,
  SLATE: 23,
  RED_SANDSTONE: 24,
  SANDSTONE: 25,
  OBSIDIAN: 26,
  TERRACOTTA: 27,
  CHARCOAL_BLOCK: 28,
  SULFUR_ORE: 29,
  MITHRIL_ORE: 30,
  BEDROCK_DARK: 31,

  // Row 2 - wood & trees (oak = "dąb")
  WOOD_OAK_SIDE: 32,
  WOOD_OAK_TOP: 33,
  LEAVES_OAK: 34,
  PLANKS_OAK: 35,
  // Pine = "sosna"
  WOOD_PINE_SIDE: 36,
  WOOD_PINE_TOP: 37,
  LEAVES_PINE: 38,
  PLANKS_PINE: 39,
  // Spruce = "świerk"
  WOOD_SPRUCE_SIDE: 40,
  WOOD_SPRUCE_TOP: 41,
  LEAVES_SPRUCE: 42,
  PLANKS_SPRUCE: 43,
  // Birch = "brzoza"
  WOOD_BIRCH_SIDE: 44,
  WOOD_BIRCH_TOP: 45,
  LEAVES_BIRCH: 46,
  PLANKS_BIRCH: 47,

  // Row 3 - autumn leaves & special foliage
  LEAVES_AUTUMN_YELLOW: 48,
  LEAVES_AUTUMN_ORANGE: 49,
  LEAVES_AUTUMN_RED: 50,
  LEAVES_AUTUMN_MIXED: 51,
  LEAVES_DRY: 52,
  BUSH: 53,
  BUSH_BERRY: 54,
  FERN: 55,
  DEAD_BUSH: 56,
  TALL_GRASS: 57,
  REED: 58,
  CACTUS_SIDE: 59,
  CACTUS_TOP: 60,
  PUMPKIN_SIDE: 61,
  PUMPKIN_TOP: 62,
  PUMPKIN_FACE: 63,

  // Row 4 - flowers & plants
  FLOWER_RED: 64,
  FLOWER_YELLOW: 65,
  FLOWER_WHITE: 66,
  FLOWER_PURPLE: 67,
  FLOWER_BLUE: 68,
  MUSHROOM_BROWN: 69,
  MUSHROOM_RED: 70,
  LAVENDER: 71,
  BERRY_BUSH: 72,
  SAPLING_OAK: 73,
  SAPLING_PINE: 74,
  SAPLING_BIRCH: 75,
  TALL_REED: 76,
  WATER_LILY: 77,
  VINES: 78,
  LILY_PAD: 79,

  // Row 5 - crafted blocks
  GLASS: 80,
  GLASS_TINTED: 81,
  TORCH: 82,
  LANTERN: 83,
  BRICK: 84,
  BRICK_MOSSY: 85,
  SANDSTONE_BRICK: 86,
  STONE_BRICK: 87,
  STONE_BRICK_MOSSY: 88,
  COBBLE_WALL: 89,
  WOOD_PLANK_DARK: 90,
  WOOD_BEAM: 91,
  THATCH: 92,
  STRAW_BALE: 93,
  CLAY_BRICK: 94,
  ROOF_TILE: 95,

  // Row 6 - workstations
  WORKBENCH_TOP: 96,
  WORKBENCH_SIDE: 97,
  WORKBENCH_FRONT: 98,
  FURNACE_FRONT: 99,
  FURNACE_SIDE: 100,
  FURNACE_TOP: 101,
  ANVIL_TOP: 102,
  ANVIL_SIDE: 103,
  FORGE_FRONT: 104,
  CHEST_TOP: 105,
  CHEST_SIDE: 106,
  CHEST_FRONT: 107,
  BOOKSHELF: 108,
  CRATE: 109,
  BARREL: 110,
  LOOM: 111,

  // Row 7 - metals & metalwork
  COPPER_BLOCK: 112,
  BRONZE_BLOCK: 113,
  IRON_BLOCK: 114,
  STEEL_BLOCK: 115,
  GOLD_BLOCK: 116,
  SILVER_BLOCK: 117,
  MITHRIL_BLOCK: 118,
  CHARCOAL: 119,
  SLAG: 120,
  CRACKED_STONE: 121,
  MOSS_DIRT: 122,
  ICE_PACKED: 123,
  ICE_BLUE: 124,
  LAVA: 125,
  LAVA_BRIGHT: 126,
  MAGMA: 127,

  // Row 8 - paths & decoration
  PATH_DIRT: 128,
  PATH_STONE: 129,
  PATH_COBBLE: 130,
  PLANK_FLOOR: 131,
  CARPET_RED: 132,
  CARPET_BLUE: 133,
  CARPET_GREEN: 134,
  CURTAIN: 135,
  WINDOW: 136,
  DOOR_WOOD: 137,
  DOOR_IRON: 138,
  LADDER: 139,
  FENCE_WOOD: 140,
  FENCE_STONE: 141,
  SIGN: 142,
  BANNER: 143,

  // Row 9 - nature extras
  ROCK_MOSS: 144,
  ROCK_SMALL: 145,
  BOULDER: 146,
  STALAGMITE: 147,
  CRYSTAL_BLUE: 148,
  CRYSTAL_PURPLE: 149,
  CRYSTAL_GREEN: 150,
  GEODE: 151,
  PINECONE: 152,
  FALLEN_LEAVES: 153,
  LEAF_PILE: 154,
  ROOT: 155,
  STUMP: 156,
  BARK_MOSS: 157,
  BARK_DRY: 158,
  BIRCH_BARK_PEELED: 159,

  // Row 10 - seasonal variants
  GRASS_AUTUMN_TOP: 160,
  GRASS_AUTUMN_SIDE: 161,
  GRASS_WITHERED_TOP: 162,
  GRASS_WITHERED_SIDE: 163,
  GRASS_SPRING_TOP: 164,
  GRASS_SPRING_SIDE: 165,
  LEAVES_CHERRY: 166,
  LEAVES_APPLE: 167,
  LEAVES_PEAR: 168,
  LEAVES_PLUM: 169,
  LEAVES_WILLOW: 170,
  WILLOW_BRANCH: 171,
  BAMBOO: 172,
  BAMBOO_LEAF: 173,
  RICE: 174,
  WHEAT: 175,

  // Row 11 - food & farmed
  WHEAT_GROWN: 176,
  WHEAT_SEEDLING: 177,
  CARROT: 178,
  POTATO: 179,
  BEETROOT: 180,
  PUMPKIN_STEM: 181,
  MELON: 182,
  MELON_STEM: 183,
  BREAD: 184,
  CHEESE: 185,
  HONEYCOMB: 186,
  HONEY_BLOCK: 187,
  SUGAR: 188,
  FLOUR: 189,
  NEST: 190,
  HAY: 191,

  // Row 12 - misc ground
  MUD: 192,
  MUD_DRY: 193,
  SAND_WET: 194,
  DIRT_PATH: 195,
  ICE_DIRTY: 196,
  ASH: 197,
  SCORCHED: 198,
  SNOW_DIRTY: 199,
  PEBBLES: 200,
  PEBBLES_SNOW: 201,
  ICE_CRACK: 202,
  CRACK: 203,
  GRASS_TUFT: 204,
  CLOVER: 205,
  MOSS_PATCH: 206,
  DIRT_DARK: 207,

  // Row 13 - more minerals
  COAL_BLOCK: 208,
  IRON_BLOCK_RAW: 209,
  COPPER_BLOCK_RAW: 210,
  TIN_ORE: 211,
  ZINC_ORE: 212,
  SALT_ORE: 213,
  SALT_BLOCK: 214,
  AMETHYST: 215,
  QUARTZ: 216,
  GARNET: 217,
  JADE: 218,
  ONYX: 219,
  PEARL: 220,
  CORAL_RED: 221,
  CORAL_PINK: 222,
  CORAL_TUBE: 223,

  // Row 14 - more building
  TILE_ROOF_RED: 224,
  TILE_ROOF_BLUE: 225,
  TILE_ROOF_GREEN: 226,
  TILE_ROOF_GRAY: 227,
  SHUTTER: 228,
  WINDOW_CROSS: 229,
  WINDOW_ARCHED: 230,
  COLUMN_TOP: 231,
  COLUMN_MID: 232,
  COLUMN_BASE: 233,
  ARCH: 234,
  STAINED_RED: 235,
  STAINED_BLUE: 236,
  STAINED_GREEN: 237,
  STAINED_YELLOW: 238,
  STAINED_GLASS: 239,

  // Row 15 - reserved / debug
  MISSING: 240,
  GRID: 241,
  DEBUG_A: 242,
  DEBUG_B: 243,
  DEBUG_C: 244,
  DEBUG_D: 245,
  DEBUG_E: 246,
  DEBUG_F: 247,
  DEBUG_G: 248,
  DEBUG_H: 249,
  DEBUG_I: 250,
  DEBUG_J: 251,
  DEBUG_K: 252,
  DEBUG_L: 253,
  DEBUG_M: 254,
  DEBUG_N: 255,
} as const;

// Helper: deterministic PRNG per tile (so each tile is stable across reloads)
function tileRng(tileIndex: number) {
  let a = (tileIndex * 2654435761) >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(a[0] * (1 - t) + b[0] * t),
    Math.round(a[1] * (1 - t) + b[1] * t),
    Math.round(a[2] * (1 - t) + b[2] * t),
  ];
}

function shade(c: [number, number, number], f: number): [number, number, number] {
  return [
    Math.max(0, Math.min(255, Math.round(c[0] * f))),
    Math.max(0, Math.min(255, Math.round(c[1] * f))),
    Math.max(0, Math.min(255, Math.round(c[2] * f))),
  ];
}

type RGB = [number, number, number];

interface TileCtx {
  ctx: CanvasRenderingContext2D;
  ox: number; // origin x in atlas pixels
  oy: number; // origin y in atlas pixels
  rng: () => number;
}

function setPx(t: TileCtx, x: number, y: number, c: RGB, a = 1) {
  t.ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  t.ctx.fillRect(t.ox + x, t.oy + y, 1, 1);
}

// Fill base color
function fillBase(t: TileCtx, c: RGB) {
  t.ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
  t.ctx.fillRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
}

// Add per-pixel noise (vary brightness)
function addNoise(t: TileCtx, baseColor: RGB, variance: number) {
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const n = (t.rng() - 0.5) * variance;
      setPx(t, x, y, shade(baseColor, 1 + n));
    }
  }
}

// Sprinkle spots of a color at given density
function sprinkle(t: TileCtx, color: RGB, density: number) {
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      if (t.rng() < density) {
        setPx(t, x, y, color);
      }
    }
  }
}

// Sprinkle with darker/lighter variants of base color
function sprinkleShaded(t: TileCtx, base: RGB, density: number, factor: number) {
  const c = shade(base, factor);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      if (t.rng() < density) {
        setPx(t, x, y, c);
      }
    }
  }
}

// Draw a small blob (used for ore nuggets)
function blob(t: TileCtx, cx: number, cy: number, r: number, color: RGB) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) {
        const px = cx + x;
        const py = cy + y;
        if (px < 0 || px >= TILE_SIZE || py < 0 || py >= TILE_SIZE) continue;
        const jitter = (t.rng() - 0.5) * 0.4;
        setPx(t, px, py, shade(color, 1 + jitter));
      }
    }
  }
}

// === Individual tile painters ===

function pGrassTop(t: TileCtx) {
  addNoise(t, [95, 168, 67], 0.18);
  sprinkleShaded(t, [95, 168, 67], 0.18, 0.75);
  sprinkleShaded(t, [95, 168, 67], 0.12, 1.2);
  sprinkle(t, [60, 110, 40], 0.05);
}

function pGrassSide(t: TileCtx) {
  // Dirt base
  addNoise(t, [122, 90, 58], 0.2);
  sprinkleShaded(t, [122, 90, 58], 0.18, 0.7);
  sprinkle(t, [80, 60, 40], 0.08);
  // Green top edge (3-4 pixels tall)
  const grassDepth = 3 + Math.floor(t.rng() * 2);
  for (let x = 0; x < TILE_SIZE; x++) {
    const h = grassDepth + (t.rng() > 0.5 ? 1 : 0);
    for (let y = 0; y < h; y++) {
      const n = (t.rng() - 0.5) * 0.2;
      setPx(t, x, y, shade([95, 168, 67], 1 + n));
    }
  }
  // A few dangling grass blades
  for (let x = 0; x < TILE_SIZE; x++) {
    if (t.rng() < 0.2) {
      setPx(t, x, grassDepth + 1, shade([95, 168, 67], 0.9));
    }
  }
}

function pDirt(t: TileCtx) {
  addNoise(t, [122, 90, 58], 0.22);
  sprinkleShaded(t, [122, 90, 58], 0.2, 0.7);
  sprinkleShaded(t, [122, 90, 58], 0.12, 1.2);
  sprinkle(t, [80, 60, 40], 0.07);
  // A few pebbles
  for (let i = 0; i < 2; i++) {
    const px = Math.floor(t.rng() * TILE_SIZE);
    const py = Math.floor(t.rng() * TILE_SIZE);
    setPx(t, px, py, [70, 65, 60]);
  }
}

function pStone(t: TileCtx) {
  addNoise(t, [138, 138, 138], 0.15);
  sprinkleShaded(t, [138, 138, 138], 0.2, 0.85);
  sprinkleShaded(t, [138, 138, 138], 0.1, 1.1);
  // A few cracks
  for (let i = 0; i < 2; i++) {
    let x = Math.floor(t.rng() * TILE_SIZE);
    let y = Math.floor(t.rng() * TILE_SIZE);
    const len = 3 + Math.floor(t.rng() * 4);
    for (let j = 0; j < len; j++) {
      if (x >= 0 && x < TILE_SIZE && y >= 0 && y < TILE_SIZE) {
        setPx(t, x, y, [90, 90, 90]);
      }
      x += t.rng() > 0.5 ? 1 : -1;
      y += t.rng() > 0.5 ? 1 : 0;
    }
  }
}

function pCobblestone(t: TileCtx) {
  fillBase(t, [110, 110, 110]);
  // Draw rounded stones with mortar lines
  const stones: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 5; i++) {
    stones.push({
      x: 2 + Math.floor(t.rng() * 12),
      y: 2 + Math.floor(t.rng() * 12),
      r: 2 + Math.floor(t.rng() * 2),
    });
  }
  // Dark mortar background
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      let inStone = false;
      for (const s of stones) {
        if ((x - s.x) * (x - s.x) + (y - s.y) * (y - s.y) <= s.r * s.r) {
          inStone = true;
          const n = (t.rng() - 0.5) * 0.2;
          setPx(t, x, y, shade([125, 125, 125], 1 + n));
          break;
        }
      }
      if (!inStone) {
        const n = (t.rng() - 0.5) * 0.1;
        setPx(t, x, y, shade([75, 75, 75], 1 + n));
      }
    }
  }
  // Highlights on top-left of each stone
  for (const s of stones) {
    setPx(t, s.x - 1, s.y - 1, [170, 170, 170]);
    setPx(t, s.x, s.y - 1, [160, 160, 160]);
  }
}

function pSand(t: TileCtx) {
  addNoise(t, [230, 213, 154], 0.12);
  sprinkleShaded(t, [230, 213, 154], 0.2, 0.9);
  sprinkleShaded(t, [230, 213, 154], 0.15, 1.1);
  sprinkle(t, [200, 180, 130], 0.06);
}

function pBedrock(t: TileCtx) {
  addNoise(t, [60, 60, 60], 0.25);
  // Random black chunks
  for (let i = 0; i < 6; i++) {
    const px = Math.floor(t.rng() * TILE_SIZE);
    const py = Math.floor(t.rng() * TILE_SIZE);
    const sz = 1 + Math.floor(t.rng() * 3);
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        if (px + x < TILE_SIZE && py + y < TILE_SIZE) {
          setPx(t, px + x, py + y, [30, 30, 30]);
        }
      }
    }
  }
  sprinkle(t, [120, 120, 120], 0.05);
}

function pClay(t: TileCtx) {
  addNoise(t, [168, 149, 128], 0.15);
  sprinkleShaded(t, [168, 149, 128], 0.18, 0.85);
  sprinkleShaded(t, [168, 149, 128], 0.12, 1.15);
}

function pGravel(t: TileCtx) {
  fillBase(t, [120, 115, 110]);
  for (let i = 0; i < 18; i++) {
    const px = Math.floor(t.rng() * TILE_SIZE);
    const py = Math.floor(t.rng() * TILE_SIZE);
    const sz = 1 + Math.floor(t.rng() * 2);
    const tone = 100 + Math.floor(t.rng() * 60);
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        if (px + x < TILE_SIZE && py + y < TILE_SIZE) {
          setPx(t, px + x, py + y, [tone, tone - 5, tone - 10]);
        }
      }
    }
  }
}

function pSnow(t: TileCtx) {
  addNoise(t, [245, 247, 250], 0.05);
  sprinkleShaded(t, [245, 247, 250], 0.15, 0.92);
  sprinkle(t, [220, 225, 235], 0.04);
}

function pSnowGrassTop(t: TileCtx) {
  addNoise(t, [240, 245, 250], 0.06);
  sprinkle(t, [95, 168, 67], 0.08);
  sprinkle(t, [60, 110, 40], 0.03);
}

function pSnowGrassSide(t: TileCtx) {
  // Dirt base
  addNoise(t, [122, 90, 58], 0.2);
  // Snow top edge
  const snowDepth = 3 + Math.floor(t.rng() * 2);
  for (let x = 0; x < TILE_SIZE; x++) {
    const h = snowDepth + (t.rng() > 0.5 ? 1 : 0);
    for (let y = 0; y < h; y++) {
      const n = (t.rng() - 0.5) * 0.06;
      setPx(t, x, y, shade([245, 247, 250], 1 + n));
    }
  }
}

function pIce(t: TileCtx) {
  addNoise(t, [163, 212, 255], 0.1);
  sprinkleShaded(t, [163, 212, 255], 0.15, 0.85);
  sprinkleShaded(t, [163, 212, 255], 0.1, 1.15);
  // Cracks
  for (let i = 0; i < 2; i++) {
    let x = Math.floor(t.rng() * TILE_SIZE);
    let y = Math.floor(t.rng() * TILE_SIZE);
    for (let j = 0; j < 5; j++) {
      if (x >= 0 && x < TILE_SIZE && y >= 0 && y < TILE_SIZE) {
        setPx(t, x, y, [120, 170, 220]);
      }
      x += t.rng() > 0.5 ? 1 : -1;
      y += t.rng() > 0.5 ? 1 : 0;
    }
  }
}

function pWater(t: TileCtx) {
  fillBase(t, [45, 127, 214]);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const wave = Math.sin((x + y * 0.5) * 0.8) * 0.05 + (t.rng() - 0.5) * 0.08;
      setPx(t, x, y, shade([45, 127, 214], 1 + wave));
    }
  }
  // A few wave highlights
  for (let i = 0; i < 3; i++) {
    const y = Math.floor(t.rng() * TILE_SIZE);
    for (let x = 0; x < TILE_SIZE; x++) {
      if (t.rng() < 0.3) setPx(t, x, y, [120, 180, 230]);
    }
  }
}

function pMossyStone(t: TileCtx) {
  pStone(t);
  // Overlay moss patches
  for (let i = 0; i < 4; i++) {
    const cx = Math.floor(t.rng() * TILE_SIZE);
    const cy = Math.floor(t.rng() * TILE_SIZE);
    const r = 1 + Math.floor(t.rng() * 2);
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r && t.rng() > 0.2) {
          const px = cx + x;
          const py = cy + y;
          if (px >= 0 && px < TILE_SIZE && py >= 0 && py < TILE_SIZE) {
            const n = (t.rng() - 0.5) * 0.2;
            setPx(t, px, py, shade([60, 110, 50], 1 + n));
          }
        }
      }
    }
  }
}

function pMossyCobble(t: TileCtx) {
  pCobblestone(t);
  for (let i = 0; i < 5; i++) {
    const cx = Math.floor(t.rng() * TILE_SIZE);
    const cy = Math.floor(t.rng() * TILE_SIZE);
    setPx(t, cx, cy, [60, 110, 50]);
    if (cx + 1 < TILE_SIZE) setPx(t, cx + 1, cy, [55, 100, 45]);
    if (cy + 1 < TILE_SIZE) setPx(t, cx, cy + 1, [55, 100, 45]);
  }
}

// Ore: stone base + colored nuggets
function pOre(t: TileCtx, nugget: RGB) {
  pStone(t);
  // 3-5 nuggets
  const count = 3 + Math.floor(t.rng() * 3);
  for (let i = 0; i < count; i++) {
    const cx = 2 + Math.floor(t.rng() * (TILE_SIZE - 4));
    const cy = 2 + Math.floor(t.rng() * (TILE_SIZE - 4));
    const r = 1 + Math.floor(t.rng() * 2);
    blob(t, cx, cy, r, nugget);
  }
}

// Wood bark - vertical streaks with knot
function pWoodSide(t: TileCtx, base: RGB, dark: RGB, light: RGB) {
  fillBase(t, base);
  // Vertical streaks
  for (let x = 0; x < TILE_SIZE; x++) {
    for (let y = 0; y < TILE_SIZE; y++) {
      const r = t.rng();
      if (r < 0.3) setPx(t, x, y, dark);
      else if (r < 0.5) setPx(t, x, y, light);
    }
  }
  // Vertical streak lines for grain
  for (let x = 0; x < TILE_SIZE; x += 2 + Math.floor(t.rng() * 3)) {
    for (let y = 0; y < TILE_SIZE; y++) {
      if (t.rng() < 0.6) setPx(t, x, y, dark);
    }
  }
  // Optional knot
  if (t.rng() < 0.3) {
    const kx = 3 + Math.floor(t.rng() * (TILE_SIZE - 6));
    const ky = 3 + Math.floor(t.rng() * (TILE_SIZE - 6));
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        if (x * x + y * y <= 4) setPx(t, kx + x, ky + y, dark);
      }
    }
    setPx(t, kx, ky, shade(dark, 0.7));
  }
}

function pWoodTop(t: TileCtx, ring: RGB, center: RGB) {
  const cx = TILE_SIZE / 2;
  const cy = TILE_SIZE / 2;
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const ringValue = Math.sin(d * 1.6) * 0.5 + 0.5;
      const jitter = (t.rng() - 0.5) * 0.15;
      const c = mix(center, ring, ringValue + jitter);
      setPx(t, x, y, c);
    }
  }
  // Center dot
  setPx(t, Math.floor(cx), Math.floor(cy), shade(center, 0.7));
  setPx(t, Math.floor(cx) - 1, Math.floor(cy), shade(center, 0.8));
  setPx(t, Math.floor(cx), Math.floor(cy) - 1, shade(center, 0.8));
}

// Leaves - dense noise with darker spots and transparent-feeling depth
function pLeaves(t: TileCtx, base: RGB, dark: RGB, light: RGB) {
  addNoise(t, base, 0.25);
  sprinkle(t, dark, 0.25);
  sprinkle(t, light, 0.12);
  // Cluster highlights
  for (let i = 0; i < 4; i++) {
    const cx = Math.floor(t.rng() * TILE_SIZE);
    const cy = Math.floor(t.rng() * TILE_SIZE);
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        if (t.rng() > 0.4) {
          const px = cx + x;
          const py = cy + y;
          if (px >= 0 && px < TILE_SIZE && py >= 0 && py < TILE_SIZE) {
            setPx(t, px, py, light);
          }
        }
      }
    }
  }
}

// Planks - horizontal plank pattern
function pPlanks(t: TileCtx, base: RGB, dark: RGB) {
  addNoise(t, base, 0.1);
  // Plank separators every 4 px
  for (let y = 0; y < TILE_SIZE; y++) {
    if (y % 4 === 3) {
      for (let x = 0; x < TILE_SIZE; x++) {
        setPx(t, x, y, dark);
      }
    }
  }
  // Vertical joints offset per plank
  for (let plank = 0; plank < 4; plank++) {
    const yBase = plank * 4;
    const xJoint = 2 + Math.floor(t.rng() * 10);
    for (let y = 0; y < 3; y++) {
      setPx(t, xJoint, yBase + y, dark);
    }
  }
  // Wood grain streaks
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      if (y % 4 !== 3 && t.rng() < 0.18) {
        setPx(t, x, y, shade(base, 0.92));
      }
    }
  }
}

function pCactusSide(t: TileCtx) {
  fillBase(t, [61, 122, 74]);
  // Vertical ridges
  for (let x = 0; x < TILE_SIZE; x++) {
    if (x % 4 === 0 || x % 4 === 3) {
      for (let y = 0; y < TILE_SIZE; y++) {
        setPx(t, x, y, shade([61, 122, 74], 0.8));
      }
    }
  }
  // Spines
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(t.rng() * TILE_SIZE);
    const y = Math.floor(t.rng() * TILE_SIZE);
    setPx(t, x, y, [240, 240, 220]);
  }
  sprinkleShaded(t, [61, 122, 74], 0.1, 1.1);
}

function pCactusTop(t: TileCtx) {
  addNoise(t, [61, 122, 74], 0.1);
  // Center cross
  for (let i = 0; i < TILE_SIZE; i++) {
    setPx(t, i, 8, shade([61, 122, 74], 0.7));
    setPx(t, 8, i, shade([61, 122, 74], 0.7));
  }
}

function pPumpkinSide(t: TileCtx) {
  fillBase(t, [230, 119, 42]);
  // Vertical ridges
  for (let x = 0; x < TILE_SIZE; x++) {
    if (x % 4 === 0) {
      for (let y = 0; y < TILE_SIZE; y++) {
        setPx(t, x, y, shade([230, 119, 42], 0.7));
      }
    } else if (x % 4 === 1) {
      for (let y = 0; y < TILE_SIZE; y++) {
        setPx(t, x, y, shade([230, 119, 42], 1.1));
      }
    }
  }
  sprinkleShaded(t, [230, 119, 42], 0.05, 0.9);
}

function pPumpkinTop(t: TileCtx) {
  fillBase(t, [230, 119, 42]);
  // Stem in center
  for (let y = 6; y <= 9; y++) {
    for (let x = 6; x <= 9; x++) {
      setPx(t, x, y, [90, 60, 30]);
    }
  }
  setPx(t, 7, 7, [120, 80, 40]);
  setPx(t, 8, 8, [120, 80, 40]);
  // Ridges radiating
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    for (let r = 3; r < 7; r++) {
      const px = 7 + Math.round(Math.cos(angle) * r);
      const py = 7 + Math.round(Math.sin(angle) * r);
      if (px >= 0 && px < TILE_SIZE && py >= 0 && py < TILE_SIZE) {
        setPx(t, px, py, shade([230, 119, 42], 0.7));
      }
    }
  }
}

function pGlass(t: TileCtx) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  // Border + slight tint
  t.ctx.fillStyle = 'rgba(202, 227, 245, 0.25)';
  t.ctx.fillRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  for (let i = 0; i < TILE_SIZE; i++) {
    setPx(t, i, 0, [180, 200, 220]);
    setPx(t, i, TILE_SIZE - 1, [180, 200, 220]);
    setPx(t, 0, i, [180, 200, 220]);
    setPx(t, TILE_SIZE - 1, i, [180, 200, 220]);
  }
  // Diagonal highlight
  for (let i = 2; i < 6; i++) {
    setPx(t, i, i, [255, 255, 255]);
  }
  setPx(t, 11, 3, [255, 255, 255]);
  setPx(t, 12, 4, [220, 230, 240]);
}

function pTorch(t: TileCtx) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  // Stick
  for (let y = 5; y < 14; y++) {
    setPx(t, 7, y, [110, 75, 40]);
    setPx(t, 8, y, [140, 95, 55]);
  }
  // Flame
  setPx(t, 7, 3, [255, 200, 60]);
  setPx(t, 8, 3, [255, 200, 60]);
  setPx(t, 7, 4, [255, 160, 30]);
  setPx(t, 8, 4, [255, 160, 30]);
  setPx(t, 6, 4, [255, 220, 100]);
  setPx(t, 9, 4, [255, 220, 100]);
  setPx(t, 7, 2, [255, 240, 180]);
  setPx(t, 8, 2, [255, 240, 180]);
}

function pFlower(t: TileCtx, petal: RGB, center: RGB) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  // Stem
  for (let y = 8; y < 16; y++) {
    setPx(t, 8, y, [40, 110, 30]);
  }
  // Leaf
  setPx(t, 6, 12, [60, 140, 40]);
  setPx(t, 5, 12, [60, 140, 40]);
  setPx(t, 10, 11, [60, 140, 40]);
  setPx(t, 11, 11, [60, 140, 40]);
  // Flower head - 5 petals around center
  const cx = 8;
  const cy = 5;
  // Petals
  setPx(t, cx, cy - 2, petal);
  setPx(t, cx - 2, cy, petal);
  setPx(t, cx + 2, cy, petal);
  setPx(t, cx - 1, cy + 2, petal);
  setPx(t, cx + 1, cy + 2, petal);
  setPx(t, cx, cy, petal);
  setPx(t, cx - 1, cy - 1, petal);
  setPx(t, cx + 1, cy - 1, petal);
  setPx(t, cx - 1, cy + 1, petal);
  setPx(t, cx + 1, cy + 1, petal);
  // Center
  setPx(t, cx, cy, center);
}

function pMushroom(t: TileCtx, cap: RGB, stem: [number, number, number] = [240, 230, 200]) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  // Stem
  for (let y = 9; y < 16; y++) {
    setPx(t, 7, y, stem);
    setPx(t, 8, y, stem);
  }
  setPx(t, 6, 13, shade(stem, 0.85));
  setPx(t, 9, 13, shade(stem, 0.85));
  // Cap (dome shape)
  for (let y = 3; y < 9; y++) {
    const r = Math.floor(Math.sqrt(9 * 9 - (y - 5) * (y - 5) * 1.2)) || 1;
    for (let x = 8 - r; x <= 8 + r; x++) {
      if (x >= 0 && x < TILE_SIZE) {
        setPx(t, x, y, cap);
      }
    }
  }
  // Cap highlight
  setPx(t, 6, 4, shade(cap, 1.3));
  setPx(t, 7, 4, shade(cap, 1.2));
  // Spots
  setPx(t, 9, 5, [255, 255, 240]);
  setPx(t, 6, 6, [255, 255, 240]);
  setPx(t, 10, 7, [255, 255, 240]);
}

function pBush(t: TileCtx, base: RGB, berry: RGB | null = null) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  // Bush body
  for (let y = 4; y < 16; y++) {
    for (let x = 1; x < 15; x++) {
      const dx = x - 8;
      const dy = y - 10;
      if (dx * dx + dy * dy < 36 && t.rng() > 0.1) {
        const n = (t.rng() - 0.5) * 0.3;
        setPx(t, x, y, shade(base, 1 + n));
      }
    }
  }
  // Highlights
  for (let i = 0; i < 8; i++) {
    const x = 2 + Math.floor(t.rng() * 12);
    const y = 4 + Math.floor(t.rng() * 10);
    setPx(t, x, y, shade(base, 1.3));
  }
  // Berries
  if (berry) {
    for (let i = 0; i < 4; i++) {
      const x = 3 + Math.floor(t.rng() * 10);
      const y = 5 + Math.floor(t.rng() * 8);
      setPx(t, x, y, berry);
      if (t.rng() > 0.5 && x + 1 < TILE_SIZE) setPx(t, x + 1, y, berry);
    }
  }
}

function pFern(t: TileCtx) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  // Stem
  setPx(t, 8, 15, [40, 90, 30]);
  setPx(t, 8, 14, [40, 90, 30]);
  setPx(t, 8, 13, [40, 90, 30]);
  // Fronds (diagonal leaves)
  for (let i = 0; i < 5; i++) {
    const baseY = 11 - i;
    const len = 4 - Math.floor(i / 2);
    // Left frond
    for (let j = 0; j < len; j++) {
      setPx(t, 8 - j - 1, baseY - j, [50, 130, 40]);
      setPx(t, 8 - j - 2, baseY - j, [40, 110, 30]);
    }
    // Right frond
    for (let j = 0; j < len; j++) {
      setPx(t, 8 + j + 1, baseY - j, [50, 130, 40]);
      setPx(t, 8 + j + 2, baseY - j, [40, 110, 30]);
    }
  }
  // Top
  setPx(t, 8, 5, [60, 150, 50]);
  setPx(t, 7, 6, [50, 130, 40]);
  setPx(t, 9, 6, [50, 130, 40]);
}

function pTallGrass(t: TileCtx) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  // Blades
  for (let i = 0; i < 5; i++) {
    const x = 3 + i * 2 + Math.floor(t.rng() * 2);
    const h = 6 + Math.floor(t.rng() * 4);
    for (let y = 15; y > 15 - h; y--) {
      const c: RGB = t.rng() > 0.5 ? [95, 168, 67] : [70, 130, 50];
      setPx(t, x, y, c);
    }
  }
}

function pDeadBush(t: TileCtx) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  // Brown stick-like branches
  for (let y = 4; y < 16; y++) {
    if (y % 3 === 0) setPx(t, 8, y, [110, 80, 40]);
  }
  // Cross branches
  for (let i = 0; i < 4; i++) {
    const y = 5 + i * 3;
    const len = 2 + Math.floor(t.rng() * 2);
    for (let j = 1; j <= len; j++) {
      setPx(t, 8 - j, y, [120, 85, 45]);
      setPx(t, 8 + j, y, [120, 85, 45]);
    }
  }
}

function pLantern(t: TileCtx) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  // Top cap
  for (let x = 5; x <= 10; x++) setPx(t, x, 4, [60, 50, 40]);
  for (let x = 4; x <= 11; x++) setPx(t, x, 3, [80, 70, 60]);
  // Body frame
  for (let x = 5; x <= 10; x++) {
    for (let y = 5; y <= 11; y++) {
      setPx(t, x, y, [255, 220, 100]);
    }
  }
  // Frame bars
  for (let y = 5; y <= 11; y++) {
    setPx(t, 5, y, [60, 50, 40]);
    setPx(t, 10, y, [60, 50, 40]);
  }
  for (let x = 5; x <= 10; x++) {
    setPx(t, x, 5, [60, 50, 40]);
    setPx(t, x, 11, [60, 50, 40]);
  }
  // Bottom
  for (let x = 4; x <= 11; x++) setPx(t, x, 12, [80, 70, 60]);
  // Glow highlight
  setPx(t, 7, 7, [255, 255, 200]);
  setPx(t, 8, 7, [255, 255, 200]);
}

function pBrick(t: TileCtx, body: RGB, mortar: RGB) {
  fillBase(t, mortar);
  // Bricks (offset rows)
  const brickH = 4;
  for (let row = 0; row < 4; row++) {
    const y0 = row * brickH;
    const offset = (row % 2) * 4;
    for (let col = -1; col < 3; col++) {
      const x0 = col * 8 + offset;
      for (let y = 1; y < brickH; y++) {
        for (let x = 0; x < 7; x++) {
          const px = x0 + x;
          const py = y0 + y;
          if (px >= 0 && px < TILE_SIZE && py >= 0 && py < TILE_SIZE) {
            const n = (t.rng() - 0.5) * 0.15;
            setPx(t, px, py, shade(body, 1 + n));
          }
        }
      }
    }
  }
}

function pWorkbenchTop(t: TileCtx) {
  pPlanks(t, [184, 137, 77], [110, 75, 40]);
  // Saw/square mark in middle
  for (let i = 4; i <= 11; i++) {
    setPx(t, i, 8, [60, 40, 20]);
  }
  for (let i = 6; i <= 10; i++) {
    setPx(t, 8, i, [60, 40, 20]);
  }
}

function pWorkbenchSide(t: TileCtx) {
  pPlanks(t, [164, 122, 65], [100, 65, 35]);
}

function pWorkbenchFront(t: TileCtx) {
  pPlanks(t, [164, 122, 65], [100, 65, 35]);
  // Vise marks
  for (let y = 8; y <= 11; y++) {
    setPx(t, 4, y, [60, 40, 20]);
    setPx(t, 11, y, [60, 40, 20]);
  }
}

function pFurnaceFront(t: TileCtx) {
  pStone(t);
  // Opening (dark) with glow
  for (let y = 7; y <= 12; y++) {
    for (let x = 4; x <= 11; x++) {
      setPx(t, x, y, [20, 15, 10]);
    }
  }
  // Glow at bottom
  for (let x = 4; x <= 11; x++) {
    setPx(t, x, 12, [255, 140, 30]);
    setPx(t, x, 11, [200, 90, 20]);
  }
  // Top edge
  for (let x = 4; x <= 11; x++) setPx(t, x, 6, [80, 70, 60]);
}

function pFurnaceSide(t: TileCtx) {
  pStone(t);
  // Hatching detail
  for (let i = 0; i < 3; i++) {
    const y = 3 + i * 4;
    for (let x = 0; x < TILE_SIZE; x++) {
      if (x % 2 === 0) setPx(t, x, y, [90, 90, 90]);
    }
  }
}

function pFurnaceTop(t: TileCtx) {
  pCobblestone(t);
  // Central hole
  for (let y = 5; y <= 10; y++) {
    for (let x = 5; x <= 10; x++) {
      setPx(t, x, y, [30, 25, 20]);
    }
  }
}

function pChest(t: TileCtx, body: RGB, trim: RGB) {
  // Plank-like body
  pPlanks(t, body, shade(body, 0.6));
  // Trim across middle
  for (let x = 0; x < TILE_SIZE; x++) {
    setPx(t, x, 7, trim);
    setPx(t, x, 8, trim);
  }
  // Lock
  setPx(t, 7, 7, [200, 180, 60]);
  setPx(t, 8, 7, [200, 180, 60]);
  setPx(t, 7, 8, [180, 160, 40]);
  setPx(t, 8, 8, [180, 160, 40]);
}

function pBookshelf(t: TileCtx) {
  pPlanks(t, [164, 122, 65], [100, 65, 35]);
  // Shelf dividers
  for (let x = 0; x < TILE_SIZE; x++) {
    setPx(t, x, 5, [80, 55, 30]);
    setPx(t, x, 10, [80, 55, 30]);
  }
  // Books (alternating colors)
  const bookColors: RGB[] = [
    [180, 40, 40],
    [40, 80, 180],
    [60, 140, 60],
    [200, 140, 30],
    [120, 50, 140],
    [40, 40, 40],
  ];
  for (let row = 0; row < 2; row++) {
    const y0 = row === 0 ? 1 : 6;
    let x = 0;
    while (x < TILE_SIZE) {
      const c = bookColors[Math.floor(t.rng() * bookColors.length)];
      const w = 1 + Math.floor(t.rng() * 2);
      for (let dx = 0; dx < w && x + dx < TILE_SIZE; dx++) {
        for (let dy = 0; dy < 4; dy++) {
          setPx(t, x + dx, y0 + dy, c);
        }
      }
      x += w;
    }
  }
}

function pMetalBlock(t: TileCtx, base: RGB) {
  addNoise(t, base, 0.08);
  // Beveled edges
  for (let i = 0; i < TILE_SIZE; i++) {
    setPx(t, i, 0, shade(base, 1.2));
    setPx(t, i, TILE_SIZE - 1, shade(base, 0.8));
    setPx(t, 0, i, shade(base, 1.1));
    setPx(t, TILE_SIZE - 1, i, shade(base, 0.9));
  }
  // Rivets in corners
  setPx(t, 3, 3, shade(base, 0.7));
  setPx(t, 12, 3, shade(base, 0.7));
  setPx(t, 3, 12, shade(base, 0.7));
  setPx(t, 12, 12, shade(base, 0.7));
}

function pLava(t: TileCtx) {
  addNoise(t, [220, 80, 20], 0.3);
  sprinkle(t, [255, 200, 50], 0.2);
  sprinkle(t, [255, 240, 100], 0.1);
  sprinkle(t, [120, 40, 10], 0.15);
  // Bright cracks
  for (let i = 0; i < 3; i++) {
    let x = Math.floor(t.rng() * TILE_SIZE);
    let y = Math.floor(t.rng() * TILE_SIZE);
    for (let j = 0; j < 4; j++) {
      if (x >= 0 && x < TILE_SIZE && y >= 0 && y < TILE_SIZE) {
        setPx(t, x, y, [255, 255, 200]);
      }
      x += t.rng() > 0.5 ? 1 : -1;
      y += t.rng() > 0.5 ? 1 : -1;
    }
  }
}

function pAnvilTop(t: TileCtx) {
  fillBase(t, [70, 70, 75]);
  addNoise(t, [70, 70, 75], 0.1);
  // Top face shape
  for (let x = 2; x <= 13; x++) {
    setPx(t, x, 4, [40, 40, 45]);
    setPx(t, x, 11, [40, 40, 45]);
  }
  for (let x = 4; x <= 11; x++) {
    setPx(t, x, 6, [110, 110, 115]);
    setPx(t, x, 9, [90, 90, 95]);
  }
}

function pAnvilSide(t: TileCtx) {
  fillBase(t, [70, 70, 75]);
  addNoise(t, [70, 70, 75], 0.1);
  // Waist shape
  for (let y = 0; y < 5; y++) {
    for (let x = 5; x <= 10; x++) {
      setPx(t, x, y, [40, 40, 45]);
    }
  }
  for (let y = 5; y < 11; y++) {
    for (let x = 3; x <= 12; x++) {
      setPx(t, x, y, [60, 60, 65]);
    }
  }
  for (let y = 11; y < 16; y++) {
    for (let x = 4; x <= 11; x++) {
      setPx(t, x, y, [50, 50, 55]);
    }
  }
}

function pCrystal(t: TileCtx, base: RGB) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  // Crystal cluster
  for (let i = 0; i < 4; i++) {
    const cx = 3 + i * 3 + Math.floor(t.rng() * 2);
    const baseY = 15;
    const h = 5 + Math.floor(t.rng() * 5);
    for (let y = 0; y < h; y++) {
      const w = Math.max(1, Math.floor((h - y) / 2));
      for (let x = -w; x <= w; x++) {
        const px = cx + x;
        const py = baseY - y;
        if (px >= 0 && px < TILE_SIZE && py >= 0 && py < TILE_SIZE) {
          const n = (t.rng() - 0.5) * 0.2;
          setPx(t, px, py, shade(base, 1 + n));
        }
      }
    }
    // Tip highlight
    setPx(t, cx, baseY - h, shade(base, 1.4));
  }
}

function pLavender(t: TileCtx) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  // Stems
  for (let i = 0; i < 4; i++) {
    const x = 3 + i * 3;
    for (let y = 8; y < 16; y++) setPx(t, x, y, [60, 100, 50]);
    // Purple flowers at top
    for (let y = 4; y < 8; y++) {
      setPx(t, x, y, [150, 90, 180]);
      setPx(t, x - 1, y, [120, 70, 150]);
      setPx(t, x + 1, y, [120, 70, 150]);
    }
    setPx(t, x, 3, [180, 120, 200]);
  }
}

function pReed(t: TileCtx) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  for (let i = 0; i < 4; i++) {
    const x = 2 + i * 4;
    for (let y = 4; y < 16; y++) {
      const c: RGB = y > 12 ? [80, 60, 30] : [120, 90, 50];
      setPx(t, x, y, c);
    }
    // Cattail head
    setPx(t, x, 4, [60, 30, 10]);
    setPx(t, x, 5, [60, 30, 10]);
    setPx(t, x, 6, [60, 30, 10]);
  }
}

function pPebbles(t: TileCtx) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  for (let i = 0; i < 8; i++) {
    const x = 1 + Math.floor(t.rng() * 14);
    const y = 1 + Math.floor(t.rng() * 14);
    const sz = 1 + Math.floor(t.rng() * 2);
    const tone = 100 + Math.floor(t.rng() * 60);
    for (let dy = 0; dy < sz; dy++) {
      for (let dx = 0; dx < sz; dx++) {
        if (x + dx < TILE_SIZE && y + dy < TILE_SIZE) {
          setPx(t, x + dx, y + dy, [tone, tone, tone - 10]);
        }
      }
    }
  }
}

function pRockMoss(t: TileCtx) {
  pStone(t);
  // Heavy moss overlay
  for (let i = 0; i < 6; i++) {
    const cx = Math.floor(t.rng() * TILE_SIZE);
    const cy = Math.floor(t.rng() * TILE_SIZE);
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        const px = cx + x;
        const py = cy + y;
        if (px >= 0 && px < TILE_SIZE && py >= 0 && py < TILE_SIZE && t.rng() > 0.3) {
          setPx(t, px, py, [60, 110, 50]);
        }
      }
    }
  }
}

function pCharcoal(t: TileCtx) {
  addNoise(t, [40, 35, 35], 0.15);
  sprinkle(t, [15, 10, 10], 0.2);
  sprinkle(t, [80, 70, 70], 0.05);
}

function pSandstone(t: TileCtx) {
  addNoise(t, [220, 200, 150], 0.08);
  // Horizontal layers
  for (let y = 0; y < TILE_SIZE; y += 4) {
    for (let x = 0; x < TILE_SIZE; x++) {
      setPx(t, x, y, shade([220, 200, 150], 0.85));
    }
  }
}

function pObsidian(t: TileCtx) {
  addNoise(t, [25, 20, 35], 0.1);
  // Highlights (glossy)
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(t.rng() * TILE_SIZE);
    const y = Math.floor(t.rng() * TILE_SIZE);
    setPx(t, x, y, [80, 70, 100]);
  }
}

function pWheat(t: TileCtx) {
  t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE);
  // Stem
  for (let y = 0; y < 16; y++) setPx(t, 8, y, [180, 150, 70]);
  // Wheat heads
  for (let y = 1; y < 8; y++) {
    setPx(t, 7, y, [220, 180, 80]);
    setPx(t, 9, y, [220, 180, 80]);
    if (y % 2 === 0) {
      setPx(t, 6, y, [200, 160, 60]);
      setPx(t, 10, y, [200, 160, 60]);
    }
  }
}

function pMissing(t: TileCtx) {
  // Neutral gray stone fallback (NOT magenta checkerboard).
  // This way an unmapped tile is invisible to the player instead of screaming
  // "I am a missing asset" with a fuchsia pattern.
  const base: RGB = [125, 125, 125];
  const dark: RGB = [98, 98, 98];
  const light: RGB = [148, 148, 148];
  fillBase(t, base);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const n = t.rng();
      if (n < 0.12) setPx(t, x, y, dark);
      else if (n > 0.88) setPx(t, x, y, light);
    }
  }
}

// === Atlas builder ===

interface TilePainter {
  paint: (t: TileCtx) => void;
}

const TILE_PAINTERS: Record<number, (t: TileCtx) => void> = {
  [TILES.GRASS_TOP]: pGrassTop,
  [TILES.GRASS_SIDE]: pGrassSide,
  [TILES.DIRT]: pDirt,
  [TILES.STONE]: pStone,
  [TILES.COBBLESTONE]: pCobblestone,
  [TILES.SAND]: pSand,
  [TILES.BEDROCK]: pBedrock,
  [TILES.BEDROCK_DARK]: pBedrock,
  [TILES.CLAY]: pClay,
  [TILES.GRAVEL]: pGravel,
  [TILES.SNOW]: pSnow,
  [TILES.SNOW_GRASS_TOP]: pSnowGrassTop,
  [TILES.SNOW_GRASS_SIDE]: pSnowGrassSide,
  [TILES.ICE]: pIce,
  [TILES.ICE_PACKED]: pIce,
  [TILES.ICE_BLUE]: pIce,
  [TILES.ICE_DIRTY]: pIce,
  [TILES.WATER]: pWater,
  [TILES.MOSSY_STONE]: pMossyStone,
  [TILES.MOSSY_COBBLE]: pMossyCobble,
  [TILES.MOSS_DIRT]: (t) => { pDirt(t); sprinkle(t, [60, 110, 50], 0.15); },
  [TILES.GRASS_TUFT]: pTallGrass,

  // Ores
  [TILES.COAL_ORE]: (t) => pOre(t, [40, 40, 40]),
  [TILES.IRON_ORE]: (t) => pOre(t, [200, 168, 160]),
  [TILES.COPPER_ORE]: (t) => pOre(t, [201, 123, 74]),
  [TILES.GOLD_ORE]: (t) => pOre(t, [247, 208, 70]),
  [TILES.DIAMOND_ORE]: (t) => pOre(t, [78, 240, 227]),
  [TILES.SULFUR_ORE]: (t) => pOre(t, [220, 220, 100]),
  [TILES.MITHRIL_ORE]: (t) => pOre(t, [120, 200, 220]),
  [TILES.TIN_ORE]: (t) => pOre(t, [200, 200, 200]),
  [TILES.ZINC_ORE]: (t) => pOre(t, [180, 180, 200]),
  [TILES.SALT_ORE]: (t) => pOre(t, [240, 240, 245]),

  // Stone variants
  [TILES.GRANITE]: (t) => { addNoise(t, [180, 110, 100], 0.2); sprinkle(t, [120, 70, 60], 0.15); sprinkle(t, [220, 180, 170], 0.08); },
  [TILES.MARBLE]: (t) => { addNoise(t, [230, 230, 235], 0.08); for (let i = 0; i < 3; i++) { let x = Math.floor(t.rng() * TILE_SIZE); let y = Math.floor(t.rng() * TILE_SIZE); for (let j = 0; j < 5; j++) { setPx(t, x, y, [120, 120, 130]); x += t.rng() > 0.5 ? 1 : -1; y += t.rng() > 0.5 ? 1 : 0; } } },
  [TILES.SLATE]: (t) => { fillBase(t, [70, 75, 85]); for (let y = 0; y < TILE_SIZE; y += 3) { for (let x = 0; x < TILE_SIZE; x++) setPx(t, x, y, [50, 55, 65]); } sprinkle(t, [40, 45, 55], 0.1); },
  [TILES.SANDSTONE]: pSandstone,
  [TILES.RED_SANDSTONE]: (t) => { addNoise(t, [180, 90, 60], 0.1); for (let y = 0; y < TILE_SIZE; y += 4) { for (let x = 0; x < TILE_SIZE; x++) setPx(t, x, y, [140, 70, 45]); } },
  [TILES.OBSIDIAN]: pObsidian,
  [TILES.TERRACOTTA]: (t) => addNoise(t, [170, 100, 70], 0.12),
  [TILES.CHARCOAL_BLOCK]: pCharcoal,
  [TILES.COAL_BLOCK]: pCharcoal,

  // Wood - 4 species
  [TILES.WOOD_OAK_SIDE]: (t) => pWoodSide(t, [107, 74, 46], [70, 45, 25], [140, 100, 65]),
  [TILES.WOOD_OAK_TOP]: (t) => pWoodTop(t, [180, 140, 90], [120, 85, 50]),
  [TILES.LEAVES_OAK]: (t) => pLeaves(t, [61, 122, 47], [40, 90, 30], [90, 160, 60]),
  [TILES.PLANKS_OAK]: (t) => pPlanks(t, [184, 137, 77], [120, 80, 40]),

  [TILES.WOOD_PINE_SIDE]: (t) => pWoodSide(t, [80, 55, 35], [50, 30, 20], [110, 80, 50]),
  [TILES.WOOD_PINE_TOP]: (t) => pWoodTop(t, [140, 100, 60], [90, 60, 35]),
  [TILES.LEAVES_PINE]: (t) => pLeaves(t, [40, 90, 50], [25, 60, 35], [70, 130, 60]),
  [TILES.PLANKS_PINE]: (t) => pPlanks(t, [140, 95, 55], [90, 55, 30]),

  [TILES.WOOD_SPRUCE_SIDE]: (t) => pWoodSide(t, [90, 60, 40], [55, 35, 25], [120, 85, 55]),
  [TILES.WOOD_SPRUCE_TOP]: (t) => pWoodTop(t, [150, 105, 65], [100, 65, 40]),
  [TILES.LEAVES_SPRUCE]: (t) => pLeaves(t, [35, 75, 45], [20, 50, 30], [60, 115, 55]),
  [TILES.PLANKS_SPRUCE]: (t) => pPlanks(t, [150, 100, 60], [95, 60, 35]),

  [TILES.WOOD_BIRCH_SIDE]: (t) => {
    pWoodSide(t, [225, 220, 215], [180, 175, 170], [240, 235, 230]);
    // Black birch marks
    for (let i = 0; i < 4; i++) {
      const x = 2 + Math.floor(t.rng() * 12);
      const y = 2 + Math.floor(t.rng() * 12);
      setPx(t, x, y, [30, 25, 20]);
      if (t.rng() > 0.5 && x + 1 < TILE_SIZE) setPx(t, x + 1, y, [30, 25, 20]);
    }
  },
  [TILES.WOOD_BIRCH_TOP]: (t) => pWoodTop(t, [220, 215, 210], [180, 175, 170]),
  [TILES.LEAVES_BIRCH]: (t) => pLeaves(t, [90, 150, 70], [60, 110, 50], [120, 180, 90]),
  [TILES.PLANKS_BIRCH]: (t) => pPlanks(t, [210, 200, 190], [150, 145, 140]),

  // Autumn leaves
  [TILES.LEAVES_AUTUMN_YELLOW]: (t) => pLeaves(t, [230, 180, 40], [180, 130, 20], [255, 220, 100]),
  [TILES.LEAVES_AUTUMN_ORANGE]: (t) => pLeaves(t, [220, 110, 30], [170, 80, 20], [255, 170, 80]),
  [TILES.LEAVES_AUTUMN_RED]: (t) => pLeaves(t, [180, 50, 40], [120, 30, 25], [230, 100, 80]),
  [TILES.LEAVES_AUTUMN_MIXED]: (t) => {
    pLeaves(t, [200, 100, 30], [150, 60, 20], [240, 180, 50]);
    sprinkle(t, [180, 50, 40], 0.15);
    sprinkle(t, [230, 180, 40], 0.1);
  },
  [TILES.LEAVES_DRY]: (t) => pLeaves(t, [160, 110, 50], [110, 70, 30], [200, 150, 80]),
  [TILES.LEAVES_CHERRY]: (t) => pLeaves(t, [240, 180, 200], [220, 140, 170], [255, 220, 230]),
  [TILES.LEAVES_APPLE]: (t) => { pLeaves(t, [80, 140, 60], [50, 100, 40], [110, 170, 80]); for (let i = 0; i < 3; i++) { const x = Math.floor(t.rng() * TILE_SIZE); const y = Math.floor(t.rng() * TILE_SIZE); setPx(t, x, y, [200, 50, 50]); } },

  // Bushes & foliage
  [TILES.BUSH]: (t) => pBush(t, [70, 130, 50], null),
  [TILES.BUSH_BERRY]: (t) => pBush(t, [70, 130, 50], [180, 40, 50]),
  [TILES.BERRY_BUSH]: (t) => pBush(t, [60, 110, 45], [50, 30, 120]),
  [TILES.FERN]: pFern,
  [TILES.DEAD_BUSH]: pDeadBush,
  [TILES.TALL_GRASS]: pTallGrass,
  [TILES.REED]: pReed,
  [TILES.TALL_REED]: pReed,
  [TILES.LAVENDER]: pLavender,
  [TILES.WATER_LILY]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 4; y < 12; y++) for (let x = 2; x < 14; x++) { const dx = x - 8; const dy = y - 8; if (dx*dx + dy*dy < 36) { setPx(t, x, y, [60, 130, 60]); } } setPx(t, 8, 7, [255, 220, 180]); setPx(t, 7, 7, [255, 220, 180]); setPx(t, 9, 7, [255, 220, 180]); },
  [TILES.LILY_PAD]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 6; y < 12; y++) for (let x = 4; x < 12; x++) setPx(t, x, y, [60, 130, 60]); setPx(t, 8, 6, [40, 100, 40]); },
  [TILES.VINES]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let i = 0; i < 4; i++) { const x = 2 + i * 4; for (let y = 0; y < TILE_SIZE; y++) { if (t.rng() > 0.2) setPx(t, x, y, [50, 110, 40]); } } },

  // Crops
  [TILES.WHEAT]: pWheat,
  [TILES.WHEAT_GROWN]: pWheat,
  [TILES.WHEAT_SEEDLING]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let i = 0; i < 4; i++) { const x = 3 + i * 3; for (let y = 10; y < 16; y++) setPx(t, x, y, [80, 140, 50]); } },

  // Cactus
  [TILES.CACTUS_SIDE]: pCactusSide,
  [TILES.CACTUS_TOP]: pCactusTop,

  // Pumpkin
  [TILES.PUMPKIN_SIDE]: pPumpkinSide,
  [TILES.PUMPKIN_TOP]: pPumpkinTop,
  [TILES.PUMPKIN_FACE]: (t) => { pPumpkinSide(t); // Carved face
    for (let y = 6; y <= 8; y++) { setPx(t, 4, y, [20, 15, 5]); setPx(t, 5, y, [20, 15, 5]); setPx(t, 10, y, [20, 15, 5]); setPx(t, 11, y, [20, 15, 5]); }
    for (let x = 5; x <= 10; x++) setPx(t, x, 10, [20, 15, 5]);
    for (let x = 5; x <= 10; x++) setPx(t, x, 12, [20, 15, 5]);
  },
  [TILES.PUMPKIN_STEM]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 8; y < 16; y++) setPx(t, 8, y, [80, 110, 40]); setPx(t, 7, 6, [80, 110, 40]); setPx(t, 9, 6, [80, 110, 40]); setPx(t, 8, 4, [200, 180, 40]); setPx(t, 8, 5, [200, 180, 40]); },

  // Saplings
  [TILES.SAPLING_OAK]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 10; y < 16; y++) setPx(t, 8, y, [110, 75, 40]); setPx(t, 7, 8, [60, 130, 50]); setPx(t, 8, 7, [70, 140, 55]); setPx(t, 9, 8, [60, 130, 50]); setPx(t, 6, 9, [50, 110, 40]); setPx(t, 10, 9, [50, 110, 40]); },
  [TILES.SAPLING_PINE]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 12; y < 16; y++) setPx(t, 8, y, [80, 55, 35]); for (let y = 4; y < 13; y++) { const w = Math.max(1, 4 - Math.floor((12 - y) / 3)); for (let x = 8 - w; x <= 8 + w; x++) setPx(t, x, y, [40, 90, 50]); } },
  [TILES.SAPLING_BIRCH]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 10; y < 16; y++) setPx(t, 8, y, [220, 215, 210]); setPx(t, 7, 8, [90, 150, 70]); setPx(t, 8, 7, [100, 160, 80]); setPx(t, 9, 8, [90, 150, 70]); },

  // Glass / transparent
  [TILES.GLASS]: pGlass,
  [TILES.GLASS_TINTED]: (t) => { pGlass(t); for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) if (t.rng() < 0.3) setPx(t, x, y, [30, 30, 50]); },

  // Light sources
  [TILES.TORCH]: pTorch,
  [TILES.LANTERN]: pLantern,

  // Bricks
  [TILES.BRICK]: (t) => pBrick(t, [150, 70, 60], [200, 180, 170]),
  [TILES.BRICK_MOSSY]: (t) => { pBrick(t, [140, 65, 55], [200, 180, 170]); sprinkle(t, [60, 110, 50], 0.15); },
  [TILES.SANDSTONE_BRICK]: (t) => pBrick(t, [220, 200, 150], [180, 160, 120]),
  [TILES.STONE_BRICK]: (t) => pBrick(t, [120, 120, 120], [80, 80, 80]),
  [TILES.STONE_BRICK_MOSSY]: (t) => { pBrick(t, [115, 115, 110], [80, 80, 75]); sprinkle(t, [60, 110, 50], 0.18); },
  [TILES.COBBLE_WALL]: pCobblestone,
  [TILES.CLAY_BRICK]: (t) => pBrick(t, [180, 110, 80], [200, 180, 170]),
  [TILES.ROOF_TILE]: (t) => pBrick(t, [140, 60, 40], [100, 40, 30]),

  // Plank variants
  [TILES.WOOD_PLANK_DARK]: (t) => pPlanks(t, [100, 65, 35], [60, 35, 20]),
  [TILES.WOOD_BEAM]: (t) => pPlanks(t, [120, 80, 45], [70, 40, 25]),
  [TILES.THATCH]: (t) => { addNoise(t, [180, 150, 70], 0.2); for (let y = 0; y < TILE_SIZE; y += 2) { for (let x = 0; x < TILE_SIZE; x++) setPx(t, x, y, [140, 110, 50]); } },
  [TILES.STRAW_BALE]: (t) => { addNoise(t, [220, 190, 100], 0.15); for (let i = 0; i < 8; i++) { const y = Math.floor(t.rng() * TILE_SIZE); for (let x = 0; x < TILE_SIZE; x++) if (t.rng() > 0.7) setPx(t, x, y, [180, 150, 70]); } },

  // Workstations
  [TILES.WORKBENCH_TOP]: pWorkbenchTop,
  [TILES.WORKBENCH_SIDE]: pWorkbenchSide,
  [TILES.WORKBENCH_FRONT]: pWorkbenchFront,
  [TILES.FURNACE_FRONT]: pFurnaceFront,
  [TILES.FURNACE_SIDE]: pFurnaceSide,
  [TILES.FURNACE_TOP]: pFurnaceTop,
  [TILES.ANVIL_TOP]: pAnvilTop,
  [TILES.ANVIL_SIDE]: pAnvilSide,
  [TILES.FORGE_FRONT]: (t) => { pFurnaceFront(t); for (let x = 4; x <= 11; x++) for (let y = 8; y <= 12; y++) if (t.rng() > 0.5) setPx(t, x, y, [255, 240, 100]); },
  [TILES.CHEST_TOP]: (t) => pPlanks(t, [184, 137, 77], [110, 75, 40]),
  [TILES.CHEST_SIDE]: (t) => pChest(t, [164, 122, 65], [80, 55, 30]),
  [TILES.CHEST_FRONT]: (t) => pChest(t, [164, 122, 65], [80, 55, 30]),
  [TILES.BOOKSHELF]: pBookshelf,
  [TILES.CRATE]: (t) => pPlanks(t, [150, 110, 60], [90, 60, 30]),
  [TILES.BARREL]: (t) => { pPlanks(t, [140, 95, 50], [80, 50, 25]); for (let y = 0; y < TILE_SIZE; y += 2) for (let x = 0; x < TILE_SIZE; x++) setPx(t, x, y, [60, 40, 20]); },
  [TILES.LOOM]: (t) => pPlanks(t, [150, 110, 60], [90, 60, 30]),

  // Metals
  [TILES.COPPER_BLOCK]: (t) => pMetalBlock(t, [201, 123, 74]),
  [TILES.BRONZE_BLOCK]: (t) => pMetalBlock(t, [180, 130, 60]),
  [TILES.IRON_BLOCK]: (t) => pMetalBlock(t, [200, 200, 210]),
  [TILES.STEEL_BLOCK]: (t) => pMetalBlock(t, [150, 160, 170]),
  [TILES.GOLD_BLOCK]: (t) => pMetalBlock(t, [247, 208, 70]),
  [TILES.SILVER_BLOCK]: (t) => pMetalBlock(t, [220, 220, 230]),
  [TILES.MITHRIL_BLOCK]: (t) => pMetalBlock(t, [120, 200, 220]),
  [TILES.CHARCOAL]: pCharcoal,
  [TILES.SLAG]: (t) => { addNoise(t, [60, 50, 50], 0.15); sprinkle(t, [120, 90, 80], 0.1); sprinkle(t, [30, 25, 25], 0.15); },
  [TILES.CRACKED_STONE]: (t) => { pStone(t); for (let i = 0; i < 4; i++) { let x = Math.floor(t.rng() * TILE_SIZE); let y = Math.floor(t.rng() * TILE_SIZE); for (let j = 0; j < 5; j++) { if (x >= 0 && x < TILE_SIZE && y >= 0 && y < TILE_SIZE) setPx(t, x, y, [50, 50, 50]); x += t.rng() > 0.5 ? 1 : -1; y += t.rng() > 0.5 ? 1 : 0; } } },

  // Liquids
  [TILES.LAVA]: pLava,
  [TILES.LAVA_BRIGHT]: (t) => { pLava(t); for (let y = 0; y < TILE_SIZE; y++) for (let x = 0; x < TILE_SIZE; x++) if (t.rng() > 0.7) setPx(t, x, y, [255, 255, 200]); },
  [TILES.MAGMA]: (t) => { pStone(t); sprinkle(t, [220, 80, 20], 0.15); sprinkle(t, [255, 200, 50], 0.08); },

  // Paths / floors
  [TILES.PATH_DIRT]: (t) => { pDirt(t); for (let i = 0; i < 3; i++) { const y = 4 + i * 5; for (let x = 0; x < TILE_SIZE; x++) if (x % 2 === 0) setPx(t, x, y, [90, 65, 40]); } },
  [TILES.PATH_STONE]: (t) => { pStone(t); for (let y = 0; y < TILE_SIZE; y += 5) for (let x = 0; x < TILE_SIZE; x++) setPx(t, x, y, [80, 80, 80]); },
  [TILES.PATH_COBBLE]: pCobblestone,
  [TILES.PLANK_FLOOR]: (t) => pPlanks(t, [170, 125, 70], [110, 75, 40]),

  // Decoration
  [TILES.CARPET_RED]: (t) => addNoise(t, [160, 40, 40], 0.08),
  [TILES.CARPET_BLUE]: (t) => addNoise(t, [40, 60, 160], 0.08),
  [TILES.CARPET_GREEN]: (t) => addNoise(t, [40, 130, 60], 0.08),
  [TILES.CURTAIN]: (t) => { addNoise(t, [140, 60, 60], 0.1); for (let y = 0; y < TILE_SIZE; y++) for (let x = 0; x < TILE_SIZE; x += 3) setPx(t, x, y, [100, 40, 40]); },
  [TILES.WINDOW]: pGlass,
  [TILES.WINDOW_CROSS]: (t) => { pGlass(t); for (let i = 0; i < TILE_SIZE; i++) { setPx(t, i, 7, [120, 100, 80]); setPx(t, 7, i, [120, 100, 80]); } },
  [TILES.WINDOW_ARCHED]: pGlass,
  [TILES.DOOR_WOOD]: (t) => pPlanks(t, [120, 80, 45], [70, 40, 25]),
  [TILES.DOOR_IRON]: (t) => pMetalBlock(t, [100, 100, 110]),
  [TILES.LADDER]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 0; y < TILE_SIZE; y++) { setPx(t, 3, y, [120, 80, 45]); setPx(t, 12, y, [120, 80, 45]); } for (let x = 3; x <= 12; x++) { setPx(t, x, 4, [120, 80, 45]); setPx(t, x, 9, [120, 80, 45]); setPx(t, x, 14, [120, 80, 45]); } },
  [TILES.FENCE_WOOD]: (t) => { pPlanks(t, [150, 110, 60], [90, 60, 30]); for (let y = 0; y < TILE_SIZE; y += 5) for (let x = 0; x < TILE_SIZE; x++) setPx(t, x, y, [60, 40, 20]); },
  [TILES.FENCE_STONE]: pCobblestone,
  [TILES.SIGN]: (t) => { pPlanks(t, [180, 140, 80], [110, 75, 40]); },
  [TILES.BANNER]: (t) => { fillBase(t, [140, 30, 40]); for (let y = 0; y < TILE_SIZE; y += 4) for (let x = 0; x < TILE_SIZE; x++) setPx(t, x, y, [180, 50, 60]); },

  // Nature extras
  [TILES.ROCK_MOSS]: pRockMoss,
  [TILES.ROCK_SMALL]: pPebbles,
  [TILES.BOULDER]: (t) => { fillBase(t, [110, 110, 115]); for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) { const dx = x - 8; const dy = y - 8; if (dx*dx + dy*dy < 36) { const n = (t.rng() - 0.5) * 0.2; setPx(t, x, y, shade([110, 110, 115], 1 + n)); } else { setPx(t, x, y, [60, 60, 65]); } } },
  [TILES.STALAGMITE]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 0; y < 16; y++) { const w = Math.max(1, Math.floor((16 - y) / 3)); for (let x = 8 - w; x <= 8 + w; x++) setPx(t, x, y, [110, 110, 115]); } },
  [TILES.CRYSTAL_BLUE]: (t) => pCrystal(t, [100, 200, 240]),
  [TILES.CRYSTAL_PURPLE]: (t) => pCrystal(t, [180, 100, 220]),
  [TILES.CRYSTAL_GREEN]: (t) => pCrystal(t, [100, 220, 130]),
  [TILES.GEODE]: (t) => { pStone(t); for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) { const dx = x - 8; const dy = y - 8; if (dx*dx + dy*dy < 16) { setPx(t, x, y, [180, 100, 220]); } } },

  [TILES.PINECONE]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 4; y < 14; y++) { const w = Math.max(1, Math.floor((y - 2) / 3)); for (let x = 8 - w; x <= 8 + w; x++) { setPx(t, x, y, [120, 80, 40]); if (t.rng() > 0.5) setPx(t, x, y, [90, 60, 30]); } } },
  [TILES.FALLEN_LEAVES]: (t) => { addNoise(t, [180, 110, 40], 0.15); sprinkle(t, [200, 50, 40], 0.15); sprinkle(t, [220, 180, 40], 0.15); sprinkle(t, [120, 70, 30], 0.1); },
  [TILES.LEAF_PILE]: (t) => { addNoise(t, [120, 150, 60], 0.2); sprinkle(t, [60, 110, 40], 0.2); sprinkle(t, [180, 130, 50], 0.1); },
  [TILES.ROOT]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let i = 0; i < 4; i++) { let x = 2 + i * 3; let y = 15; for (let j = 0; j < 8; j++) { setPx(t, x, y, [90, 60, 35]); x += t.rng() > 0.5 ? 1 : -1; y -= 1; } } },
  [TILES.STUMP]: (t) => { pWoodTop(t, [120, 85, 50], [90, 60, 35]); for (let i = 0; i < 8; i++) { const x = Math.floor(t.rng() * TILE_SIZE); const y = Math.floor(t.rng() * TILE_SIZE); setPx(t, x, y, [60, 40, 25]); } },
  [TILES.BARK_MOSS]: (t) => { pWoodSide(t, [107, 74, 46], [70, 45, 25], [140, 100, 65]); sprinkle(t, [60, 110, 50], 0.2); },
  [TILES.BARK_DRY]: (t) => pWoodSide(t, [120, 90, 60], [80, 60, 40], [150, 120, 80]),
  [TILES.BIRCH_BARK_PEELED]: (t) => { pWoodSide(t, [220, 215, 210], [180, 175, 170], [240, 235, 230]); for (let i = 0; i < 3; i++) { const y = Math.floor(t.rng() * TILE_SIZE); for (let x = 0; x < TILE_SIZE; x++) setPx(t, x, y, [180, 130, 80]); } },

  // Seasonal grass variants
  [TILES.GRASS_AUTUMN_TOP]: (t) => { addNoise(t, [170, 140, 60], 0.18); sprinkle(t, [200, 80, 30], 0.1); sprinkle(t, [220, 180, 40], 0.08); sprinkle(t, [120, 80, 30], 0.05); },
  [TILES.GRASS_AUTUMN_SIDE]: (t) => { pDirt(t); const gd = 3 + Math.floor(t.rng() * 2); for (let x = 0; x < TILE_SIZE; x++) { const h = gd + (t.rng() > 0.5 ? 1 : 0); for (let y = 0; y < h; y++) { const r = t.rng(); const c: RGB = r > 0.7 ? [220, 110, 30] : r > 0.4 ? [200, 150, 40] : [170, 140, 60]; setPx(t, x, y, c); } } },
  [TILES.GRASS_WITHERED_TOP]: (t) => { addNoise(t, [140, 120, 70], 0.15); sprinkle(t, [100, 80, 50], 0.15); sprinkle(t, [170, 140, 80], 0.08); },
  [TILES.GRASS_WITHERED_SIDE]: (t) => { pDirt(t); const gd = 3 + Math.floor(t.rng() * 2); for (let x = 0; x < TILE_SIZE; x++) { const h = gd + (t.rng() > 0.5 ? 1 : 0); for (let y = 0; y < h; y++) { setPx(t, x, y, [140, 120, 70]); } } },
  [TILES.GRASS_SPRING_TOP]: (t) => { addNoise(t, [110, 180, 80], 0.18); sprinkle(t, [255, 200, 220], 0.06); sprinkle(t, [240, 240, 150], 0.05); },
  [TILES.GRASS_SPRING_SIDE]: (t) => { pDirt(t); const gd = 3 + Math.floor(t.rng() * 2); for (let x = 0; x < TILE_SIZE; x++) { const h = gd + (t.rng() > 0.5 ? 1 : 0); for (let y = 0; y < h; y++) { setPx(t, x, y, [110, 180, 80]); } } },

  // Crops & food
  [TILES.CARROT]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 8; y < 16; y++) setPx(t, 8, y, [40, 110, 30]); setPx(t, 6, 10, [50, 130, 40]); setPx(t, 10, 10, [50, 130, 40]); for (let y = 4; y < 8; y++) setPx(t, 8, y, [240, 140, 50]); },
  [TILES.POTATO]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 8; y < 16; y++) setPx(t, 8, y, [60, 130, 40]); setPx(t, 6, 10, [70, 140, 50]); setPx(t, 10, 10, [70, 140, 50]); for (let y = 4; y < 8; y++) setPx(t, 8, y, [180, 140, 90]); },
  [TILES.BEETROOT]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 8; y < 16; y++) setPx(t, 8, y, [50, 130, 40]); for (let y = 5; y < 9; y++) setPx(t, 8, y, [150, 40, 60]); setPx(t, 7, 7, [180, 60, 80]); setPx(t, 9, 7, [180, 60, 80]); },
  [TILES.MELON]: (t) => { addNoise(t, [80, 140, 50], 0.1); for (let y = 0; y < TILE_SIZE; y += 4) for (let x = 0; x < TILE_SIZE; x++) setPx(t, x, y, [50, 100, 30]); },
  [TILES.MELON_STEM]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 8; y < 16; y++) setPx(t, 8, y, [80, 110, 40]); setPx(t, 7, 6, [80, 110, 40]); setPx(t, 9, 6, [80, 110, 40]); },
  [TILES.BREAD]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 5; y < 11; y++) for (let x = 2; x < 14; x++) { const dx = x - 8; const dy = y - 8; if (dx*dx/36 + dy*dy/9 < 1) setPx(t, x, y, [200, 150, 80]); } setPx(t, 5, 5, [220, 170, 100]); setPx(t, 10, 5, [220, 170, 100]); for (let i = 0; i < 3; i++) setPx(t, 4 + i * 3, 7, [120, 80, 40]); },
  [TILES.CHEESE]: (t) => { addNoise(t, [240, 220, 130], 0.08); setPx(t, 5, 5, [200, 180, 100]); setPx(t, 10, 8, [200, 180, 100]); setPx(t, 7, 11, [200, 180, 100]); setPx(t, 12, 4, [200, 180, 100]); },
  [TILES.HONEYCOMB]: (t) => { fillBase(t, [240, 200, 80]); for (let y = 0; y < TILE_SIZE; y += 3) for (let x = 0; x < TILE_SIZE; x += 4) { setPx(t, x, y, [180, 140, 50]); setPx(t, x + 1, y, [180, 140, 50]); setPx(t, x, y + 1, [180, 140, 50]); setPx(t, x + 1, y + 1, [180, 140, 50]); } },
  [TILES.HONEY_BLOCK]: (t) => { addNoise(t, [240, 200, 80], 0.1); sprinkle(t, [255, 240, 150], 0.1); },
  [TILES.SUGAR]: (t) => addNoise(t, [250, 250, 250], 0.05),
  [TILES.FLOUR]: (t) => addNoise(t, [240, 230, 210], 0.07),
  [TILES.NEST]: (t) => { addNoise(t, [120, 90, 50], 0.2); for (let i = 0; i < 4; i++) { const x = Math.floor(t.rng() * TILE_SIZE); const y = Math.floor(t.rng() * TILE_SIZE); setPx(t, x, y, [80, 60, 30]); } },
  [TILES.HAY]: (t) => pPlanks(t, [220, 190, 100], [180, 150, 70]),

  // Misc ground
  [TILES.MUD]: (t) => { addNoise(t, [80, 60, 40], 0.15); sprinkle(t, [50, 40, 30], 0.15); sprinkle(t, [120, 90, 60], 0.1); },
  [TILES.MUD_DRY]: (t) => { addNoise(t, [110, 80, 50], 0.15); for (let i = 0; i < 4; i++) { let x = Math.floor(t.rng() * TILE_SIZE); let y = Math.floor(t.rng() * TILE_SIZE); for (let j = 0; j < 4; j++) { if (x >= 0 && x < TILE_SIZE && y >= 0 && y < TILE_SIZE) setPx(t, x, y, [70, 50, 30]); x += t.rng() > 0.5 ? 1 : -1; } } },
  [TILES.SAND_WET]: (t) => { addNoise(t, [200, 180, 130], 0.1); sprinkle(t, [160, 140, 100], 0.1); },
  [TILES.DIRT_PATH]: (t) => { pDirt(t); for (let i = 0; i < 3; i++) { const y = 4 + i * 5; for (let x = 0; x < TILE_SIZE; x++) if (x % 2 === 0) setPx(t, x, y, [90, 65, 40]); } },
  [TILES.ICE_CRACK]: (t) => { pIce(t); for (let i = 0; i < 3; i++) { let x = Math.floor(t.rng() * TILE_SIZE); let y = Math.floor(t.rng() * TILE_SIZE); for (let j = 0; j < 5; j++) { if (x >= 0 && x < TILE_SIZE && y >= 0 && y < TILE_SIZE) setPx(t, x, y, [60, 100, 150]); x += t.rng() > 0.5 ? 1 : -1; y += t.rng() > 0.5 ? 1 : 0; } } },
  [TILES.SCORCHED]: (t) => { addNoise(t, [40, 30, 25], 0.2); sprinkle(t, [15, 10, 10], 0.15); sprinkle(t, [80, 50, 30], 0.08); },
  [TILES.ASH]: (t) => addNoise(t, [80, 75, 75], 0.18),
  [TILES.SNOW_DIRTY]: (t) => { addNoise(t, [200, 200, 200], 0.1); sprinkle(t, [120, 110, 100], 0.15); sprinkle(t, [240, 240, 250], 0.1); },
  [TILES.PEBBLES]: pPebbles,
  [TILES.PEBBLES_SNOW]: (t) => { pPebbles(t); sprinkle(t, [240, 245, 250], 0.25); },
  [TILES.CRACK]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let i = 0; i < 4; i++) { let x = Math.floor(t.rng() * TILE_SIZE); let y = Math.floor(t.rng() * TILE_SIZE); for (let j = 0; j < 5; j++) { if (x >= 0 && x < TILE_SIZE && y >= 0 && y < TILE_SIZE) setPx(t, x, y, [30, 25, 25]); x += t.rng() > 0.5 ? 1 : -1; y += t.rng() > 0.5 ? 1 : -1; } } },
  [TILES.CLOVER]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let i = 0; i < 6; i++) { const cx = 2 + Math.floor(t.rng() * 12); const cy = 2 + Math.floor(t.rng() * 12); setPx(t, cx, cy, [60, 140, 50]); setPx(t, cx + 1, cy, [60, 140, 50]); setPx(t, cx, cy + 1, [60, 140, 50]); setPx(t, cx + 1, cy + 1, [60, 140, 50]); } },
  [TILES.MOSS_PATCH]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let i = 0; i < 5; i++) { const cx = Math.floor(t.rng() * TILE_SIZE); const cy = Math.floor(t.rng() * TILE_SIZE); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const px = cx + dx; const py = cy + dy; if (px >= 0 && px < TILE_SIZE && py >= 0 && py < TILE_SIZE && t.rng() > 0.3) setPx(t, px, py, [60, 110, 50]); } } },
  [TILES.DIRT_DARK]: (t) => { addNoise(t, [80, 55, 35], 0.2); sprinkle(t, [50, 35, 20], 0.15); sprinkle(t, [110, 80, 50], 0.08); },

  // More minerals
  [TILES.IRON_BLOCK_RAW]: (t) => pOre(t, [200, 168, 160]),
  [TILES.COPPER_BLOCK_RAW]: (t) => pOre(t, [201, 123, 74]),
  [TILES.SALT_BLOCK]: (t) => addNoise(t, [240, 240, 245], 0.1),
  [TILES.AMETHYST]: (t) => pCrystal(t, [180, 100, 220]),
  [TILES.QUARTZ]: (t) => pCrystal(t, [240, 240, 230]),
  [TILES.GARNET]: (t) => pCrystal(t, [180, 40, 50]),
  [TILES.JADE]: (t) => pCrystal(t, [100, 180, 110]),
  [TILES.ONYX]: (t) => pCrystal(t, [40, 40, 50]),
  [TILES.PEARL]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) { const dx = x - 8; const dy = y - 8; if (dx*dx + dy*dy < 5) setPx(t, x, y, [240, 240, 250]); } setPx(t, 7, 7, [255, 255, 255]); },
  [TILES.CORAL_RED]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let i = 0; i < 4; i++) { const x = 2 + i * 4; for (let y = 4; y < 16; y++) { if (t.rng() > 0.4) setPx(t, x, y, [200, 60, 70]); if (t.rng() > 0.6) setPx(t, x + 1, y, [220, 80, 90]); } } },
  [TILES.CORAL_PINK]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let i = 0; i < 4; i++) { const x = 2 + i * 4; for (let y = 4; y < 16; y++) { if (t.rng() > 0.4) setPx(t, x, y, [240, 150, 170]); if (t.rng() > 0.6) setPx(t, x + 1, y, [255, 180, 200]); } } },
  [TILES.CORAL_TUBE]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let i = 0; i < 3; i++) { const x = 3 + i * 5; for (let y = 2; y < 16; y++) { setPx(t, x, y, [200, 100, 130]); setPx(t, x + 1, y, [220, 130, 160]); } } },

  // Roof tiles
  [TILES.TILE_ROOF_RED]: (t) => pBrick(t, [140, 60, 40], [80, 30, 20]),
  [TILES.TILE_ROOF_BLUE]: (t) => pBrick(t, [50, 80, 140], [30, 50, 90]),
  [TILES.TILE_ROOF_GREEN]: (t) => pBrick(t, [50, 130, 60], [30, 80, 40]),
  [TILES.TILE_ROOF_GRAY]: (t) => pBrick(t, [110, 110, 115], [70, 70, 75]),

  [TILES.SHUTTER]: (t) => pPlanks(t, [120, 70, 40], [70, 40, 25]),
  [TILES.COLUMN_TOP]: (t) => { addNoise(t, [220, 220, 215], 0.06); for (let x = 0; x < TILE_SIZE; x++) { setPx(t, x, 1, [180, 180, 175]); setPx(t, x, 14, [180, 180, 175]); } },
  [TILES.COLUMN_MID]: (t) => { addNoise(t, [220, 220, 215], 0.06); for (let y = 0; y < TILE_SIZE; y++) { setPx(t, 2, y, [180, 180, 175]); setPx(t, 13, y, [180, 180, 175]); } },
  [TILES.COLUMN_BASE]: (t) => { addNoise(t, [200, 200, 195], 0.06); for (let x = 0; x < TILE_SIZE; x++) { setPx(t, x, 1, [160, 160, 155]); setPx(t, x, 14, [160, 160, 155]); } },
  [TILES.ARCH]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let y = 0; y < TILE_SIZE; y++) for (let x = 0; x < TILE_SIZE; x++) { const dx = x - 8; const dy = y - 4; if (dy < 0 && dx*dx + dy*dy*2 > 36 && dx*dx + dy*dy*2 < 64) setPx(t, x, y, [180, 170, 160]); } },

  // Stained glass
  [TILES.STAINED_RED]: (t) => { pGlass(t); for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) if (t.rng() < 0.4) setPx(t, x, y, [180, 40, 40]); },
  [TILES.STAINED_BLUE]: (t) => { pGlass(t); for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) if (t.rng() < 0.4) setPx(t, x, y, [40, 80, 180]); },
  [TILES.STAINED_GREEN]: (t) => { pGlass(t); for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) if (t.rng() < 0.4) setPx(t, x, y, [40, 140, 60]); },
  [TILES.STAINED_YELLOW]: (t) => { pGlass(t); for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) if (t.rng() < 0.4) setPx(t, x, y, [220, 200, 60]); },
  [TILES.STAINED_GLASS]: (t) => { pGlass(t); sprinkle(t, [180, 100, 200], 0.1); sprinkle(t, [100, 180, 200], 0.1); sprinkle(t, [200, 200, 100], 0.1); },

  // Bamboo, willow, rice
  [TILES.BAMBOO]: (t) => { fillBase(t, [110, 170, 60]); for (let y = 0; y < TILE_SIZE; y += 5) for (let x = 0; x < TILE_SIZE; x++) setPx(t, x, y, [70, 130, 40]); sprinkle(t, [80, 140, 50], 0.1); },
  [TILES.BAMBOO_LEAF]: (t) => pLeaves(t, [110, 170, 60], [70, 130, 40], [140, 200, 80]),
  [TILES.RICE]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let i = 0; i < 4; i++) { const x = 3 + i * 3; for (let y = 4; y < 16; y++) setPx(t, x, y, [140, 180, 70]); } },
  [TILES.LEAVES_WILLOW]: (t) => pLeaves(t, [120, 160, 70], [80, 120, 50], [160, 200, 90]),
  [TILES.WILLOW_BRANCH]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let i = 0; i < 6; i++) { let x = Math.floor(t.rng() * 6); let y = 0; for (let j = 0; j < 16; j++) { setPx(t, x, y, [80, 130, 50]); x += t.rng() > 0.5 ? 1 : 0; y++; } } },
  [TILES.LEAVES_PEAR]: (t) => pLeaves(t, [80, 140, 60], [50, 100, 40], [110, 170, 80]),
  [TILES.LEAVES_PLUM]: (t) => pLeaves(t, [120, 90, 130], [80, 60, 90], [160, 130, 170]),

  // Debug / fallback
  [TILES.MISSING]: pMissing,
  [TILES.GRID]: (t) => { t.ctx.clearRect(t.ox, t.oy, TILE_SIZE, TILE_SIZE); for (let i = 0; i < TILE_SIZE; i++) { setPx(t, i, 0, [255, 255, 255]); setPx(t, 0, i, [255, 255, 255]); setPx(t, i, TILE_SIZE - 1, [255, 255, 255]); setPx(t, TILE_SIZE - 1, i, [255, 255, 255]); } },
};

// Build the atlas into a single canvas. Returns the canvas.
export function buildAtlasCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_W;
  canvas.height = ATLAS_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let tileIdx = 0; tileIdx < 256; tileIdx++) {
    const col = tileIdx % ATLAS_COLS;
    const row = Math.floor(tileIdx / ATLAS_COLS);
    const ox = col * TILE_SIZE;
    const oy = row * TILE_SIZE;
    const t: TileCtx = { ctx, ox, oy, rng: tileRng(tileIdx) };

    const painter = TILE_PAINTERS[tileIdx];
    if (painter) {
      painter(t);
    } else {
      // No painter - render as missing
      pMissing(t);
    }
  }

  return canvas;
}

// Compute UV rectangle for a tile index, padded to avoid bleeding.
// Returns [u0, v0, u1, v1] in atlas space [0..1].
export function tileUV(tileIdx: number): [number, number, number, number] {
  const col = tileIdx % ATLAS_COLS;
  const row = Math.floor(tileIdx / ATLAS_COLS);
  const pad = 0.5 / ATLAS_W; // half-texel padding to prevent bleed
  const u0 = (col * TILE_SIZE) / ATLAS_W + pad;
  const v1 = 1 - (row * TILE_SIZE) / ATLAS_H - pad;
  const u1 = ((col + 1) * TILE_SIZE) / ATLAS_W - pad;
  const v0 = 1 - ((row + 1) * TILE_SIZE) / ATLAS_H + pad;
  return [u0, v0, u1, v1];
}

// Build a THREE.CanvasTexture from the atlas. Caches the result.
let cachedTexture: THREE.CanvasTexture | null = null;

export function getAtlasTexture(): THREE.CanvasTexture {
  if (cachedTexture) return cachedTexture;
  const canvas = buildAtlasCanvas();
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedTexture = tex;
  return tex;
}
