// The game's state shape, its starting value, and how a new food is spawned

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  FOOD_DISPLAY_SIZE,
  FOOD_FRAME_COUNT,
  SPAWN_MARGIN,
  randomBetween,
} from "./constants";

export type Food = { id: number; x: number; y: number; frame: number; age: number };
// A "+1" that appears where a food was clicked, drifts up, and fades out
export type Popup = { id: number; x: number; y: number; age: number };

export type GameState = {
  foods: Food[];
  nextFoodId: number;
  spawnTimer: number;
  popups: Popup[];
  nextPopupId: number;
  eaten: number;
  // isMusicStarted only tracks the one-time auto-start in nextState.ts;
  // isMusicPlaying is the current on/off state the icon toggles
  isMusicStarted: boolean;
  isMusicPlaying: boolean;
};

export const initialState: GameState = {
  foods: [],
  nextFoodId: 0,
  spawnTimer: 0, // spawns the first food right away instead of after a wait
  popups: [],
  nextPopupId: 0,
  eaten: 0,
  isMusicStarted: false,
  isMusicPlaying: false,
};

export const spawnFood = (id: number): Food => ({
  id,
  x: randomBetween(SPAWN_MARGIN, CANVAS_WIDTH - FOOD_DISPLAY_SIZE - SPAWN_MARGIN),
  y: randomBetween(SPAWN_MARGIN, CANVAS_HEIGHT - FOOD_DISPLAY_SIZE - SPAWN_MARGIN),
  frame: Math.floor(Math.random() * FOOD_FRAME_COUNT),
  age: 0,
});
