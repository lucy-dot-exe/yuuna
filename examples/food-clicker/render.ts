// Turns the current state into what gets drawn this frame
// Renderable comes from the engine's ambient types, same as in a single-file
// example — only the cross-file pieces (constants, GameState) are imported

import { CANVAS_WIDTH, CENTER, FOOD_LIFETIME, FOOD_SCALE, POPUP_DURATION, POPUP_RISE } from "./constants";
import { GameState } from "./state";

type RenderFunction = (state: GameState) => { renderables: Renderable[] };

export const render: RenderFunction = (state) => {
  return {
    renderables: [
      // Renders the score, centered on the canvas
      {
        type: "TEXT",
        text: `${state.eaten}`,
        color: "white",

        position: CENTER,

        align: {
          x: "center",
          y: "middle",
        },
      },

      // Renders a music on/off icon in the top-right corner
      {
        type: "TEXT",
        text: state.isMusicPlaying ? "⏸" : "▶",
        color: "white",

        isClickable: true,
        id: "music-toggle",

        position: { x: CANVAS_WIDTH - 30, y: 30 },

        align: {
          x: "right",
          y: "middle",
        },
      },

      // Renders each currently-spawned food, fading out as it ages
      ...state.foods.map(
        (food): Renderable => ({
          type: "SPRITE",
          resourceId: "food",
          frame: food.frame,
          scale: { x: FOOD_SCALE, y: FOOD_SCALE },
          opacity: Math.max(0, 1 - food.age / FOOD_LIFETIME),

          isClickable: true,
          id: `food-${food.id}`,

          position: { x: food.x, y: food.y },
        })
      ),

      // Renders each "+1" popup, drifting upward and fading out via its
      // color's alpha channel — TEXT has no opacity prop like SPRITE does
      ...state.popups.map((popup): Renderable => {
        const progress = popup.age / POPUP_DURATION;

        return {
          type: "TEXT",
          text: "+1",
          color: `rgba(255, 215, 0, ${Math.max(0, 1 - progress)})`,

          position: { x: popup.x, y: popup.y - POPUP_RISE * progress },

          align: {
            x: "center",
            y: "middle",
          },
        };
      }),
    ],
  };
};
