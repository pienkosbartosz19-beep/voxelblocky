import type { BlockDef, BlockType, CraftingRecipe, Quest } from './types';
import { TILES } from './textureAtlas';
import { WORLD_CONFIG } from './config';

// Helper: many blocks share the same tile for all faces.
function cube(name: string, tile: number, color: string, opts: Partial<BlockDef> = {}): BlockDef {
  return {
    id: name as BlockType,
    name,
    color,
    tiles: { all: tile },
    solid: true,
    breakable: true,
    tool: 'hand',
    hardness: 1.0,
    ...opts,
  } as BlockDef;
}

// Helper: grass-style block (top / side / bottom different)
function grassyBlock(name: string, topTile: number, sideTile: number, bottomTile: number, color: string, sideColor: string, bottomColor: string, opts: Partial<BlockDef> = {}): BlockDef {
  return {
    id: name as BlockType,
    name,
    color,
    sideColor,
    bottomColor,
    tiles: { top: topTile, side: sideTile, bottom: bottomTile },
    solid: true,
    breakable: true,
    tool: 'shovel',
    hardness: 0.6,
    ...opts,
  } as BlockDef;
}

// Helper: wood block (bark sides + rings on top/bottom)
function woodBlock(name: string, sideTile: number, topTile: number, color: string, sideColor: string): BlockDef {
  return {
    id: name as BlockType,
    name,
    color,
    sideColor,
    bottomColor: sideColor,
    tiles: { top: topTile, side: sideTile, bottom: topTile },
    solid: true,
    breakable: true,
    tool: 'axe',
    hardness: 1.2,
    isWood: true,
  } as BlockDef;
}

// Helper: leaves
function leavesBlock(name: string, tile: number, color: string): BlockDef {
  return {
    id: name as BlockType,
    name,
    color,
    tiles: { all: tile },
    solid: true,
    breakable: true,
    tool: 'hand',
    hardness: 0.2,
    transparent: true,
    isLeaves: true,
    drops: [{ item: name as BlockType, count: 1 }],
  } as BlockDef;
}

// Helper: cross-shape plant
function crossPlant(name: string, tile: number, color: string, hardness = 0.1): BlockDef {
  return {
    id: name as BlockType,
    name,
    color,
    tiles: { all: tile },
    solid: false,
    breakable: true,
    tool: 'hand',
    hardness,
    transparent: true,
    variant: 'cross',
    drops: [{ item: name as BlockType, count: 1 }],
  } as BlockDef;
}

