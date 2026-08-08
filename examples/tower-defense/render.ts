// Turns the current state into what gets drawn this frame
// Renderable comes from the engine's ambient types, same as in a single-file
// example — only the cross-file pieces (constants, GameState) are imported

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LANE_Y,
  LANE_HEIGHT,
  TURRET_COST,
  SKELETON_FRAME_SIZE,
  SKELETON_FRAME_COUNT,
  SKELETON_SCALE,
  WALK_FRAME_DURATION,
  EXPLOSION_FRAME_SIZE,
  EXPLOSION_FRAME_COUNT,
  EXPLOSION_FRAME_DURATION,
  EXPLOSION_SCALE,
  TERRAIN_TILE_SIZE,
  TERRAIN_SCALE,
  TERRAIN_PATH_FRAME,
  TERRAIN_BACKGROUND_FRAME,
  LAYERS,
} from "./constants";
import { GameState, Enemy } from "./state";

// Repeats one terrain tile across a rectangular area — there's no
// built-in pattern fill, so this just lays down a grid of SPRITEs. Takes
// the same { position, size } shape as a RECTANGLE renderable, so the
// same area can be reused for both the visual tiling and a click target.
const tileGrid = (
  area: { position: { x: number; y: number }; size: { width: number; height: number } },
  frame: number
): Renderable[] => {
  const displayTileSize = TERRAIN_TILE_SIZE * TERRAIN_SCALE;
  const columns = Math.ceil(area.size.width / displayTileSize);
  const rows = Math.ceil(area.size.height / displayTileSize);
  const tiles: Renderable[] = [];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      tiles.push({
        type: "SPRITE",
        resourceId: "terrain",
        frame,
        scale: { x: TERRAIN_SCALE, y: TERRAIN_SCALE },
        layer: LAYERS.terrain,
        position: {
          x: area.position.x + column * displayTileSize,
          y: area.position.y + row * displayTileSize,
        },
      });
    }
  }

  return tiles;
};

const HP_BAR_WIDTH = 32;
const HP_BAR_HEIGHT = 5;

// Each enemy is a group: an invisible, zero-size RECTANGLE anchored at
// its lane position, with the walking skeleton and a health bar as
// children positioned relative to it (the same trick the invisible
// "build-area" click targets below use for invisibility). moveEnemies in
// nextState.ts only ever has to move this one anchor point — the skeleton
// and health bar ride along with it instead of each needing enemy.x/LANE_Y
// re-added by hand.
const enemyGroup = (enemy: Enemy, elapsed: number): Renderable => {
  const displaySize = SKELETON_FRAME_SIZE * SKELETON_SCALE;
  const walkFrame = Math.floor(elapsed / WALK_FRAME_DURATION) % SKELETON_FRAME_COUNT;
  const hpFraction = Math.max(0, enemy.hp / enemy.maxHp);

  // Tints the skeleton redder as it takes damage (dimming green/blue,
  // keeping red), layered on top of the existing opacity fade
  const damageChannel = Math.round(255 * hpFraction);

  return {
    type: "RECTANGLE",
    color: "rgba(0,0,0,0)",
    size: { width: 0, height: 0 },
    layer: LAYERS.enemy,
    position: { x: enemy.x, y: LANE_Y },

    children: [
      {
        type: "SPRITE",
        resourceId: "skeleton",
        frame: walkFrame,
        scale: { x: SKELETON_SCALE, y: SKELETON_SCALE },
        opacity: Math.max(0.35, hpFraction),
        modulate: `rgb(255, ${damageChannel}, ${damageChannel})`,
        position: { x: -displaySize / 2, y: -displaySize / 2 },
      },

      // Health bar background
      {
        type: "RECTANGLE",
        color: "#222222",
        position: { x: -HP_BAR_WIDTH / 2, y: -displaySize / 2 - 10 },
        size: { width: HP_BAR_WIDTH, height: HP_BAR_HEIGHT },
      },
      // Health bar fill — scaled by remaining hp fraction. RECTANGLE's
      // scale anchors at its own position (its top-left corner, here the
      // bar's left edge), so shrinking scale.x pulls the right edge in
      // and drains the bar from the right while the left edge stays put.
      {
        type: "RECTANGLE",
        color: hpFraction > 0.5 ? "#5ec95e" : hpFraction > 0.25 ? "#e0c341" : "#e05a4b",
        position: { x: -HP_BAR_WIDTH / 2, y: -displaySize / 2 - 10 },
        size: { width: HP_BAR_WIDTH, height: HP_BAR_HEIGHT },
        scale: { x: hpFraction, y: 1 },
      },
    ],
  };
};

