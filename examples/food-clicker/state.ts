// Canvas/spawn/round tuning, the game's state shape and starting value,
// and how a new food is spawned

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;
export const CENTER = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

export const FOOD_NATIVE_SIZE = 16; // one food icon, before scale
export const FOOD_FRAME_COUNT = 64; // an 8x8 grid of 16x16 food icons
export const FOOD_SCALE = 4;
export const FOOD_DISPLAY_SIZE = FOOD_NATIVE_SIZE * FOOD_SCALE;

export const FOOD_LIFETIME = 3000; // milliseconds a food stays before disappearing
export const SPAWN_MARGIN = 20; // keeps spawns off the canvas edges

// Spawns get faster as a catching streak (see COMBO_WINDOW below) builds
// up — spawnIntervalFor(combo) is how much that streak has shaved off.
export const BASE_SPAWN_INTERVAL = 900; // milliseconds between spawns at combo 0
export const MIN_SPAWN_INTERVAL = 250; // the fastest spawning ever gets
export const SPAWN_STEP = 40; // milliseconds shaved off per combo point
export const spawnIntervalFor = (combo: number) =>
  Math.max(MIN_SPAWN_INTERVAL, BASE_SPAWN_INTERVAL - combo * SPAWN_STEP);

// Catching a food within this long of the last catch keeps the combo (and
// its score/speed bonus) going; any slower and it resets back to 1.
export const COMBO_WINDOW = 800;

export const ROUND_DURATION = 30000; // milliseconds per run

export const POPUP_DURATION = 600; // milliseconds a "+n" popup stays on screen
export const POPUP_RISE = 40; // pixels a "+n" popup drifts upward over its lifetime

export type Food = { id: number; x: number; y: number; frame: number; age: number };
// A "+<value>" that appears where a food was caught, drifts up, and fades out
export type Popup = { id: number; x: number; y: number; age: number; value: number };

export type GameState = {
  // title: waiting on the Start button. playing: the round is running.
  // over: the round ended, waiting on the button back to title.
  phase: "title" | "playing" | "over";
  timeLeft: number; // milliseconds left in the round, counts down while playing

  foods: Food[];
  nextFoodId: number;
  spawnTimer: number;

  popups: Popup[];
  nextPopupId: number;

  score: number;
  combo: number;
  // Milliseconds since the last catch — Infinity before the first one, so
  // that catch always starts the combo at 1 rather than reading stale
  // state left over from a previous run (see spawnIntervalFor/COMBO_WINDOW).
  sinceLastCatch: number;

  // isMusicStarted only tracks the one-time auto-start in nextState.ts;
  // isMusicPlaying is the current on/off state the icon toggles
  isMusicStarted: boolean;
  isMusicPlaying: boolean;
};

export const initialState: GameState = {
  phase: "title",
  timeLeft: ROUND_DURATION,

  foods: [],
  nextFoodId: 0,
  spawnTimer: 0, // spawns the first food right away instead of after a wait

  popups: [],
  nextPopupId: 0,

  score: 0,
  combo: 0,
  sinceLastCatch: Infinity,

  isMusicStarted: false,
  isMusicPlaying: false,
};

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

export const spawnFood = (id: number): Food => ({
  id,
  x: randomBetween(SPAWN_MARGIN, CANVAS_WIDTH - FOOD_DISPLAY_SIZE - SPAWN_MARGIN),
  y: randomBetween(SPAWN_MARGIN, CANVAS_HEIGHT - FOOD_DISPLAY_SIZE - SPAWN_MARGIN),
  frame: Math.floor(Math.random() * FOOD_FRAME_COUNT),
  age: 0,
});