export const BLOCKS: Record<BlockType, BlockDef> = {
  air: {
    id: 'air', name: 'Powietrze', color: '#000000', solid: false, breakable: false, hardness: 0, transparent: true,
  },

  // === Terrain - grass & dirt variants ===
  grass: grassyBlock('grass', TILES.GRASS_TOP, TILES.GRASS_SIDE, TILES.DIRT, '#5fa843', '#7a5a3a', '#7a5a3a', { drops: [{ item: 'dirt', count: 1 }] }),
  grass_autumn: grassyBlock('grass_autumn', TILES.GRASS_AUTUMN_TOP, TILES.GRASS_AUTUMN_SIDE, TILES.DIRT, '#c8963c', '#7a5a3a', '#7a5a3a', { drops: [{ item: 'dirt', count: 1 }] }),
  grass_withered: grassyBlock('grass_withered', TILES.GRASS_WITHERED_TOP, TILES.GRASS_WITHERED_SIDE, TILES.DIRT, '#8c7838', '#7a5a3a', '#7a5a3a', { drops: [{ item: 'dirt', count: 1 }] }),
  grass_spring: grassyBlock('grass_spring', TILES.GRASS_SPRING_TOP, TILES.GRASS_SPRING_SIDE, TILES.DIRT, '#6eb440', '#7a5a3a', '#7a5a3a', { drops: [{ item: 'dirt', count: 1 }] }),
  snow_grass: grassyBlock('snow_grass', TILES.SNOW_GRASS_TOP, TILES.SNOW_GRASS_SIDE, TILES.DIRT, '#f5f7fa', '#7a5a3a', '#7a5a3a', { drops: [{ item: 'dirt', count: 1 }] }),
  dirt: cube('dirt', TILES.DIRT, '#7a5a3a', { tool: 'shovel', hardness: 0.5, drops: [{ item: 'dirt', count: 1 }] }),
  dirt_dark: cube('dirt_dark', TILES.DIRT_DARK, '#503723', { tool: 'shovel', hardness: 0.5, drops: [{ item: 'dirt_dark', count: 1 }] }),
  dirt_path: cube('dirt_path', TILES.DIRT_PATH, '#8a6a40', { tool: 'shovel', hardness: 0.4, drops: [{ item: 'dirt', count: 1 }] }),
  mud: cube('mud', TILES.MUD, '#503c28', { tool: 'shovel', hardness: 0.6, drops: [{ item: 'dirt', count: 1 }] }),
  mud_dry: cube('mud_dry', TILES.MUD_DRY, '#6e5032', { tool: 'shovel', hardness: 0.7, drops: [{ item: 'dirt', count: 1 }] }),

  // === Terrain - stone variants ===
  stone: cube('stone', TILES.STONE, '#8a8a8a', { tool: 'pickaxe', minToolTier: 1, hardness: 1.5, drops: [{ item: 'cobblestone', count: 1 }] }),
  cobblestone: cube('cobblestone', TILES.COBBLESTONE, '#6e6e6e', { tool: 'pickaxe', minToolTier: 1, hardness: 2.0, drops: [{ item: 'cobblestone', count: 1 }] }),
  mossy_stone: cube('mossy_stone', TILES.MOSSY_STONE, '#5a7a52', { tool: 'pickaxe', minToolTier: 1, hardness: 1.8, drops: [{ item: 'cobblestone', count: 1 }] }),
  mossy_cobble: cube('mossy_cobble', TILES.MOSSY_COBBLE, '#5a7a52', { tool: 'pickaxe', minToolTier: 1, hardness: 2.2, drops: [{ item: 'mossy_cobble', count: 1 }] }),
  cracked_stone: cube('cracked_stone', TILES.CRACKED_STONE, '#7a7a7a', { tool: 'pickaxe', minToolTier: 1, hardness: 1.4, drops: [{ item: 'cobblestone', count: 1 }] }),
  granite: cube('granite', TILES.GRANITE, '#b46e64', { tool: 'pickaxe', minToolTier: 1, hardness: 1.6, drops: [{ item: 'granite', count: 1 }] }),
  marble: cube('marble', TILES.MARBLE, '#e6e6eb', { tool: 'pickaxe', minToolTier: 2, hardness: 2.0, drops: [{ item: 'marble', count: 1 }] }),
  slate: cube('slate', TILES.SLATE, '#464b55', { tool: 'pickaxe', minToolTier: 1, hardness: 1.8, drops: [{ item: 'slate', count: 1 }] }),
  bedrock: cube('bedrock', TILES.BEDROCK, '#2a2a2a', { breakable: false, hardness: 999 }),
  bedrock_dark: cube('bedrock_dark', TILES.BEDROCK_DARK, '#1a1a1a', { breakable: false, hardness: 999 }),

  // === Terrain - sand & gravel ===
  sand: cube('sand', TILES.SAND, '#e6d59a', { tool: 'shovel', hardness: 0.4, drops: [{ item: 'sand', count: 1 }] }),
  red_sand: cube('red_sand', TILES.RED_SANDSTONE, '#b4543c', { tool: 'shovel', hardness: 0.4, drops: [{ item: 'red_sand', count: 1 }] }),
  sandstone: cube('sandstone', TILES.SANDSTONE, '#dcc296', { tool: 'pickaxe', minToolTier: 1, hardness: 1.2, drops: [{ item: 'sandstone', count: 1 }] }),
  gravel: cube('gravel', TILES.GRAVEL, '#787878', { tool: 'shovel', hardness: 0.5, drops: [{ item: 'gravel', count: 1 }] }),
  clay: cube('clay', TILES.CLAY, '#a89580', { tool: 'shovel', hardness: 0.6, drops: [{ item: 'clay', count: 1 }] }),
  terracotta: cube('terracotta', TILES.TERRACOTTA, '#aa6446', { tool: 'pickaxe', minToolTier: 1, hardness: 1.4, drops: [{ item: 'terracotta', count: 1 }] }),

  // === Snow & ice ===
  snow: cube('snow', TILES.SNOW, '#f5f7fa', { tool: 'shovel', hardness: 0.3, drops: [{ item: 'snow', count: 1 }] }),
  snow_dirty: cube('snow_dirty', TILES.SNOW_DIRTY, '#c8c8d0', { tool: 'shovel', hardness: 0.3, drops: [{ item: 'snow', count: 1 }] }),
  ice: { id: 'ice', name: 'Lód', color: '#a3d4ff', tiles: { all: TILES.ICE }, solid: true, breakable: true, tool: 'pickaxe', minToolTier: 1, hardness: 0.5, transparent: true, drops: [{ item: 'ice', count: 1 }] },
  ice_packed: cube('ice_packed', TILES.ICE_PACKED, '#7eb8e8', { tool: 'pickaxe', minToolTier: 1, hardness: 1.0, transparent: true, drops: [{ item: 'ice_packed', count: 1 }] }),
  ice_blue: cube('ice_blue', TILES.ICE_BLUE, '#5a9cd6', { tool: 'pickaxe', minToolTier: 2, hardness: 1.2, transparent: true, drops: [{ item: 'ice_blue', count: 1 }] }),

  // === Water & liquids ===
  water: { id: 'water', name: 'Woda', color: '#2d7fd6', tiles: { all: TILES.WATER }, solid: false, breakable: false, hardness: 0, transparent: true, opacity: 0.7 },
  magma: { id: 'magma', name: 'Magma', color: '#dc5014', tiles: { all: TILES.MAGMA }, solid: false, breakable: false, hardness: 0, transparent: false, light: 15 },
  obsidian: cube('obsidian', TILES.OBSIDIAN, '#191423', { tool: 'pickaxe', minToolTier: 4, hardness: 6.0, drops: [{ item: 'obsidian', count: 1 }] }),
  ash: cube('ash', TILES.ASH, '#504b4b', { tool: 'shovel', hardness: 0.3, drops: [{ item: 'ash', count: 1 }] }),
  scorched: cube('scorched', TILES.SCORCHED, '#281c16', { tool: 'pickaxe', minToolTier: 1, hardness: 1.0, drops: [{ item: 'scorched', count: 1 }] }),
  slag: cube('slag', TILES.SLAG, '#3c3232', { tool: 'pickaxe', minToolTier: 2, hardness: 1.5, drops: [{ item: 'slag', count: 1 }] }),

  // === Ores ===
  coal_ore: cube('coal_ore', TILES.COAL_ORE, '#1a1a1a', { tool: 'pickaxe', minToolTier: 1, hardness: 2.5, drops: [{ item: 'coal_block', count: 1 }] }),
  iron_ore: cube('iron_ore', TILES.IRON_ORE, '#c8a8a0', { tool: 'pickaxe', minToolTier: 2, hardness: 3.0, drops: [{ item: 'iron_ore', count: 1 }] }),
  copper_ore: cube('copper_ore', TILES.COPPER_ORE, '#c97b4a', { tool: 'pickaxe', minToolTier: 2, hardness: 3.0, drops: [{ item: 'copper_ore', count: 1 }] }),
  gold_ore: cube('gold_ore', TILES.GOLD_ORE, '#f7d046', { tool: 'pickaxe', minToolTier: 4, hardness: 4.0, drops: [{ item: 'gold_ore', count: 1 }] }),
  diamond_ore: cube('diamond_ore', TILES.DIAMOND_ORE, '#4ef0e3', { tool: 'pickaxe', minToolTier: 5, hardness: 8.0, drops: [{ item: 'diamond_ore', count: 1 }] }),
  sulfur_ore: cube('sulfur_ore', TILES.SULFUR_ORE, '#dcdc64', { tool: 'pickaxe', minToolTier: 2, hardness: 2.0, drops: [{ item: 'sulfur_ore', count: 1 }] }),
  mithril_ore: cube('mithril_ore', TILES.MITHRIL_ORE, '#78c8dc', { tool: 'pickaxe', minToolTier: 5, hardness: 9.0, drops: [{ item: 'mithril_ore', count: 1 }] }),
  tin_ore: cube('tin_ore', TILES.TIN_ORE, '#c8c8c8', { tool: 'pickaxe', minToolTier: 2, hardness: 2.5, drops: [{ item: 'tin_ore', count: 1 }] }),
  zinc_ore: cube('zinc_ore', TILES.ZINC_ORE, '#b4b4c8', { tool: 'pickaxe', minToolTier: 2, hardness: 2.5, drops: [{ item: 'zinc_ore', count: 1 }] }),
  salt_ore: cube('salt_ore', TILES.SALT_ORE, '#f0f0f5', { tool: 'pickaxe', minToolTier: 1, hardness: 1.5, drops: [{ item: 'salt_ore', count: 1 }] }),

  // === Wood - oak (dąb) ===
  wood_oak: woodBlock('wood_oak', TILES.WOOD_OAK_SIDE, TILES.WOOD_OAK_TOP, '#6b4a2e', '#5a3d27'),
  planks_oak: cube('planks_oak', TILES.PLANKS_OAK, '#b5894d', { tool: 'axe', hardness: 1.0, drops: [{ item: 'planks_oak', count: 1 }] }),
  leaves_oak: leavesBlock('leaves_oak', TILES.LEAVES_OAK, '#3d7a2f'),
  sapling_oak: crossPlant('sapling_oak', TILES.SAPLING_OAK, '#3d7a2f', 0.05),

  // === Wood - pine (sosna) ===
  wood_pine: woodBlock('wood_pine', TILES.WOOD_PINE_SIDE, TILES.WOOD_PINE_TOP, '#503723', '#321e14'),
  planks_pine: cube('planks_pine', TILES.PLANKS_PINE, '#8c5f37', { tool: 'axe', hardness: 1.0, drops: [{ item: 'planks_pine', count: 1 }] }),
  leaves_pine: leavesBlock('leaves_pine', TILES.LEAVES_PINE, '#285a32'),
  sapling_pine: crossPlant('sapling_pine', TILES.SAPLING_PINE, '#285a32', 0.05),

  // === Wood - spruce (świerk) ===
  wood_spruce: woodBlock('wood_spruce', TILES.WOOD_SPRUCE_SIDE, TILES.WOOD_SPRUCE_TOP, '#5a3c28', '#372319'),
  planks_spruce: cube('planks_spruce', TILES.PLANKS_SPRUCE, '#96643c', { tool: 'axe', hardness: 1.0, drops: [{ item: 'planks_spruce', count: 1 }] }),
  leaves_spruce: leavesBlock('leaves_spruce', TILES.LEAVES_SPRUCE, '#234b2d'),

  // === Wood - birch (brzoza) ===
  wood_birch: woodBlock('wood_birch', TILES.WOOD_BIRCH_SIDE, TILES.WOOD_BIRCH_TOP, '#e1dcde', '#b4afa9'),
  planks_birch: cube('planks_birch', TILES.PLANKS_BIRCH, '#d2c8be', { tool: 'axe', hardness: 1.0, drops: [{ item: 'planks_birch', count: 1 }] }),
  leaves_birch: leavesBlock('leaves_birch', TILES.LEAVES_BIRCH, '#5a9646'),
  sapling_birch: crossPlant('sapling_birch', TILES.SAPLING_BIRCH, '#5a9646', 0.05),

  // === Autumn leaves (matching Lay of the Land reference) ===
  leaves_autumn_yellow: leavesBlock('leaves_autumn_yellow', TILES.LEAVES_AUTUMN_YELLOW, '#e6b428'),
  leaves_autumn_orange: leavesBlock('leaves_autumn_orange', TILES.LEAVES_AUTUMN_ORANGE, '#dc6e1e'),
  leaves_autumn_red: leavesBlock('leaves_autumn_red', TILES.LEAVES_AUTUMN_RED, '#b43228'),
  leaves_autumn_mixed: leavesBlock('leaves_autumn_mixed', TILES.LEAVES_AUTUMN_MIXED, '#c86428'),
  leaves_dry: leavesBlock('leaves_dry', TILES.LEAVES_DRY, '#a06e32'),
  leaves_cherry: leavesBlock('leaves_cherry', TILES.LEAVES_CHERRY, '#f0b4c8'),
  leaves_apple: leavesBlock('leaves_apple', TILES.LEAVES_APPLE, '#508c3c'),
  leaves_willow: leavesBlock('leaves_willow', TILES.LEAVES_WILLOW, '#78a046'),

  // === Plants & decoration ===
  bush: { id: 'bush', name: 'Krzew', color: '#468232', tiles: { all: TILES.BUSH }, solid: false, breakable: true, tool: 'hand', hardness: 0.2, transparent: true, variant: 'cross', drops: [{ item: 'leaves_oak', count: 1 }] },
  bush_berry: { id: 'bush_berry', name: 'Krzew z Owocami', color: '#468232', tiles: { all: TILES.BUSH_BERRY }, solid: false, breakable: true, tool: 'hand', hardness: 0.2, transparent: true, variant: 'cross', drops: [{ item: 'bush_berry', count: 1 }] },
  berry_bush: { id: 'berry_bush', name: 'Borówka', color: '#3c6e2d', tiles: { all: TILES.BERRY_BUSH }, solid: false, breakable: true, tool: 'hand', hardness: 0.2, transparent: true, variant: 'cross', drops: [{ item: 'berry_bush', count: 1 }] },
  fern: crossPlant('fern', TILES.FERN, '#327a28', 0.1),
  dead_bush: crossPlant('dead_bush', TILES.DEAD_BUSH, '#78502d', 0.1),
  tall_grass: crossPlant('tall_grass', TILES.TALL_GRASS, '#5fa843', 0.05),
  reed: crossPlant('reed', TILES.REED, '#78502d', 0.1),
  lavender: crossPlant('lavender', TILES.LAVENDER, '#8c5ab4', 0.1),
  water_lily: { id: 'water_lily', name: 'Lilia Wodna', color: '#3c823c', tiles: { all: TILES.WATER_LILY }, solid: false, breakable: true, tool: 'hand', hardness: 0.1, transparent: true, variant: 'cross', drops: [{ item: 'water_lily', count: 1 }] },
  lily_pad: { id: 'lily_pad', name: 'Liść Liliowy', color: '#3c823c', tiles: { all: TILES.LILY_PAD }, solid: false, breakable: true, tool: 'hand', hardness: 0.1, transparent: true, variant: 'cross', drops: [{ item: 'lily_pad', count: 1 }] },
  vines: { id: 'vines', name: 'Pnącza', color: '#326e28', tiles: { all: TILES.VINES }, solid: false, breakable: true, tool: 'hand', hardness: 0.1, transparent: true, variant: 'cross', drops: [{ item: 'vines', count: 1 }] },

  // Flowers
  flower_red: crossPlant('flower_red', TILES.FLOWER_RED, '#e63946', 0.05),
  flower_yellow: crossPlant('flower_yellow', TILES.FLOWER_YELLOW, '#f7c948', 0.05),
  flower_white: crossPlant('flower_white', TILES.FLOWER_WHITE, '#f0f0f0', 0.05),
  flower_purple: crossPlant('flower_purple', TILES.FLOWER_PURPLE, '#9c4dcc', 0.05),
  flower_blue: crossPlant('flower_blue', TILES.FLOWER_BLUE, '#3c6edc', 0.05),

  // Mushrooms
  mushroom_brown: crossPlant('mushroom_brown', TILES.MUSHROOM_BROWN, '#c97b4a', 0.05),
  mushroom_red: crossPlant('mushroom_red', TILES.MUSHROOM_RED, '#dc3c3c', 0.05),
  mushroom_bush: { id: 'mushroom_bush', name: 'Kolonia Grzybów', color: '#c97b4a', tiles: { all: TILES.MUSHROOM_BROWN }, solid: false, breakable: true, tool: 'hand', hardness: 0.1, transparent: true, variant: 'cross', drops: [{ item: 'mushroom_brown', count: 2 }] },

  // Cactus & pumpkin
  cactus: cube('cactus', TILES.CACTUS_SIDE, '#3d7a4a', { tool: 'hand', hardness: 0.4, drops: [{ item: 'cactus', count: 1 }], transparent: true }),
  pumpkin: { id: 'pumpkin', name: 'Dynia', color: '#e6772a', sideColor: '#dc6e1e', tiles: { top: TILES.PUMPKIN_TOP, side: TILES.PUMPKIN_SIDE, bottom: TILES.PUMPKIN_SIDE }, solid: true, breakable: true, tool: 'axe', hardness: 0.6, drops: [{ item: 'pumpkin', count: 1 }] },
  pumpkin_carved: { id: 'pumpkin_carved', name: 'Wyryta Dynia', color: '#e6772a', sideColor: '#dc6e1e', tiles: { top: TILES.PUMPKIN_TOP, side: TILES.PUMPKIN_FACE, bottom: TILES.PUMPKIN_SIDE }, solid: true, breakable: true, tool: 'axe', hardness: 0.6, light: 12, drops: [{ item: 'pumpkin_carved', count: 1 }] },
  pinecone: crossPlant('pinecone', TILES.PINECONE, '#78502d', 0.1),
  fallen_leaves: cube('fallen_leaves', TILES.FALLEN_LEAVES, '#b46e28', { tool: 'hand', hardness: 0.1, drops: [{ item: 'leaves_oak', count: 1 }], transparent: true }),
  leaf_pile: cube('leaf_pile', TILES.LEAF_PILE, '#78963c', { tool: 'hand', hardness: 0.1, drops: [{ item: 'leaves_oak', count: 1 }], transparent: true }),

  // Rocks & crystals
  rock_moss: cube('rock_moss', TILES.ROCK_MOSS, '#5a7a52', { tool: 'pickaxe', minToolTier: 1, hardness: 1.5, drops: [{ item: 'cobblestone', count: 1 }] }),
  pebbles: crossPlant('pebbles', TILES.PEBBLES, '#8c8c8c', 0.1),
  boulder: cube('boulder', TILES.BOULDER, '#6e6e6e', { tool: 'pickaxe', minToolTier: 1, hardness: 2.0, drops: [{ item: 'cobblestone', count: 2 }] }),
  stalagmite: cube('stalagmite', TILES.STALAGMITE, '#6e6e6e', { tool: 'pickaxe', minToolTier: 1, hardness: 1.2, drops: [{ item: 'cobblestone', count: 1 }] }),
  crystal_blue: { id: 'crystal_blue', name: 'Niebieski Kryształ', color: '#64c8f0', tiles: { all: TILES.CRYSTAL_BLUE }, solid: true, breakable: true, tool: 'pickaxe', minToolTier: 3, hardness: 2.5, transparent: true, light: 8, drops: [{ item: 'crystal_blue', count: 1 }] },
  crystal_purple: { id: 'crystal_purple', name: 'Fioletowy Kryształ', color: '#b464dc', tiles: { all: TILES.CRYSTAL_PURPLE }, solid: true, breakable: true, tool: 'pickaxe', minToolTier: 3, hardness: 2.5, transparent: true, light: 8, drops: [{ item: 'crystal_purple', count: 1 }] },
  crystal_green: { id: 'crystal_green', name: 'Zielony Kryształ', color: '#64dc82', tiles: { all: TILES.CRYSTAL_GREEN }, solid: true, breakable: true, tool: 'pickaxe', minToolTier: 3, hardness: 2.5, transparent: true, light: 8, drops: [{ item: 'crystal_green', count: 1 }] },
  geode: cube('geode', TILES.GEODE, '#78467a', { tool: 'pickaxe', minToolTier: 3, hardness: 3.0, drops: [{ item: 'crystal_purple', count: 1 }] }),
  root: { id: 'root', name: 'Korzeń', color: '#5a3c25', tiles: { all: TILES.ROOT }, solid: false, breakable: true, tool: 'hand', hardness: 0.2, transparent: true, variant: 'cross', drops: [{ item: 'root', count: 1 }] },
  stump: cube('stump', TILES.STUMP, '#5a3c25', { tool: 'axe', hardness: 1.0, drops: [{ item: 'wood_oak', count: 1 }] }),

  // === Light sources ===
  torch: { id: 'torch', name: 'Pochodnia', color: '#ffce5e', tiles: { all: TILES.TORCH }, solid: false, breakable: true, tool: 'hand', hardness: 0.1, transparent: true, light: 14, variant: 'thin', drops: [{ item: 'torch', count: 1 }] },
  lantern: { id: 'lantern', name: 'Latarenka', color: '#ffd56e', tiles: { all: TILES.LANTERN }, solid: true, breakable: true, tool: 'hand', hardness: 0.3, transparent: true, light: 15, drops: [{ item: 'lantern', count: 1 }] },

  // === Glass ===
  glass: { id: 'glass', name: 'Szkło', color: '#cae3f5', tiles: { all: TILES.GLASS }, solid: true, breakable: true, tool: 'hand', hardness: 0.3, transparent: true, opacity: 0.3, drops: [] },
  glass_tinted: { id: 'glass_tinted', name: 'Przyciemniane Szkło', color: '#1e1e32', tiles: { all: TILES.GLASS_TINTED }, solid: true, breakable: true, tool: 'hand', hardness: 0.3, transparent: true, opacity: 0.5, drops: [{ item: 'glass_tinted', count: 1 }] },
  stained_red: { id: 'stained_red', name: 'Czerwone Witrażowe', color: '#b42828', tiles: { all: TILES.STAINED_RED }, solid: true, breakable: true, tool: 'hand', hardness: 0.3, transparent: true, opacity: 0.5, drops: [{ item: 'stained_red', count: 1 }] },
  stained_blue: { id: 'stained_blue', name: 'Niebieskie Witrażowe', color: '#2850b4', tiles: { all: TILES.STAINED_BLUE }, solid: true, breakable: true, tool: 'hand', hardness: 0.3, transparent: true, opacity: 0.5, drops: [{ item: 'stained_blue', count: 1 }] },
  stained_green: { id: 'stained_green', name: 'Zielone Witrażowe', color: '#28823c', tiles: { all: TILES.STAINED_GREEN }, solid: true, breakable: true, tool: 'hand', hardness: 0.3, transparent: true, opacity: 0.5, drops: [{ item: 'stained_green', count: 1 }] },
  stained_yellow: { id: 'stained_yellow', name: 'Żółte Witrażowe', color: '#dcc83c', tiles: { all: TILES.STAINED_YELLOW }, solid: true, breakable: true, tool: 'hand', hardness: 0.3, transparent: true, opacity: 0.5, drops: [{ item: 'stained_yellow', count: 1 }] },

  // === Bricks & crafted blocks ===
  brick: cube('brick', TILES.BRICK, '#96463c', { tool: 'pickaxe', minToolTier: 1, hardness: 1.8, drops: [{ item: 'brick', count: 1 }] }),
  brick_mossy: cube('brick_mossy', TILES.BRICK_MOSSY, '#7a403a', { tool: 'pickaxe', minToolTier: 1, hardness: 2.0, drops: [{ item: 'brick_mossy', count: 1 }] }),
  sandstone_brick: cube('sandstone_brick', TILES.SANDSTONE_BRICK, '#dcc89c', { tool: 'pickaxe', minToolTier: 1, hardness: 1.4, drops: [{ item: 'sandstone_brick', count: 1 }] }),
  stone_brick: cube('stone_brick', TILES.STONE_BRICK, '#787878', { tool: 'pickaxe', minToolTier: 1, hardness: 1.6, drops: [{ item: 'stone_brick', count: 1 }] }),
  stone_brick_mossy: cube('stone_brick_mossy', TILES.STONE_BRICK_MOSSY, '#6e6e5a', { tool: 'pickaxe', minToolTier: 1, hardness: 1.8, drops: [{ item: 'stone_brick_mossy', count: 1 }] }),
  cobble_wall: cube('cobble_wall', TILES.COBBLE_WALL, '#6e6e6e', { tool: 'pickaxe', minToolTier: 1, hardness: 2.0, drops: [{ item: 'cobble_wall', count: 1 }] }),
  clay_brick: cube('clay_brick', TILES.CLAY_BRICK, '#b46e50', { tool: 'pickaxe', minToolTier: 1, hardness: 1.6, drops: [{ item: 'clay_brick', count: 1 }] }),
  roof_tile: cube('roof_tile', TILES.ROOF_TILE, '#8c3c28', { tool: 'pickaxe', minToolTier: 1, hardness: 1.6, drops: [{ item: 'roof_tile', count: 1 }] }),
  tile_roof_red: cube('tile_roof_red', TILES.TILE_ROOF_RED, '#8c3c28', { tool: 'pickaxe', minToolTier: 1, hardness: 1.6, drops: [{ item: 'tile_roof_red', count: 1 }] }),
  tile_roof_blue: cube('tile_roof_blue', TILES.TILE_ROOF_BLUE, '#32508c', { tool: 'pickaxe', minToolTier: 1, hardness: 1.6, drops: [{ item: 'tile_roof_blue', count: 1 }] }),
  tile_roof_green: cube('tile_roof_green', TILES.TILE_ROOF_GREEN, '#32823c', { tool: 'pickaxe', minToolTier: 1, hardness: 1.6, drops: [{ item: 'tile_roof_green', count: 1 }] }),
  tile_roof_gray: cube('tile_roof_gray', TILES.TILE_ROOF_GRAY, '#6e6e6e', { tool: 'pickaxe', minToolTier: 1, hardness: 1.6, drops: [{ item: 'tile_roof_gray', count: 1 }] }),
  planks_dark: cube('planks_dark', TILES.WOOD_PLANK_DARK, '#644123', { tool: 'axe', hardness: 1.2, drops: [{ item: 'planks_dark', count: 1 }] }),
  wood_beam: cube('wood_beam', TILES.WOOD_BEAM, '#78502d', { tool: 'axe', hardness: 1.5, drops: [{ item: 'wood_beam', count: 1 }] }),
  thatch: cube('thatch', TILES.THATCH, '#b49646', { tool: 'axe', hardness: 0.6, drops: [{ item: 'thatch', count: 1 }] }),
  straw_bale: cube('straw_bale', TILES.STRAW_BALE, '#dcbe64', { tool: 'axe', hardness: 0.5, drops: [{ item: 'straw_bale', count: 1 }] }),

  // === Workstations ===
  workbench: { id: 'workbench', name: 'Stół Warsztatowy', color: '#b5894d', sideColor: '#a47a44', bottomColor: '#a47a44', tiles: { top: TILES.WORKBENCH_TOP, side: TILES.WORKBENCH_FRONT, bottom: TILES.WORKBENCH_SIDE }, solid: true, breakable: true, tool: 'axe', hardness: 1.2, workstation: 'workbench', drops: [{ item: 'workbench', count: 1 }] },
  furnace: { id: 'furnace', name: 'Piec Hutniczy', color: '#8a8a8a', sideColor: '#787878', bottomColor: '#787878', tiles: { top: TILES.FURNACE_TOP, side: TILES.FURNACE_FRONT, bottom: TILES.FURNACE_SIDE }, solid: true, breakable: true, tool: 'pickaxe', minToolTier: 1, hardness: 2.5, workstation: 'furnace', drops: [{ item: 'furnace', count: 1 }] },
  anvil: { id: 'anvil', name: 'Kowadło', color: '#46464b', sideColor: '#3c3c41', bottomColor: '#3c3c41', tiles: { top: TILES.ANVIL_TOP, side: TILES.ANVIL_SIDE, bottom: TILES.ANVIL_SIDE }, solid: true, breakable: true, tool: 'pickaxe', minToolTier: 2, hardness: 3.5, workstation: 'anvil', drops: [{ item: 'anvil', count: 1 }] },
  forge: { id: 'forge', name: 'Kuźnia', color: '#787878', sideColor: '#646464', bottomColor: '#646464', tiles: { top: TILES.FURNACE_TOP, side: TILES.FORGE_FRONT, bottom: TILES.FURNACE_SIDE }, solid: true, breakable: true, tool: 'pickaxe', minToolTier: 2, hardness: 3.0, workstation: 'forge', light: 8, drops: [{ item: 'forge', count: 1 }] },
  chest: { id: 'chest', name: 'Skrzynia', color: '#a47a44', sideColor: '#8c6638', bottomColor: '#8c6638', tiles: { top: TILES.CHEST_TOP, side: TILES.CHEST_FRONT, bottom: TILES.CHEST_SIDE }, solid: true, breakable: true, tool: 'axe', hardness: 1.2, drops: [{ item: 'chest', count: 1 }] },
  bookshelf: cube('bookshelf', TILES.BOOKSHELF, '#a47a44', { tool: 'axe', hardness: 1.2, drops: [{ item: 'bookshelf', count: 1 }] }),
  crate: cube('crate', TILES.CRATE, '#966e3c', { tool: 'axe', hardness: 1.0, drops: [{ item: 'crate', count: 1 }] }),
  barrel: cube('barrel', TILES.BARREL, '#8c5f32', { tool: 'axe', hardness: 1.0, drops: [{ item: 'barrel', count: 1 }] }),
  loom: cube('loom', TILES.LOOM, '#966e3c', { tool: 'axe', hardness: 1.0, drops: [{ item: 'loom', count: 1 }] }),

  // === Metal blocks ===
  copper_block: cube('copper_block', TILES.COPPER_BLOCK, '#c97b4a', { tool: 'pickaxe', minToolTier: 2, hardness: 2.5, drops: [{ item: 'copper_block', count: 1 }] }),
  bronze_block: cube('bronze_block', TILES.BRONZE_BLOCK, '#b4823c', { tool: 'pickaxe', minToolTier: 3, hardness: 3.0, drops: [{ item: 'bronze_block', count: 1 }] }),
  iron_block: cube('iron_block', TILES.IRON_BLOCK, '#c8c8d2', { tool: 'pickaxe', minToolTier: 3, hardness: 3.5, drops: [{ item: 'iron_block', count: 1 }] }),
  steel_block: cube('steel_block', TILES.STEEL_BLOCK, '#96a0aa', { tool: 'pickaxe', minToolTier: 4, hardness: 4.0, drops: [{ item: 'steel_block', count: 1 }] }),
  gold_block: cube('gold_block', TILES.GOLD_BLOCK, '#f7d046', { tool: 'pickaxe', minToolTier: 4, hardness: 3.0, drops: [{ item: 'gold_block', count: 1 }] }),
  silver_block: cube('silver_block', TILES.SILVER_BLOCK, '#dcdce6', { tool: 'pickaxe', minToolTier: 3, hardness: 3.0, drops: [{ item: 'silver_block', count: 1 }] }),
  mithril_block: cube('mithril_block', TILES.MITHRIL_BLOCK, '#78c8dc', { tool: 'pickaxe', minToolTier: 5, hardness: 4.5, drops: [{ item: 'mithril_block', count: 1 }] }),
  charcoal_block: cube('charcoal_block', TILES.CHARCOAL_BLOCK, '#28232c', { tool: 'pickaxe', minToolTier: 1, hardness: 1.5, drops: [{ item: 'charcoal_block', count: 1 }] }),
  coal_block: cube('coal_block', TILES.COAL_BLOCK, '#1a1a1a', { tool: 'pickaxe', minToolTier: 1, hardness: 1.8, drops: [{ item: 'coal_block', count: 1 }] }),

  // === Crops & food ===
  wheat: crossPlant('wheat', TILES.WHEAT, '#dcb450', 0.1),
  wheat_grown: crossPlant('wheat_grown', TILES.WHEAT_GROWN, '#dcb450', 0.1),
  carrot: crossPlant('carrot', TILES.CARROT, '#f08c32', 0.1),
  potato: crossPlant('potato', TILES.POTATO, '#b48c5a', 0.1),
  beetroot: crossPlant('beetroot', TILES.BEETROOT, '#96283c', 0.1),
  melon: cube('melon', TILES.MELON, '#508c32', { tool: 'axe', hardness: 0.8, drops: [{ item: 'melon', count: 1 }] }),
  bread: cube('bread', TILES.BREAD, '#c89650', { tool: 'hand', hardness: 0.2, drops: [{ item: 'bread', count: 1 }] }),
  cheese: cube('cheese', TILES.CHEESE, '#f0dc82', { tool: 'hand', hardness: 0.3, drops: [{ item: 'cheese', count: 1 }] }),
  honey_block: cube('honey_block', TILES.HONEY_BLOCK, '#f0c850', { tool: 'hand', hardness: 0.3, drops: [{ item: 'honey_block', count: 1 }] }),
  hay: cube('hay', TILES.HAY, '#dcbe64', { tool: 'axe', hardness: 0.5, drops: [{ item: 'hay', count: 1 }] }),

  // === Decoration ===
  carpet_red: cube('carpet_red', TILES.CARPET_RED, '#a02828', { tool: 'hand', hardness: 0.1, drops: [{ item: 'carpet_red', count: 1 }] }),
  carpet_blue: cube('carpet_blue', TILES.CARPET_BLUE, '#283ca0', { tool: 'hand', hardness: 0.1, drops: [{ item: 'carpet_blue', count: 1 }] }),
  carpet_green: cube('carpet_green', TILES.CARPET_GREEN, '#28823c', { tool: 'hand', hardness: 0.1, drops: [{ item: 'carpet_green', count: 1 }] }),
  curtain: cube('curtain', TILES.CURTAIN, '#8c2828', { tool: 'hand', hardness: 0.1, drops: [{ item: 'curtain', count: 1 }], transparent: true }),
  window: cube('window', TILES.WINDOW, '#cae3f5', { tool: 'hand', hardness: 0.3, drops: [{ item: 'window', count: 1 }], transparent: true }),
  door_wood: cube('door_wood', TILES.DOOR_WOOD, '#78502d', { tool: 'axe', hardness: 0.8, drops: [{ item: 'door_wood', count: 1 }] }),
  door_iron: cube('door_iron', TILES.DOOR_IRON, '#64646e', { tool: 'pickaxe', minToolTier: 2, hardness: 2.5, drops: [{ item: 'door_iron', count: 1 }] }),
  ladder: { id: 'ladder', name: 'Drabina', color: '#78502d', tiles: { all: TILES.LADDER }, solid: false, breakable: true, tool: 'axe', hardness: 0.3, transparent: true, variant: 'cross', drops: [{ item: 'ladder', count: 1 }] },
  fence_wood: cube('fence_wood', TILES.FENCE_WOOD, '#966e3c', { tool: 'axe', hardness: 0.8, drops: [{ item: 'fence_wood', count: 1 }] }),
  fence_stone: cube('fence_stone', TILES.FENCE_STONE, '#6e6e6e', { tool: 'pickaxe', minToolTier: 1, hardness: 1.8, drops: [{ item: 'fence_stone', count: 1 }] }),
  sign: cube('sign', TILES.SIGN, '#b48c50', { tool: 'axe', hardness: 0.6, drops: [{ item: 'sign', count: 1 }] }),
  banner: cube('banner', TILES.BANNER, '#8c1e28', { tool: 'hand', hardness: 0.3, drops: [{ item: 'banner', count: 1 }], transparent: true }),
  column_top: cube('column_top', TILES.COLUMN_TOP, '#dcdcd7', { tool: 'pickaxe', minToolTier: 1, hardness: 1.5, drops: [{ item: 'column_top', count: 1 }] }),
  column_mid: cube('column_mid', TILES.COLUMN_MID, '#dcdcd7', { tool: 'pickaxe', minToolTier: 1, hardness: 1.5, drops: [{ item: 'column_mid', count: 1 }] }),
  column_base: cube('column_base', TILES.COLUMN_BASE, '#c8c8c3', { tool: 'pickaxe', minToolTier: 1, hardness: 1.5, drops: [{ item: 'column_base', count: 1 }] }),
  shutter: cube('shutter', TILES.SHUTTER, '#784628', { tool: 'axe', hardness: 0.6, drops: [{ item: 'shutter', count: 1 }] }),
};