type RenderFunction = (state: GameState) => { renderables: Renderable[] };
export const render: RenderFunction = (state) => {
  const aboveLane = {
    position: { x: 0, y: 0 },
    size: { width: CANVAS_WIDTH, height: LANE_Y - LANE_HEIGHT / 2 },
  };
  const belowLane = {
    position: { x: 0, y: LANE_Y + LANE_HEIGHT / 2 },
    size: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT - (LANE_Y + LANE_HEIGHT / 2) },
  };
  const lane = {
    position: { x: 0, y: LANE_Y - LANE_HEIGHT / 2 },
    size: { width: CANVAS_WIDTH, height: LANE_HEIGHT },
  };

  const renderables: Renderable[] = [
    // Terrain background (grass) and path (dirt), tiled from terrain.png
    ...tileGrid(aboveLane, TERRAIN_BACKGROUND_FRAME),
    ...tileGrid(belowLane, TERRAIN_BACKGROUND_FRAME),
    ...tileGrid(lane, TERRAIN_PATH_FRAME),

    // Invisible click targets over the buildable ground, above and below
    // the path — clicking either builds a turret at that spot
    {
      type: "RECTANGLE",
      color: "rgba(0,0,0,0)",
      isClickable: true,
      id: "build-area",
      layer: LAYERS.buildArea,
      ...aboveLane,
    },
    {
      type: "RECTANGLE",
      color: "rgba(0,0,0,0)",
      isClickable: true,
      id: "build-area",
      layer: LAYERS.buildArea,
      ...belowLane,
    },

    // Turrets: each focuses one enemy at a time within TOWER_RANGE.
    // Tinted dim while recharging and bright once ready to fire, via
    // modulate, so readiness reads at a glance without extra UI.
    ...state.turrets.map(
      (turret): Renderable => ({
        type: "RECTANGLE",
        color: "steelblue",
        modulate: turret.cooldown > 0 ? "#888899" : "#aaccff",
        layer: LAYERS.turret,
        position: { x: turret.x - 20, y: turret.y - 20 },
        size: { width: 40, height: 40 },
      })
    ),

    // A line flashes from turret to target for a moment when it fires
    ...state.beams.map(
      (beam): Renderable => ({
        type: "LINE",
        from: beam.from,
        to: beam.to,
        color: "yellow",
        width: 3,
        layer: LAYERS.beam,
      })
    ),

    { type: "TEXT", text: `Score: ${state.score}`, color: "white", layer: LAYERS.ui, position: { x: 20, y: 30 } },
    { type: "TEXT", text: `Lives: ${state.lives}`, color: "white", layer: LAYERS.ui, position: { x: 20, y: 70 } },
    {
      type: "TEXT",
      text: `Gold: ${state.gold}`,
      color: "#ffd700",
      layer: LAYERS.ui,
      position: { x: 20, y: 110 },
    },
    {
      type: "TEXT",
      text: `Click off the path to build a turret (${TURRET_COST} gold)`,
      color: "#8899aa",
      layer: LAYERS.ui,
      position: { x: 20, y: CANVAS_HEIGHT - 30 },
    },

    // A walking skeleton + health bar for each enemy — see enemyGroup
    ...state.enemies.map((enemy): Renderable => enemyGroup(enemy, state.elapsed)),

    // A one-shot burst where an enemy died, on top of everything else
    ...state.explosions.map((explosion): Renderable => {
      const displaySize = EXPLOSION_FRAME_SIZE * EXPLOSION_SCALE;
      const frame = Math.min(
        EXPLOSION_FRAME_COUNT - 1,
        Math.floor(explosion.age / EXPLOSION_FRAME_DURATION)
      );

      return {
        type: "SPRITE",
        resourceId: "explosion",
        frame,
        scale: { x: EXPLOSION_SCALE, y: EXPLOSION_SCALE },
        layer: LAYERS.explosion,
        position: { x: explosion.x - displaySize / 2, y: explosion.y - displaySize / 2 },
      };
    }),
  ];

  if (state.lives <= 0) {
    renderables.push({
      type: "TEXT",
      text: "Game Over",
      color: "white",
      fontSize: 48,
      layer: LAYERS.gameOver,
      position: { x: CANVAS_WIDTH / 2, y: LANE_Y },
      align: { x: "center", y: "middle" },
    });
  }

  return { renderables };
};
