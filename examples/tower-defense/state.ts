// The game's state shape and its starting value

import { CANVAS_WIDTH, LANE_Y, START_LIVES, spawnIntervalAt } from "./constants";

export type Enemy = { id: number; x: number; hp: number; maxHp: number };
export type Turret = { id: number; x: number; y: number; cooldown: number };
export type Beam = { from: { x: number; y: number }; to: { x: number; y: number }; timeLeft: number };
export type Explosion = { x: number; y: number; age: number };

export type GameState = {
  enemies: Enemy[];
  nextEnemyId: number;
  spawnTimer: number;
  elapsed: number;
  turrets: Turret[];
  nextTurretId: number;
  beams: Beam[];
  explosions: Explosion[];
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
  lives: START_LIVES,
  score: 0,
  gold: 0,
};