// Alias for backward-compatibility with old code that uses 'wood', 'planks', 'leaves'
// We don't include these as BlockType union members anymore, but provide a small compat layer:
export const BLOCK_ALIASES: Record<string, BlockType> = {
  wood: 'wood_oak',
  planks: 'planks_oak',
  leaves: 'leaves_oak',
  coal: 'coal_block',
  copper: 'copper_ore',
  iron: 'iron_ore',
  gold: 'gold_ore',
  diamond: 'diamond_ore',
  ice: 'ice',
};

// Hotbar / palette order — most useful blocks first
export const BLOCK_TYPES_ORDER: BlockType[] = [
  // Building essentials
  'grass', 'dirt', 'stone', 'cobblestone', 'sand', 'gravel', 'clay',
  'wood_oak', 'planks_oak', 'leaves_oak',
  'wood_pine', 'planks_pine', 'leaves_pine',
  'wood_spruce', 'planks_spruce', 'leaves_spruce',
  'wood_birch', 'planks_birch', 'leaves_birch',
  // Autumn leaves
  'leaves_autumn_yellow', 'leaves_autumn_orange', 'leaves_autumn_red', 'leaves_autumn_mixed',
  // Plants
  'bush', 'bush_berry', 'fern', 'tall_grass', 'reed', 'lavender', 'dead_bush',
  'flower_red', 'flower_yellow', 'flower_white', 'flower_purple', 'flower_blue',
  'mushroom_brown', 'mushroom_red',
  'cactus', 'pumpkin', 'pinecone',
  // Crafting stations
  'workbench', 'furnace', 'anvil', 'forge', 'chest', 'bookshelf', 'crate', 'barrel',
  // Crafted blocks
  'glass', 'brick', 'stone_brick', 'sandstone_brick', 'cobble_wall', 'roof_tile',
  'tile_roof_red', 'tile_roof_blue', 'tile_roof_green', 'tile_roof_gray',
  // Light
  'torch', 'lantern', 'pumpkin_carved',
  // Ores
  'coal_ore', 'copper_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'sulfur_ore', 'mithril_ore', 'tin_ore', 'zinc_ore', 'salt_ore',
  // Metals
  'copper_block', 'bronze_block', 'iron_block', 'steel_block', 'gold_block', 'silver_block', 'mithril_block', 'coal_block',
  // Decor
  'carpet_red', 'carpet_blue', 'carpet_green', 'curtain', 'window', 'door_wood', 'door_iron',
  'ladder', 'fence_wood', 'fence_stone', 'sign', 'banner',
  'column_top', 'column_mid', 'column_base', 'shutter',
  // Special
  'crystal_blue', 'crystal_purple', 'crystal_green', 'geode',
  'stained_red', 'stained_blue', 'stained_green', 'stained_yellow',
  // Food
  'wheat', 'bread', 'cheese', 'honey_block', 'hay',
  // Terrain extras
  'granite', 'marble', 'slate', 'mossy_stone', 'mossy_cobble', 'cracked_stone',
  'red_sand', 'sandstone', 'terracotta', 'obsidian',
  'snow', 'ice', 'ice_packed', 'ice_blue',
  'mud', 'ash', 'scorched', 'slag', 'magma',
  'boulder', 'stalagmite', 'rock_moss', 'pebbles',
];

