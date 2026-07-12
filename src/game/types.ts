// Core game type definitions

export type BlockType =
  // Terrain
  | 'air'
  | 'grass'
  | 'grass_autumn'
  | 'grass_withered'
  | 'grass_spring'
  | 'dirt'
  | 'dirt_dark'
  | 'dirt_path'
  | 'stone'
  | 'cobblestone'
  | 'mossy_stone'
  | 'mossy_cobble'
  | 'cracked_stone'
  | 'granite'
  | 'marble'
  | 'slate'
  | 'sand'
  | 'red_sand'
  | 'sandstone'
  | 'sand'
  | 'gravel'
  | 'clay'
  | 'bedrock'
  | 'bedrock_dark'
  | 'snow'
  | 'snow_grass'
  | 'snow_dirty'
  | 'ice'
  | 'ice_packed'
  | 'ice_blue'
  | 'water'
  | 'mud'
  | 'mud_dry'
  | 'ash'
  | 'scorched'
  | 'magma'
  | 'obsidian'
  | 'terracotta'
  // Ores
  | 'coal_ore'
  | 'iron_ore'
  | 'copper_ore'
  | 'gold_ore'
  | 'diamond_ore'
  | 'sulfur_ore'
  | 'mithril_ore'
  | 'tin_ore'
  | 'zinc_ore'
  | 'salt_ore'
  // Wood - oak (dąb)
  | 'wood_oak'
  | 'planks_oak'
  | 'leaves_oak'
  | 'sapling_oak'
  // Wood - pine (sosna)
  | 'wood_pine'
  | 'planks_pine'
  | 'leaves_pine'
  | 'sapling_pine'
  // Wood - spruce (świerk)
  | 'wood_spruce'
  | 'planks_spruce'
  | 'leaves_spruce'
  // Wood - birch (brzoza)
  | 'wood_birch'
  | 'planks_birch'
  | 'leaves_birch'
  | 'sapling_birch'
  // Autumn leaves
  | 'leaves_autumn_yellow'
  | 'leaves_autumn_orange'
  | 'leaves_autumn_red'
  | 'leaves_autumn_mixed'
  | 'leaves_dry'
  | 'leaves_cherry'
  | 'leaves_apple'
  | 'leaves_willow'
  // Plants & decoration
  | 'bush'
  | 'bush_berry'
  | 'berry_bush'
  | 'fern'
  | 'dead_bush'
  | 'tall_grass'
  | 'reed'
  | 'lavender'
  | 'water_lily'
  | 'lily_pad'
  | 'vines'
  | 'flower_red'
  | 'flower_yellow'
  | 'flower_white'
  | 'flower_purple'
  | 'flower_blue'
  | 'mushroom_brown'
  | 'mushroom_red'
  | 'mushroom_bush'
  | 'cactus'
  | 'pumpkin'
  | 'pumpkin_carved'
  | 'pinecone'
  | 'fallen_leaves'
  | 'leaf_pile'
  | 'rock_moss'
  | 'pebbles'
  | 'boulder'
  | 'stalagmite'
  | 'crystal_blue'
  | 'crystal_purple'
  | 'crystal_green'
  | 'geode'
  | 'root'
  | 'stump'
  // Light sources
  | 'torch'
  | 'lantern'
  // Crafted blocks
  | 'glass'
  | 'glass_tinted'
  | 'stained_red'
  | 'stained_blue'
  | 'stained_green'
  | 'stained_yellow'
  | 'brick'
  | 'brick_mossy'
  | 'sandstone_brick'
  | 'stone_brick'
  | 'stone_brick_mossy'
  | 'cobble_wall'
  | 'clay_brick'
  | 'roof_tile'
  | 'tile_roof_red'
  | 'tile_roof_blue'
  | 'tile_roof_green'
  | 'tile_roof_gray'
  | 'planks_dark'
  | 'wood_beam'
  | 'thatch'
  | 'straw_bale'
  // Workstations
  | 'workbench'
  | 'furnace'
  | 'anvil'
  | 'forge'
  | 'chest'
  | 'bookshelf'
  | 'crate'
  | 'barrel'
  | 'loom'
  // Metals
  | 'copper_block'
  | 'bronze_block'
  | 'iron_block'
  | 'steel_block'
  | 'gold_block'
  | 'silver_block'
  | 'mithril_block'
  | 'charcoal_block'
  | 'coal_block'
  | 'slag'
  // Crops & food
  | 'wheat'
  | 'wheat_grown'
  | 'carrot'
  | 'potato'
  | 'beetroot'
  | 'melon'
  | 'bread'
  | 'cheese'
  | 'honey_block'
  | 'hay'
  // More decoration
  | 'carpet_red'
  | 'carpet_blue'
  | 'carpet_green'
  | 'curtain'
  | 'window'
  | 'door_wood'
  | 'door_iron'
  | 'ladder'
  | 'fence_wood'
  | 'fence_stone'
  | 'sign'
  | 'banner'
  | 'column_top'
  | 'column_mid'
  | 'column_base'
  | 'shutter';

