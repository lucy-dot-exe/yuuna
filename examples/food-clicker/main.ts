// Entry point — wires the pieces from the other files together and starts
// the engine. This would be the file a multi-file playground runs.

import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./constants";
import { GameState, initialState } from "./state";
import { render } from "./render";
import { nextState } from "./nextState";

Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },

  // Loads the food spritesheet: a 128x128 image sliced into an 8x8 grid
  // of 16x16 food icons, referenced by resourceId below
  resources: {
    food: {
      src: "./resources/food.png",
      size: { width: 128, height: 128 },
      slices: { horizontal: 8, vertical: 8 },
    },
  },

  // Loads the collect sound effect and background music track, played by
  // playSound("collect") and playMusic("theme")/pauseMusic() in nextState.ts
  sounds: {
    collect: { src: "./resources/collect.wav" },
  },
  music: {
    theme: { src: "./resources/floating-dream.ogg" },
  },
});