export interface ToolDef {
  id: string;
  name: string;
  type: 'pickaxe' | 'axe' | 'shovel' | 'sword' | 'hand';
  tier: number; // 0=hand, 1=flint, 2=stone, 3=copper, 4=iron, 5=diamond
  durability: number;
  miningSpeed: number; // multiplier
  attackDamage: number;
  emoji: string;
}

export const TOOLS: ToolDef[] = [
  { id: 'hand', name: 'Goła Ręka', type: 'hand', tier: 0, durability: Infinity, miningSpeed: 1, attackDamage: 1, emoji: '✋' },
  { id: 'flint_pickaxe', name: 'Krzemienne Dłuto', type: 'pickaxe', tier: 1, durability: 60, miningSpeed: 2, attackDamage: 2, emoji: '⛏️' },
  { id: 'flint_axe', name: 'Krzemienne Dłuto Drwala', type: 'axe', tier: 1, durability: 60, miningSpeed: 2, attackDamage: 3, emoji: '🪓' },
  { id: 'flint_shovel', name: 'Krzemienna Łopata', type: 'shovel', tier: 1, durability: 60, miningSpeed: 2, attackDamage: 1, emoji: '🥄' },
  { id: 'flint_sword', name: 'Krzemienne Ostrze', type: 'sword', tier: 1, durability: 80, miningSpeed: 1, attackDamage: 4, emoji: '🗡️' },
  { id: 'stone_pickaxe', name: 'Kamienny Kilof', type: 'pickaxe', tier: 2, durability: 130, miningSpeed: 4, attackDamage: 3, emoji: '⛏️' },
  { id: 'stone_axe', name: 'Kamienna Siekiera', type: 'axe', tier: 2, durability: 130, miningSpeed: 4, attackDamage: 4, emoji: '🪓' },
  { id: 'stone_sword', name: 'Kamienny Miecz', type: 'sword', tier: 2, durability: 180, miningSpeed: 1, attackDamage: 5, emoji: '🗡️' },
  { id: 'copper_pickaxe', name: 'Miedziany Kilof', type: 'pickaxe', tier: 3, durability: 220, miningSpeed: 6, attackDamage: 4, emoji: '⛏️' },
  { id: 'copper_sword', name: 'Miedziany Miecz', type: 'sword', tier: 3, durability: 280, miningSpeed: 1, attackDamage: 7, emoji: '🗡️' },
  { id: 'iron_pickaxe', name: 'Żelazny Kilof', type: 'pickaxe', tier: 4, durability: 480, miningSpeed: 9, attackDamage: 6, emoji: '⛏️' },
  { id: 'iron_sword', name: 'Żelazny Miecz', type: 'sword', tier: 4, durability: 600, miningSpeed: 1, attackDamage: 9, emoji: '🗡️' },
];

