// Shared config and small pure helpers — no rendering or state-update
// logic here, just numbers (and a couple of derivations from them) that
// state.ts, render.ts, and nextState.ts all lean on.

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;
export const LANE_Y = 270;
export const LANE_HEIGHT = 40;

export const TOWER_RANGE = 160;
export const TOWER_COOLDOWN = 700; // milliseconds between shots
export const TOWER_DAMAGE = 1; // damage dealt per shot
export const TURRET_COST = 5; // gold required to build a turret
export const BEAM_DURATION = 120; // milliseconds the firing line stays visible

export const ENEMY_SPEED = 0.05; // pixels per millisecond
export const ENEMY_HP_TIERS = [1, 2, 4, 8]; // each spawn is randomly one of these

export const SKELETON_FRAME_SIZE = 16; // native pixels per frame, before scale
export const SKELETON_FRAME_COUNT = 3;
export const SKELETON_SCALE = 4;
export const WALK_FRAME_DURATION = 150; // milliseconds each animation frame is shown

export const EXPLOSION_FRAME_SIZE = 64; // native pixels per frame, before scale
export const EXPLOSION_FRAME_COUNT = 12;
export const EXPLOSION_SCALE = 1.5;
export const EXPLOSION_FRAME_DURATION = 40; // milliseconds each animation frame is shown
export const EXPLOSION_DURATION = EXPLOSION_FRAME_COUNT * EXPLOSION_FRAME_DURATION;

export const TERRAIN_TILE_SIZE = 16; // native pixels per tile, before scale
export const TERRAIN_TILE_COUNT = 16;
export const TERRAIN_SCALE = 4;
export const TERRAIN_PATH_FRAME = 0; // first frame: dirt
export const TERRAIN_BACKGROUND_FRAME = TERRAIN_TILE_COUNT - 1; // last frame: grass

// Enemies spawn in repeating 20s waves: each wave starts spaced out, gets
// denser toward the middle, then spaces back out again — and every new
// wave unlocks the next, tougher hp tier, so the "spaced out" phase you
// return to is harder than the one you started with.
export const WAVE_DURATION = 20000;
export const BASE_SPAWN_INTERVAL = 1400;
export const SPAWN_INTERVAL_AMPLITUDE = 800;

export const START_LIVES = 5;

export const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const spawnIntervalAt = (elapsed: number): number => {
  const waveProgress = (elapsed % WAVE_DURATION) / WAVE_DURATION;
  return BASE_SPAWN_INTERVAL - SPAWN_INTERVAL_AMPLITUDE * Math.sin(Math.PI * waveProgress);
};

export const hpTiersAt = (elapsed: number): number[] => {
  const waveIndex = Math.floor(elapsed / WAVE_DURATION);
  const maxTierIndex = Math.min(ENEMY_HP_TIERS.length - 1, waveIndex);
  return ENEMY_HP_TIERS.slice(0, maxTierIndex + 1);
};

// Draw order is controlled explicitly by layer instead of relying on
// render()'s array order, so it stays correct no matter how render.ts
// ends up organized — lower draws further back. In particular this is
// what guarantees the UI text always sits on top of the game world (an
// enemy or explosion near the top-left can't visually cover the score)
// and "Game Over" sits on top of literally everything.
export const LAYERS = {
  terrain: -10,
  buildArea: -10,
  turret: 0,
  enemy: 1,
  beam: 2,
  explosion: 3,
  ui: 10,
  gameOver: 20,
};