export interface BlockDef {
  id: BlockType;
  name: string;
  color: string; // top color (used for UI icon fallback)
  sideColor?: string;
  bottomColor?: string;
  // Texture tile indices (must match TILES in textureAtlas.ts)
  tiles?: {
    top?: number;
    side?: number;
    bottom?: number;
    all?: number; // overrides top/side/bottom if set
  };
  transparent?: boolean;
  solid: boolean;
  breakable: boolean;
  tool?: 'pickaxe' | 'axe' | 'shovel' | 'hand' | 'any';
  minToolTier?: number; // 0=hand, 1=flint, 2=stone, 3=copper, 4=iron, 5=diamond
  hardness: number; // seconds to break with bare hand
  // ETAP 2.2: explicit health value for progressive mining. If omitted, the
  // BlockHealthMap derives it from hardness (Math.max(1, ceil(hardness * 4))).
  // Set to Infinity for unbreakable blocks (or just leave breakable: false).
  defaultHealth?: number;
  drops?: { item: BlockType; count: number }[];
  light?: number; // 0-15 emission
  variant?: 'cube' | 'cross' | 'thin'; // cube: full block, cross: X-shape (plants), thin: torch/etc
  opacity?: number; // 0-1 for water/glass
  // Tree generation hint
  isLeaves?: boolean;
  isWood?: boolean;
  // ETAP 2.3: workstation flag for spatial crafting. Right-clicking a block
  // with this flag triggers a getBlocksInRadius check for nearby raw materials
  // and consumes them to produce a crafted output (no menu UI required).
  workstation?: 'workbench' | 'furnace' | 'anvil' | 'forge';
}

export interface ItemStack {
  block: BlockType;
  count: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  output: { block: BlockType; count: number };
  ingredients: { block: BlockType; count: number }[];
  requiresStation?: 'smeltery' | 'anvil' | 'workbench';
  description: string;
  category: 'tools' | 'building' | 'smelting' | 'food' | 'decor';
}

export interface QuestObjective {
  id: string;
  description: string;
  target: { block: BlockType; count: number };
  progress: number;
  completed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: QuestObjective[];
  reward?: { block: BlockType; count: number };
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ChunkCoord {
  cx: number;
  cz: number;
}

// Flat 1D voxel storage per PROJECT_CONTEXT architecture.
// Index formula: x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE
export type ChunkVoxels = Uint8Array; // block id bytes, length = CS*CS*HEIGHT


export interface PlayerState {
  position: Vec3;
  velocity: Vec3;
  yaw: number;
  pitch: number;
  onGround: boolean;
  flying: boolean;
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  stamina: number;
  maxStamina: number;
}

export interface DayNightState {
  time: number; // 0..1 (0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset)
  dayLength: number; // seconds for a full day
}