export const RECIPES: CraftingRecipe[] = [
  // Basic building
  {
    id: 'planks_oak',
    name: 'Deski Dębowe',
    output: { block: 'planks_oak', count: 4 },
    ingredients: [{ block: 'wood_oak', count: 1 }],
    description: 'Podstawowy materiał budowlany.',
    category: 'building',
  },
  {
    id: 'planks_pine',
    name: 'Deski Sosnowe',
    output: { block: 'planks_pine', count: 4 },
    ingredients: [{ block: 'wood_pine', count: 1 }],
    description: 'Ciemne deski z sosny.',
    category: 'building',
  },
  {
    id: 'planks_spruce',
    name: 'Deski Świerkowe',
    output: { block: 'planks_spruce', count: 4 },
    ingredients: [{ block: 'wood_spruce', count: 1 }],
    description: 'Deski z świerku.',
    category: 'building',
  },
  {
    id: 'planks_birch',
    name: 'Deski Brzozowe',
    output: { block: 'planks_birch', count: 4 },
    ingredients: [{ block: 'wood_birch', count: 1 }],
    description: 'Jasne deski z brzozy.',
    category: 'building',
  },
  {
    id: 'cobblestone',
    name: 'Bruk z Kamienia',
    output: { block: 'cobblestone', count: 1 },
    ingredients: [{ block: 'stone', count: 1 }],
    description: 'Wzmocniony kamień do budowy.',
    category: 'building',
  },
  {
    id: 'glass',
    name: 'Szkło',
    output: { block: 'glass', count: 1 },
    ingredients: [{ block: 'sand', count: 1 }, { block: 'coal_block', count: 1 }],
    requiresStation: 'smeltery',
    description: 'Przezroczysty blok. Wymaga pieca.',
    category: 'smelting',
  },
  {
    id: 'torch',
    name: 'Pochodnia',
    output: { block: 'torch', count: 4 },
    ingredients: [{ block: 'wood_oak', count: 1 }, { block: 'coal_block', count: 1 }],
    description: 'Oświetla drogę w nocy i w jaskiniach.',
    category: 'tools',
  },
  {
    id: 'lantern',
    name: 'Latarenka',
    output: { block: 'lantern', count: 1 },
    ingredients: [{ block: 'iron_block', count: 1 }, { block: 'torch', count: 1 }],
    requiresStation: 'workbench',
    description: 'Silne, przenośne źródło światła.',
    category: 'tools',
  },
  {
    id: 'brick',
    name: 'Cegły',
    output: { block: 'brick', count: 4 },
    ingredients: [{ block: 'clay', count: 2 }, { block: 'coal_block', count: 1 }],
    requiresStation: 'smeltery',
    description: 'Trwały materiał budowlany. Wymaga wypalenia w piecu.',
    category: 'smelting',
  },
  {
    id: 'stone_brick',
    name: 'Kamienne Cegły',
    output: { block: 'stone_brick', count: 4 },
    ingredients: [{ block: 'cobblestone', count: 4 }],
    requiresStation: 'workbench',
    description: 'Równy kamień do budowli.',
    category: 'building',
  },
  {
    id: 'workbench',
    name: 'Stół Warsztatowy',
    output: { block: 'workbench', count: 1 },
    ingredients: [{ block: 'planks_oak', count: 4 }],
    description: 'Niezbędny do tworzenia narzędzi i mebli.',
    category: 'building',
  },
  {
    id: 'furnace',
    name: 'Piec Hutniczy',
    output: { block: 'furnace', count: 1 },
    ingredients: [{ block: 'cobblestone', count: 8 }],
    description: 'Pozwala wytapiać metale i szkło.',
    category: 'building',
  },
  {
    id: 'anvil',
    name: 'Kowadło',
    output: { block: 'anvil', count: 1 },
    ingredients: [{ block: 'iron_block', count: 5 }],
    requiresStation: 'smeltery',
    description: 'Do kucia narzędzi i broni.',
    category: 'building',
  },
  {
    id: 'chest',
    name: 'Skrzynia',
    output: { block: 'chest', count: 1 },
    ingredients: [{ block: 'planks_oak', count: 8 }],
    description: 'Przechowuj swoje skarby.',
    category: 'building',
  },
  {
    id: 'bookshelf',
    name: 'Biblioteczka',
    output: { block: 'bookshelf', count: 1 },
    ingredients: [{ block: 'planks_oak', count: 6 }],
    description: 'Dla domowej biblioteki.',
    category: 'decor',
  },
  {
    id: 'flint_pickaxe',
    name: 'Krzemienne Dłuto',
    output: { block: 'cobblestone', count: 1 },
    ingredients: [{ block: 'cobblestone', count: 3 }, { block: 'planks_oak', count: 2 }],
    description: 'Narzędzie do wydobywania kamienia i rud.',
    category: 'tools',
  },
  {
    id: 'smeltery_setup',
    name: 'Podstawowa Hut',
    output: { block: 'furnace', count: 1 },
    ingredients: [{ block: 'cobblestone', count: 8 }, { block: 'coal_block', count: 1 }],
    description: 'Wymagana do wytapiania metali.',
    category: 'smelting',
  },
];

