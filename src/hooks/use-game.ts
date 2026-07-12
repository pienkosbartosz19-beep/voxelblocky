'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { World } from '../game/world';
import { ChunkManager } from '../game/chunkManager';
import { BLOCKS, WORLD_CONFIG, QUESTS } from '../game/blocks';
import { BlockHealthMap, defaultHealthFor } from '../game/blockHealth';
import { getCrackTextures } from '../game/crackTextures';
import { trySpatialCraft } from '../game/spatialCrafting';
import type { BlockType, PlayerState, DayNightState, Quest } from '../game/types';

export interface GameUIState {
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  stamina: number;
  maxStamina: number;
  hotbar: (BlockType | null)[];
  inventory: { block: BlockType; count: number }[];
  selectedSlot: number;
  time: number; // 0..1
  isDay: boolean;
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  workerQueueDepth: number;
  perfOverlay: boolean;
  position: { x: number; y: number; z: number };
  lookingAt: BlockType | null;
  breaking: boolean;
  placeMode: boolean;
  paused: boolean;
  dead: boolean;
  quests: Quest[];
  chunkCount: number;
  triangleCount: number;
  biome: string;
  message: string | null;
  flying: boolean;
}

const INITIAL_STATE: GameUIState = {
  health: 20,
  maxHealth: 20,
  hunger: 20,
  maxHunger: 20,
  stamina: 100,
  maxStamina: 100,
  hotbar: Array(7).fill(null),
  inventory: [],
  selectedSlot: 0,
  time: 0.3,
  isDay: true,
  fps: 0,
  frameTimeMs: 0,
  drawCalls: 0,
  triangles: 0,
  workerQueueDepth: 0,
  perfOverlay: true,
  position: { x: 0, y: 0, z: 0 },
  lookingAt: null,
  breaking: false,
  placeMode: false,
  paused: false,
  dead: false,
  quests: QUESTS.map(q => ({ ...q, objectives: q.objectives.map(o => ({ ...o })) })),
  chunkCount: 0,
  triangleCount: 0,
  biome: 'plains',
  message: null,
  flying: false,
};

const HOTBAR_SLOTS = 7;
const INVENTORY_SLOTS = 28;

