// Canvas size, spawn/lifetime tuning, and small helpers shared by the
// rest of this game's files

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;
export const CENTER = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

export const FOOD_NATIVE_SIZE = 16; // one food icon, before scale
export const FOOD_FRAME_COUNT = 64; // an 8x8 grid of 16x16 food icons
export const FOOD_SCALE = 4;
export const FOOD_DISPLAY_SIZE = FOOD_NATIVE_SIZE * FOOD_SCALE;

export const FOOD_LIFETIME = 3000; // milliseconds a food stays before disappearing
export const SPAWN_INTERVAL = 600; // milliseconds between spawns
export const SPAWN_MARGIN = 20; // keeps spawns off the canvas edges

export const POPUP_DURATION = 600; // milliseconds the "+1" stays on screen
export const POPUP_RISE = 40; // pixels the "+1" drifts upward over its lifetime

export const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
