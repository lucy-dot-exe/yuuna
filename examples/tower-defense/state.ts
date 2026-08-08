// The game's state shape and its starting value

import { CANVAS_WIDTH, LANE_Y, START_LIVES, spawnIntervalAt } from "./constants";

export type Enemy = { id: number; x: number; hp: number; maxHp: number };
export type Turret = { id: number; x: number; y: number; cooldown: number };
export type Beam = { from: { x: number; y: number }; to: { x: number; y: number }; timeLeft: number };
// id needed so its ANIMATED_SPRITE can be tracked independently — several
// explosions can be alive at once, and an array index isn't stable across
// frames (an earlier one expiring shifts every later one's index).
export type Explosion = { id: number; x: number; y: number; age: number };

export type GameState = {
  enemies: Enemy[];
  nextEnemyId: number;
  spawnTimer: number;
  elapsed: number;
  turrets: Turret[];
  nextTurretId: number;
  beams: Beam[];
  explosions: Explosion[];
  nextExplosionId: number;
  lives: number;
  score: number;
  gold: number;
};

export const initialState: GameState = {
  enemies: [],
  nextEnemyId: 0,
  spawnTimer: spawnIntervalAt(0),
  elapsed: 0,
  turrets: [{ id: 0, x: CANVAS_WIDTH / 2, y: LANE_Y - 80, cooldown: 0 }],
  nextTurretId: 1,
  beams: [],
  explosions: [],
  nextExplosionId: 0,
  lives: START_LIVES,
  score: 0,
  gold: 0,
};
