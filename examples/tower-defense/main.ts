// Tower Defense — enemies walk down the lane in escalating waves, turrets
// melt anything that gets close enough. Kills pay gold, and gold builds
// more turrets off the path. Let 5 enemies through and it's game over.
//
// Entry point — wires the pieces from the other files together and starts
// the engine.

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CAMERA,
  SKELETON_FRAME_SIZE,
  SKELETON_FRAME_COUNT,
  EXPLOSION_FRAME_SIZE,
  EXPLOSION_FRAME_COUNT,
  TERRAIN_TILE_SIZE,
  TERRAIN_TILE_COUNT,
} from "./constants";
import { GameState, initialState } from "./state";
import { render } from "./render";
import {
  freezeOnGameOver,
  buildTurret,
  advanceTime,
  moveEnemies,
  fireTurrets,
  resolveKills,
  resolveLeaks,
  spawnEnemies,
  ageBeams,
  ageExplosions,
} from "./nextState";

// Runs the engine — nextState is just the list of mechanics above, run in
// order for every event
Yuuna.runEngine<GameState>({
  initialState,
  render,
  nextState: [
    freezeOnGameOver,
    buildTurret,
    advanceTime,
    moveEnemies,
    fireTurrets,
    resolveKills,
    resolveLeaks,
    spawnEnemies,
    ageBeams,
    ageExplosions,
  ],

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },

  // Zooms out for a wider view of the battlefield — everything without
  // screenSpace: true (terrain, turrets, enemies, beams, explosions,
  // build-area click targets) pans/zooms with it; the score/lives/gold/
  // instructions text in render.ts opts out with screenSpace: true so
  // it stays fixed and readable regardless of zoom.
  camera: () => CAMERA,

  resources: {
    skeleton: {
      src: "./resources/skeleton.png",
      size: { width: SKELETON_FRAME_SIZE * SKELETON_FRAME_COUNT, height: SKELETON_FRAME_SIZE },
      slices: { horizontal: SKELETON_FRAME_COUNT, vertical: 1 },
    },
    explosion: {
      src: "./resources/explosion.png",
      size: { width: EXPLOSION_FRAME_SIZE * EXPLOSION_FRAME_COUNT, height: EXPLOSION_FRAME_SIZE },
      slices: { horizontal: EXPLOSION_FRAME_COUNT, vertical: 1 },
    },
    terrain: {
      src: "./resources/terrain.png",
      size: { width: TERRAIN_TILE_SIZE * TERRAIN_TILE_COUNT, height: TERRAIN_TILE_SIZE },
      slices: { horizontal: TERRAIN_TILE_COUNT, vertical: 1 },
    },
  },
});