export function useGame(canvasRef: React.RefObject<HTMLCanvasElement | null>, enabled: boolean = true) {
  const [uiState, setUiState] = useState<GameUIState>(INITIAL_STATE);
  const stateRef = useRef<GameUIState>({ ...INITIAL_STATE });
  const gameRef = useRef<any>(null);

  // Helper to update UI state
  const syncUI = useCallback(() => {
    setUiState({ ...stateRef.current });
  }, []);

  const setMessage = useCallback((msg: string | null, duration = 2500) => {
    stateRef.current.message = msg;
    syncUI();
    if (msg) {
      setTimeout(() => {
        if (stateRef.current.message === msg) {
          stateRef.current.message = null;
          syncUI();
        }
      }, duration);
    }
  }, [syncUI]);

  useEffect(() => {
    if (!enabled) return;
    if (!canvasRef.current) return;
    if (gameRef.current) return;

    const canvas = canvasRef.current;

    // === Three.js setup ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#9fc8ec');
    scene.fog = new THREE.Fog('#9fc8ec', 30, 80);

    const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false; // disabled for performance; we use vertex shading instead
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff4d6, 1.2);
    sun.position.set(50, 80, 30);
    scene.add(sun);

    // Hemisphere for ambient color
    const hemi = new THREE.HemisphereLight(0xa0d8ff, 0x4a3a2a, 0.5);
    scene.add(hemi);

    // Moon (for night)
    const moon = new THREE.DirectionalLight(0x9bb0d6, 0.0);
    moon.position.set(-30, 60, -20);
    scene.add(moon);

    // === World ===
    const world = new World(20260711);
    const chunkManager = new ChunkManager(scene, world, WORLD_CONFIG.RENDER_DISTANCE);

    // === Player ===
    const spawn = world.findSpawn();

    // Pre-generate the spawn area so the world is visible immediately.
    // Use worker for the center chunk to drive the worker path for initial visible terrain.
    // Outer area on main for immediate, center via worker.
    (async () => {
      const spawnCx = Math.floor(spawn.x / 16);
      const spawnCz = Math.floor(spawn.z / 16);
      // outer on main for immediate
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) > 1 || Math.abs(dz) > 1) {
            world.ensureChunkData(spawnCx + dx, spawnCz + dz);
          }
        }
      }

      // center via worker
      const bridge = chunkManager.workerBridge;
      if (bridge) {
        await bridge.waitReady().catch(() => {});
        const v = await bridge.generateChunk(spawnCx, spawnCz);
        if (v.length > 0) {
          world.setChunkData(spawnCx, spawnCz, v);
          chunkManager.ensureChunk(spawnCx, spawnCz);
        } else {
          world.ensureChunkData(spawnCx, spawnCz);
          chunkManager.ensureChunk(spawnCx, spawnCz);
        }
      } else {
        world.ensureChunkData(spawnCx, spawnCz);
        chunkManager.ensureChunk(spawnCx, spawnCz);
      }
    })();

    const player: PlayerState = {
      position: { x: spawn.x, y: spawn.y, z: spawn.z },
      velocity: { x: 0, y: 0, z: 0 },
      yaw: 0.4,  // Slight rotation for nicer initial view
      pitch: -0.05,  // Looking nearly straight ahead - shows trees in distance
      onGround: false,
      flying: false,
      health: 20,
      maxHealth: 20,
      hunger: 20,
      maxHunger: 20,
      stamina: 100,
      maxStamina: 100,
    };

    // Hotbar + inventory
    const hotbar: (BlockType | null)[] = Array(HOTBAR_SLOTS).fill(null);
    const inventory: { block: BlockType; count: number }[] = Array(INVENTORY_SLOTS).fill(null).map(() => ({ block: 'air', count: 0 }));
    let selectedSlot = 0;

    // Give starter items so the player can build & explore right away
    inventory[0] = { block: 'wood_oak', count: 8 };
    inventory[1] = { block: 'planks_oak', count: 16 };
    inventory[2] = { block: 'cobblestone', count: 16 };
    inventory[3] = { block: 'torch', count: 8 };
    inventory[4] = { block: 'coal_block', count: 4 };
    inventory[5] = { block: 'glass', count: 4 };
    inventory[6] = { block: 'workbench', count: 1 };
    inventory[7] = { block: 'furnace', count: 1 };
    inventory[8] = { block: 'leaves_autumn_mixed', count: 8 };
    inventory[9] = { block: 'leaves_autumn_yellow', count: 8 };
    inventory[10] = { block: 'leaves_autumn_orange', count: 8 };
    inventory[11] = { block: 'leaves_autumn_red', count: 8 };
    inventory[12] = { block: 'wood_pine', count: 4 };
    inventory[13] = { block: 'wood_birch', count: 4 };
    inventory[14] = { block: 'leaves_pine', count: 4 };
    inventory[15] = { block: 'leaves_spruce', count: 4 };
    inventory[16] = { block: 'lantern', count: 2 };
    inventory[17] = { block: 'brick', count: 8 };
    inventory[18] = { block: 'stone_brick', count: 8 };
    // ETAP 2.3: starter pack for spatial crafting experimentation
    inventory[19] = { block: 'anvil', count: 1 };
    inventory[20] = { block: 'forge', count: 1 };
    inventory[21] = { block: 'iron_block', count: 4 };
    inventory[22] = { block: 'copper_block', count: 4 };
    inventory[23] = { block: 'iron_ore', count: 4 };
    inventory[24] = { block: 'copper_ore', count: 4 };
    inventory[25] = { block: 'sand', count: 8 };
    inventory[26] = { block: 'clay', count: 8 };
    inventory[27] = { block: 'bronze_block', count: 2 };
    hotbar[0] = 'wood_oak';
    hotbar[1] = 'planks_oak';
    hotbar[2] = 'cobblestone';
    hotbar[3] = 'torch';
    hotbar[4] = 'leaves_autumn_mixed';
    hotbar[5] = 'workbench';
    hotbar[6] = 'anvil';

    function addToInventory(block: BlockType, count = 1): number {
      if (block === 'air') return 0;
      // First, try hotbar slots
      let remaining = count;
      // Try to stack into existing inventory slots
      for (let i = 0; i < inventory.length && remaining > 0; i++) {
        if (inventory[i].block === block) {
          inventory[i].count += remaining;
          remaining = 0;
        }
      }
      // Find empty inventory slot
      for (let i = 0; i < inventory.length && remaining > 0; i++) {
        if (inventory[i].count === 0 || inventory[i].block === 'air') {
          inventory[i].block = block;
          inventory[i].count = remaining;
          remaining = 0;
        }
      }
      updateQuestProgress(block, count);
      return count - remaining;
    }

    function removeFromInventory(block: BlockType, count = 1): boolean {
      // Count available
      let available = 0;
      for (const item of inventory) {
        if (item.block === block) available += item.count;
      }
      if (available < count) return false;

      let remaining = count;
      for (let i = 0; i < inventory.length && remaining > 0; i++) {
        if (inventory[i].block === block) {
          const take = Math.min(inventory[i].count, remaining);
          inventory[i].count -= take;
          remaining -= take;
          if (inventory[i].count === 0) inventory[i].block = 'air';
        }
      }
      return true;
    }

    function getInventoryCount(block: BlockType): number {
      let c = 0;
      for (const item of inventory) {
        if (item.block === block) c += item.count;
      }
      return c;
    }

    // Quest tracking
    const questState: Quest[] = stateRef.current.quests.map(q => ({ ...q, objectives: q.objectives.map(o => ({ ...o })) }));

    function updateQuestProgress(block: BlockType, count: number) {
      for (const q of questState) {
        for (const o of q.objectives) {
          if (o.completed) continue;
          if (o.target.block === block) {
            o.progress = Math.min(o.target.count, o.progress + count);
            if (o.progress >= o.target.count) {
              o.completed = true;
              setMessage(`Cel osiągnięty: ${o.description}`, 2200);
            }
          }
        }
        // Check if all objectives completed
        const allDone = q.objectives.every(o => o.completed);
        if (allDone) {
          setMessage(`Quest ukończony: ${q.title}!`, 3500);
        }
      }
      stateRef.current.quests = questState.map(q => ({ ...q, objectives: q.objectives.map(o => ({ ...o })) }));
    }

    // === Input handling ===
    const keys: Record<string, boolean> = {};
    let mouseLocked = false;
    let leftMouseDown = false;
    let rightMouseDown = false;
    let breakingBlock: { x: number; y: number; z: number } | null = null;
    let breakProgress = 0;
    let lastBreakTime = 0;
    let placeCooldown = 0;

    // ETAP 2.2: Block integrity map (sparse — only tracks damaged blocks)
    const blockHealth = new BlockHealthMap();

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Escape') {
        if (document.pointerLockElement === canvas) {
          document.exitPointerLock();
        }
        stateRef.current.paused = !stateRef.current.paused;
        syncUI();
        return;
      }
      // F3 = toggle performance overlay (voxel-game convention)
      if (e.code === 'F3') {
        e.preventDefault();
        stateRef.current.perfOverlay = !stateRef.current.perfOverlay;
        syncUI();
        return;
      }
      keys[e.code] = true;

      // Hotbar selection
      if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code.replace('Digit', ''));
        if (n >= 1 && n <= HOTBAR_SLOTS) {
          selectedSlot = n - 1;
          stateRef.current.selectedSlot = selectedSlot;
          syncUI();
        }
      }

      // Toggle fly (Ctrl+F)
      if (e.code === 'KeyF' && e.ctrlKey) {
        player.flying = !player.flying;
        player.velocity.y = 0;
        stateRef.current.flying = player.flying;
        setMessage(player.flying ? 'Tryb latania: WŁĄCZONY' : 'Tryb latania: wyłączony', 1500);
        syncUI();
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      keys[e.code] = false;
    }

    function onMouseDown(e: MouseEvent) {
      // If pointer not locked, try to lock it on first click
      if (!mouseLocked && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
        // Still allow click to register for headless / no-pointer-lock environments
      }
      if (e.button === 0) {
        leftMouseDown = true;
        stateRef.current.breaking = true;
        syncUI();
      } else if (e.button === 2) {
        rightMouseDown = true;
        // Place block
        tryPlaceBlock();
        placeCooldown = 0.25;
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (e.button === 0) {
        leftMouseDown = false;
        breakingBlock = null;
        breakProgress = 0;
        stateRef.current.breaking = false;
        syncUI();
      } else if (e.button === 2) {
        rightMouseDown = false;
      }
    }

    function onMouseMove(e: MouseEvent) {
      // Use movementX/Y if available (works with or without pointer lock)
      const mx = e.movementX || 0;
      const my = e.movementY || 0;
      if (mx === 0 && my === 0) return;
      // Only rotate camera if pointer locked OR mouse is over canvas
      if (!mouseLocked && document.pointerLockElement !== canvas) return;
      const sensitivity = 0.0025;
      player.yaw -= mx * sensitivity;
      player.pitch -= my * sensitivity;
      player.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, player.pitch));
    }

    function onWheel(e: WheelEvent) {
      if (e.deltaY > 0) {
        selectedSlot = (selectedSlot + 1) % HOTBAR_SLOTS;
      } else {
        selectedSlot = (selectedSlot - 1 + HOTBAR_SLOTS) % HOTBAR_SLOTS;
      }
      stateRef.current.selectedSlot = selectedSlot;
      syncUI();
    }

    function onPointerLockChange() {
      mouseLocked = document.pointerLockElement === canvas;
      // Don't auto-pause when pointer lock is lost - player can still play
      // Pause only via Escape key
      if (mouseLocked) {
        // Resuming from pause when pointer lock re-acquired
        stateRef.current.paused = false;
        syncUI();
      }
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('resize', onResize);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // === Block placement / breaking ===
    function getCameraDir(): THREE.Vector3 {
      const dir = new THREE.Vector3(0, 0, -1);
      const e = new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ');
      dir.applyEuler(e);
      return dir;
    }

    function getLookingAt() {
      const origin = new THREE.Vector3(player.position.x, player.position.y + 1.6, player.position.z);
      const dir = getCameraDir();
      return world.raycast(
        { x: origin.x, y: origin.y, z: origin.z },
        { x: dir.x, y: dir.y, z: dir.z },
        WORLD_CONFIG.REACH,
      );
    }

    function tryBreakBlock() {
      const hit = getLookingAt();
      if (!hit.hit) {
        breakingBlock = null;
        breakProgress = 0;
        return;
      }

      const def = BLOCKS[hit.blockType];
      if (!def.breakable) {
        setMessage('Nie można zniszczyć tego bloku!', 1500);
        breakingBlock = null;
        return;
      }

      // If new block, reset progress
      if (!breakingBlock || breakingBlock.x !== hit.block.x || breakingBlock.y !== hit.block.y || breakingBlock.z !== hit.block.z) {
        breakingBlock = { ...hit.block };
        breakProgress = 0;
      }

      // ETAP 2.2: Progressive mining — reduce block health, only destroy at 0.
      // Damage per frame is calibrated to (defaultHealth / breakTimeSeconds)
      // so the total time to break a block matches def.hardness.
      const max = defaultHealthFor(hit.blockType);
      if (!isFinite(max)) {
        setMessage('Nie można zniszczyć tego bloku!', 1500);
        breakingBlock = null;
        return;
      }
      const breakTime = Math.max(0.1, def.hardness);
      const damagePerFrame = max / (breakTime * 60); // 60 fps assumption
      breakProgress += damagePerFrame;

      // Apply damage through the health map (also tracks stage for crack overlay)
      // (sub-voxel 4x4x4 integration lives in BlockHealthMap.damage for real effect)
      blockHealth.damage(hit.block.x, hit.block.y, hit.block.z, damagePerFrame, hit.blockType);

      if (breakProgress >= max) {
        // Block destroyed
        world.setBlock(hit.block.x, hit.block.y, hit.block.z, 'air');
        blockHealth.remove(hit.block.x, hit.block.y, hit.block.z);
        // Drops
        if (def.drops) {
          for (const drop of def.drops) {
            addToInventory(drop.item, drop.count);
          }
        }
        // Mark surrounding chunks for rebuild
        markChunksDirty(hit.block.x, hit.block.y, hit.block.z);
        breakingBlock = null;
        breakProgress = 0;
      }
    }

    function tryPlaceBlock() {
      const hit = getLookingAt();
      if (!hit.hit) return;

      // ETAP 2.3: Spatial crafting — if looking at a workstation, attempt
      // spatial craft instead of placing a block. The station scans its
      // radius for required raw materials; if all are present it consumes
      // them and yields the output (delivered to inventory).
      const hitDef = BLOCKS[hit.blockType];
      if (hitDef.workstation) {
        const result = trySpatialCraft(world, hit.block.x, hit.block.y, hit.block.z, hitDef.workstation);
        if (result.success && result.output) {
          addToInventory(result.output.block, result.output.count);
          // Rebuild all chunks that contained consumed blocks
          for (const c of result.consumedPositions) {
            markChunksDirty(c.x, c.y, c.z);
          }
          setMessage(`✓ ${result.message}`, 2500);
        } else {
          setMessage(`✗ ${result.message}`, 2800);
        }
        return; // never place a block when interacting with a station
      }

      // Selected block from hotbar
      const blockToPlace = hotbar[selectedSlot];
      if (!blockToPlace) return;
      const def = BLOCKS[blockToPlace];
      if (def.variant === 'cross' || blockToPlace === 'torch') {
        // place at adjacent
      }

      // Count in inventory
      if (getInventoryCount(blockToPlace) <= 0) {
        setMessage(`Brak ${def.name} w ekwipunku`, 1200);
        return;
      }

      // Place at adjacent position
      const px = hit.block.x + hit.normal.x;
      const py = hit.block.y + hit.normal.y;
      const pz = hit.block.z + hit.normal.z;

      // Don't place inside player
      const playerMinX = player.position.x - 0.3;
      const playerMaxX = player.position.x + 0.3;
      const playerMinY = player.position.y;
      const playerMaxY = player.position.y + 1.8;
      const playerMinZ = player.position.z - 0.3;
      const playerMaxZ = player.position.z + 0.3;
      if (
        px + 1 > playerMinX && px < playerMaxX &&
        py + 1 > playerMinY && py < playerMaxY &&
        pz + 1 > playerMinZ && pz < playerMaxZ &&
        def.solid
      ) {
        return;
      }

      // Check existing block
      const existing = world.getBlock(px, py, pz);
      if (existing !== 'air' && existing !== 'water') return;

      world.setBlock(px, py, pz, blockToPlace);
      // ETAP 2.2: ensure the freshly-placed block has no stale health entry
      blockHealth.remove(px, py, pz);
      removeFromInventory(blockToPlace, 1);
      markChunksDirty(px, py, pz);
    }

    function markChunksDirty(x: number, y: number, z: number) {
      // Determine affected chunks
      const cx = Math.floor(x / 16);
      const cz = Math.floor(z / 16);
      const lx = ((x % 16) + 16) % 16;
      const lz = ((z % 16) + 16) % 16;
      chunkManager.rebuildChunk(cx, cz);
      if (lx === 0) chunkManager.rebuildChunk(cx - 1, cz);
      if (lx === 15) chunkManager.rebuildChunk(cx + 1, cz);
      if (lz === 0) chunkManager.rebuildChunk(cx, cz - 1);
      if (lz === 15) chunkManager.rebuildChunk(cx, cz + 1);
    }

    // === Physics / movement ===
    function checkCollision(x: number, y: number, z: number): boolean {
      const minX = Math.floor(x - 0.3);
      const maxX = Math.floor(x + 0.3);
      const minY = Math.floor(y);
      const maxY = Math.floor(y + 1.79);
      const minZ = Math.floor(z - 0.3);
      const maxZ = Math.floor(z + 0.3);
      for (let bx = minX; bx <= maxX; bx++) {
        for (let by = minY; by <= maxY; by++) {
          for (let bz = minZ; bz <= maxZ; bz++) {
            const bt = world.getBlock(bx, by, bz);
            if (BLOCKS[bt].solid) return true;
          }
        }
      }
      return false;
    }

    function isInWater(x: number, y: number, z: number): boolean {
      const by = Math.floor(y + 0.5);
      const bt = world.getBlock(Math.floor(x), by, Math.floor(z));
      return bt === 'water';
    }

    function updatePlayer(dt: number) {
      if (stateRef.current.dead) return;

      // Stamina regen
      if (!leftMouseDown && stateRef.current.stamina < stateRef.current.maxStamina) {
        stateRef.current.stamina = Math.min(stateRef.current.maxStamina, stateRef.current.stamina + dt * 12);
      }

      // Hunger drain
      const moving = keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'];
      const sprinting = moving && keys['ShiftLeft'] && stateRef.current.stamina > 0;
      const hungerRate = sprinting ? 0.15 : moving ? 0.05 : 0.02;
      stateRef.current.hunger = Math.max(0, stateRef.current.hunger - dt * hungerRate);

      // Health regen if fed
      if (stateRef.current.hunger > 15 && stateRef.current.health < stateRef.current.maxHealth) {
        stateRef.current.health = Math.min(stateRef.current.maxHealth, stateRef.current.health + dt * 0.5);
      } else if (stateRef.current.hunger === 0) {
        // Starving
        stateRef.current.health = Math.max(0, stateRef.current.health - dt * 0.5);
        if (stateRef.current.health <= 0) {
          stateRef.current.dead = true;
          setMessage('Umarłeś z głodu! Kliknij aby zrespawnować.', 99999);
          syncUI();
          return;
        }
      }

      // Movement input
      const speed = sprinting ? WORLD_CONFIG.SPRINT_SPEED : WORLD_CONFIG.WALK_SPEED;
      const yaw = player.yaw;
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const moveDir = new THREE.Vector3();
      if (keys['KeyW']) moveDir.add(forward);
      if (keys['KeyS']) moveDir.sub(forward);
      if (keys['KeyD']) moveDir.add(right);
      if (keys['KeyA']) moveDir.sub(right);
      if (moveDir.lengthSq() > 0) {
        moveDir.normalize().multiplyScalar(speed);
      }

      if (sprinting) {
        stateRef.current.stamina = Math.max(0, stateRef.current.stamina - dt * 15);
      }

      if (player.flying) {
        player.velocity.x = moveDir.x;
        player.velocity.z = moveDir.z;
        player.velocity.y = 0;
        if (keys['Space']) player.velocity.y = WORLD_CONFIG.FLY_SPEED * 0.7;
        if (keys['ShiftLeft']) player.velocity.y = -WORLD_CONFIG.FLY_SPEED * 0.7;
      } else {
        player.velocity.x = moveDir.x;
        player.velocity.z = moveDir.z;

        // Gravity
        player.velocity.y += WORLD_CONFIG.GRAVITY * dt;
        if (player.velocity.y < -50) player.velocity.y = -50;

        // Water physics
        if (isInWater(player.position.x, player.position.y, player.position.z)) {
          player.velocity.y = Math.max(player.velocity.y, -3);
          player.velocity.y *= 0.85;
          if (keys['Space']) player.velocity.y = 4;
        }

        // Jump
        if (keys['Space'] && player.onGround && stateRef.current.stamina > 5) {
          player.velocity.y = WORLD_CONFIG.JUMP_VELOCITY;
          player.onGround = false;
          stateRef.current.stamina -= 3;
        }
      }

      // Apply movement with collision (per-axis)
      const dx = player.velocity.x * dt;
      const dy = player.velocity.y * dt;
      const dz = player.velocity.z * dt;

      // X axis
      if (dx !== 0 && !checkCollision(player.position.x + dx, player.position.y, player.position.z)) {
        player.position.x += dx;
      } else {
        player.velocity.x = 0;
      }
      // Z axis
      if (dz !== 0 && !checkCollision(player.position.x, player.position.y, player.position.z + dz)) {
        player.position.z += dz;
      } else {
        player.velocity.z = 0;
      }
      // Y axis
      if (dy !== 0 && !checkCollision(player.position.x, player.position.y + dy, player.position.z)) {
        player.position.y += dy;
        player.onGround = false;
      } else {
        if (dy < 0) player.onGround = true;
        player.velocity.y = 0;
      }

      // Fall damage / void
      if (player.position.y < -10) {
        stateRef.current.health = 0;
        stateRef.current.dead = true;
        setMessage('Spadłeś w otchłań! Kliknij aby zrespawnować.', 99999);
        syncUI();
      }

      // Update camera position
      camera.position.set(player.position.x, player.position.y + 1.6, player.position.z);
      const euler = new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);

      // Breaking
      if (leftMouseDown) {
        if (placeCooldown > 0) placeCooldown -= dt;
        tryBreakBlock();
      }

      stateRef.current.position = { x: player.position.x, y: player.position.y, z: player.position.z };
    }

    // === Day/night cycle ===
    const dayLength = 240; // 4 minutes per day
    let time = 0.35; // start morning

    function updateDayNight(dt: number) {
      time = (time + dt / dayLength) % 1;
      stateRef.current.time = time;
      stateRef.current.isDay = time > 0.22 && time < 0.78;

      // Sun position
      const sunAngle = (time - 0.25) * Math.PI * 2;
      const sunHeight = Math.sin(sunAngle);
      const sunX = Math.cos(sunAngle) * 80;
      sun.position.set(sunX, sunHeight * 80 + 5, 30);

      // Light intensity
      const dayFactor = Math.max(0, Math.sin(sunAngle));
      sun.intensity = 0.2 + dayFactor * 1.0;
      ambient.intensity = 0.25 + dayFactor * 0.35;
      hemi.intensity = 0.2 + dayFactor * 0.3;

      // Moon
      moon.position.set(-sunX, -sunHeight * 80 + 5, -30);
      moon.intensity = (1 - dayFactor) * 0.3;

      // Sky color
      const dayColor = new THREE.Color('#9fc8ec');
      const nightColor = new THREE.Color('#0a1535');
      const sunsetColor = new THREE.Color('#f4a261');
      const skyColor = new THREE.Color();
      if (dayFactor > 0.3) {
        skyColor.copy(dayColor);
      } else if (dayFactor > 0) {
        // sunrise/sunset blend
        const t = dayFactor / 0.3;
        skyColor.copy(sunsetColor).lerp(dayColor, t);
      } else {
        skyColor.copy(nightColor);
      }
      scene.background = skyColor;
      if (scene.fog) {
        (scene.fog as THREE.Fog).color.copy(skyColor);
      }
    }

    // === Block highlight (wireframe box at looked-at block) ===
    const highlightGeo = new THREE.BoxGeometry(1.001, 1.001, 1.001);
    const highlightEdges = new THREE.EdgesGeometry(highlightGeo);
    const highlightMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const highlight = new THREE.LineSegments(highlightEdges, highlightMat);
    highlight.visible = false;
    scene.add(highlight);

    // ETAP 2.2: 4-stage crack overlay. Each stage is its own mesh with its own
    // CanvasTexture (procedurally generated). When mining a block we look up
    // BlockHealthMap.getDamageStage() and toggle the matching mesh on; the
    // other three are hidden. Slightly larger than 1.0 so it doesn't z-fight
    // with the underlying block faces.
    const crackTextures = getCrackTextures();
    const crackOverlayGeo = new THREE.BoxGeometry(1.012, 1.012, 1.012);
    const crackOverlays: THREE.Mesh[] = [];
    for (let stage = 0; stage < 4; stage++) {
      const mat = new THREE.MeshBasicMaterial({
        map: crackTextures[stage],
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });
      const mesh = new THREE.Mesh(crackOverlayGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 2; // render after opaque block geometry
      scene.add(mesh);
      crackOverlays.push(mesh);
    }

    // === Main loop ===
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTime = 0;
    let fps = 0;
    let uiSyncTimer = 0;
    let chunkUpdateAccum = 0;
    let running = true;
    let lastFrameTimeMs = 0;

    function frame() {
      if (!running) return;
      requestAnimationFrame(frame);

      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastFrameTimeMs = now - lastTime;
      lastTime = now;
      frameCount++;
      fpsTime += dt;
      if (fpsTime > 0.5) {
        fps = Math.round(frameCount / fpsTime);
        frameCount = 0;
        fpsTime = 0;
        stateRef.current.fps = fps;
        stateRef.current.frameTimeMs = Math.round(lastFrameTimeMs * 10) / 10;
      }

      try {
        if (!stateRef.current.paused && !stateRef.current.dead) {
          updatePlayer(dt);
          updateDayNight(dt);
        }

        // Update chunks - only when not paused (player has pointer lock)
        // and throttle the discovery pass (chunkManager.update) to every 250ms.
        // The actual meshing happens in processBuildQueue(), which is called
        // every frame with a 4ms time budget.
        if (!stateRef.current.paused) {
          chunkUpdateAccum += dt;
          if (chunkUpdateAccum > 0.25) {
            chunkUpdateAccum = 0;
            chunkManager.update(player.position.x, player.position.z, 1);
          }
          // Time-boxed meshing — never blocks the frame for more than 4ms
          chunkManager.processBuildQueue(4);
        }
        stateRef.current.chunkCount = chunkManager.chunks.size;
        stateRef.current.triangleCount = Math.round(chunkManager.triangleCount);
        stateRef.current.workerQueueDepth = chunkManager['buildQueue'] ? chunkManager['buildQueue'].length : 0;

      // Update highlight
      const hit = getLookingAt();
      if (hit.hit) {
        highlight.visible = true;
        highlight.position.set(hit.block.x + 0.5, hit.block.y + 0.5, hit.block.z + 0.5);
        stateRef.current.lookingAt = hit.blockType;
      } else {
        highlight.visible = false;
        stateRef.current.lookingAt = null;
      }

      // Crack overlay — pick the stage from BlockHealthMap and toggle the
      // matching mesh. All other stages are hidden.
      if (leftMouseDown && breakingBlock) {
        const bt = world.getBlock(breakingBlock.x, breakingBlock.y, breakingBlock.z);
        const stage = blockHealth.getDamageStage(breakingBlock.x, breakingBlock.y, breakingBlock.z, bt);
        for (let i = 0; i < 4; i++) {
          if (i + 1 === stage) {
            crackOverlays[i].visible = true;
            crackOverlays[i].position.set(breakingBlock.x + 0.5, breakingBlock.y + 0.5, breakingBlock.z + 0.5);
          } else {
            crackOverlays[i].visible = false;
          }
        }
      } else {
        for (let i = 0; i < 4; i++) crackOverlays[i].visible = false;
      }

      // Determine biome at player position
      const wx = Math.floor(player.position.x);
      const wz = Math.floor(player.position.z);
      const groundBlock = world.getBlock(wx, Math.floor(player.position.y - 0.5), wz);
      // Use world.getBiomeAt for accurate biome name
      const biomeId = world.getBiomeAt(Math.floor(player.position.x), Math.floor(player.position.z));
      stateRef.current.biome = world.getBiomeName(biomeId);

      // Sync UI (throttled)
      uiSyncTimer += dt;
      if (uiSyncTimer > 0.1) {
        uiSyncTimer = 0;
        // Push hotbar & inventory snapshot to UI
        stateRef.current.hotbar = [...hotbar];
        stateRef.current.inventory = inventory.filter(i => i.count > 0 && i.block !== 'air');
        syncUI();
      }

      renderer.render(scene, camera);

      // Collect render-info stats (draw calls, triangles) after render so they
      // reflect the most recent frame. Push to UI state via syncUI() below.
      const info = renderer.info.render;
      stateRef.current.drawCalls = info.calls;
      stateRef.current.triangles = info.triangles;
      // Reset renderer.info each frame so calls/tris don't accumulate
      renderer.info.reset();
      } catch (err) {
        console.error('Game frame error:', err);
      }
    }

    frame();

    // === Public control API ===
    gameRef.current = {
      start: () => {
        canvas.requestPointerLock();
      },
      respawn: () => {
        const s = world.findSpawn();
        player.position = { x: s.x, y: s.y, z: s.z };
        player.velocity = { x: 0, y: 0, z: 0 };
        stateRef.current.health = 20;
        stateRef.current.hunger = 20;
        stateRef.current.stamina = 100;
        stateRef.current.dead = false;
        stateRef.current.message = null;
        syncUI();
      },
      setHotbarSlot: (slot: number, block: BlockType | null) => {
        if (slot >= 0 && slot < HOTBAR_SLOTS) {
          hotbar[slot] = block;
        }
      },
      getInventory: () => inventory,
      getHotbar: () => hotbar,
      moveItemToHotbar: (invIndex: number, hotbarSlot: number) => {
        if (invIndex < 0 || invIndex >= inventory.length) return;
        if (hotbarSlot < 0 || hotbarSlot >= HOTBAR_SLOTS) return;
        const invItem = inventory[invIndex];
        if (invItem.count === 0 || invItem.block === 'air') return;
        const current = hotbar[hotbarSlot];
        hotbar[hotbarSlot] = invItem.block;
        if (current) {
          invItem.block = current;
        } else {
          invItem.block = 'air';
          invItem.count = 0;
        }
      },
      addToInventoryFromUI: (block: BlockType, count: number) => addToInventory(block, count),
      craftItem: (recipeId: string, recipes: any[]) => {
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return false;
        // Check ingredients
        for (const ing of recipe.ingredients) {
          if (getInventoryCount(ing.block) < ing.count) {
            setMessage(`Brak składników: ${BLOCKS[ing.block].name}`, 1800);
            return false;
          }
        }
        // Consume
        for (const ing of recipe.ingredients) {
          removeFromInventory(ing.block, ing.count);
        }
        // Add output (if it's a tool, simulate by adding the block as a marker)
        addToInventory(recipe.output.block, recipe.output.count);
        setMessage(`Wytworzono: ${recipe.name}`, 1500);
        syncUI();
        return true;
      },
      giveItem: (block: BlockType, count: number) => {
        addToInventory(block, count);
        setMessage(`Dodano ${count}× ${BLOCKS[block].name}`, 1200);
        syncUI();
      },
      getState: () => stateRef.current,
    };

    // Cleanup
    return () => {
      running = false;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [canvasRef, syncUI, setMessage, enabled]);

  const startGame = useCallback(() => {
    gameRef.current?.start();
  }, []);

  const respawn = useCallback(() => {
    gameRef.current?.respawn();
  }, []);

  const setHotbarSlot = useCallback((slot: number, block: BlockType | null) => {
    gameRef.current?.setHotbarSlot(slot, block);
  }, []);

  const moveItemToHotbar = useCallback((invIndex: number, hotbarSlot: number) => {
    gameRef.current?.moveItemToHotbar(invIndex, hotbarSlot);
  }, []);

  const craftItem = useCallback((recipeId: string, recipes: any[]) => {
    return gameRef.current?.craftItem(recipeId, recipes);
  }, []);

  const giveItem = useCallback((block: BlockType, count: number) => {
    gameRef.current?.giveItem(block, count);
  }, []);

  return {
    uiState,
    startGame,
    respawn,
    setHotbarSlot,
    moveItemToHotbar,
    craftItem,
    giveItem,
  };
}
