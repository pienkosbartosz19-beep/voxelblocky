// config.ts — Single source of truth for all game constants (per PROJECT_CONTEXT)
// Import from here everywhere. No magic numbers in core logic.

export const CONFIG = {
  // World geometry (Faza 1)
  CHUNK_SIZE: 16,
  WORLD_HEIGHT: 64,
  SEA_LEVEL: 24,
  RENDER_DISTANCE: 12, // blocked decision from PROJECT_CONTEXT - do not change
  REACH: 5, // block interaction reach (was in prior blocks.ts)

  // Player / physics (sane defaults for runnable prototype)
  GRAVITY: -28,
  JUMP_VELOCITY: 9.2,
  WALK_SPEED: 4.6,
  SPRINT_SPEED: 7.5,
  FLY_SPEED: 12,

  // Generation
  DEFAULT_SEED: 1337,

  // Telemetry / perf
  TARGET_FPS: 60,
} as const;

export type GameConfig = typeof CONFIG;

// Re-export as WORLD_CONFIG for backward compat during transition
export const WORLD_CONFIG = CONFIG;