export const QUESTS: Quest[] = [
  {
    id: 'first_steps',
    title: 'Pierwsze Kroki',
    description: 'Zbierz surowce, aby przetrwać w dziczy.',
    objectives: [
      { id: 'wood', description: 'Zbierz drewno z drzew', target: { block: 'wood_oak', count: 10 }, progress: 0, completed: false },
      { id: 'stone', description: 'Wykop kamień z ziemi', target: { block: 'cobblestone', count: 20 }, progress: 0, completed: false },
      { id: 'food', description: 'Znajdź jedzenie (grzyby/kwiaty)', target: { block: 'mushroom_brown', count: 5 }, progress: 0, completed: false },
    ],
  },
  {
    id: 'metalworking',
    title: 'Metalurgia',
    description: 'Odkryj sekrety obróbki metalu.',
    objectives: [
      { id: 'copper', description: 'Wykop rudę miedzi z jaskiń', target: { block: 'copper_ore', count: 10 }, progress: 0, completed: false },
      { id: 'coal', description: 'Znajdź węgiel kamienny', target: { block: 'coal_block', count: 15 }, progress: 0, completed: false },
      { id: 'iron', description: 'Wykop rudę żelaza (głęboko)', target: { block: 'iron_ore', count: 5 }, progress: 0, completed: false },
    ],
  },
  {
    id: 'builder',
    title: 'Budowniczy',
    description: 'Stawiaj struktury i ozdabiaj świat.',
    objectives: [
      { id: 'planks', description: 'Wytwórz deski', target: { block: 'planks_oak', count: 30 }, progress: 0, completed: false },
      { id: 'glass', description: 'Wytop szkło w hucie', target: { block: 'glass', count: 5 }, progress: 0, completed: false },
      { id: 'torch', description: 'Stwórz pochodnie na noc', target: { block: 'torch', count: 10 }, progress: 0, completed: false },
    ],
  },
];

// Re-export centralized config (single source of truth)
export { WORLD_CONFIG } from './config';
