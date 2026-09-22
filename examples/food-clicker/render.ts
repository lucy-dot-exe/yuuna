// Turns the current state into what gets drawn this frame
// Renderable comes from the engine's ambient types, same as in a single-file
// example — only the cross-file pieces (constants, GameState) are imported

import {
  CANVAS_WIDTH,
  CENTER,
  FOOD_LIFETIME,
  FOOD_SCALE,
  GameState,
  POPUP_DURATION,
  POPUP_RISE,
} from "./state";

type RenderFunction = (state: GameState) => { renderables: Renderable[] };

// A big, centered line — the title, or the game over screen's score
const heading = (text: string, y: number): Renderable =>
  Yuuna.text({
    text,
    color: "white",
    fontSize: 48,
    position: { x: CENTER.x, y },
    align: { x: "center", y: "middle" },
  });

// A centered button: a background rectangle (the actual clickable target,
// so its hit area exactly matches what's drawn) behind a text label —
// Start, Back to Title. width is per-button since TEXT has no fixed size
// to derive one from (see the engine's own TEXT hit-testing, which
// measures it the same way at click time).
const BUTTON_HEIGHT = 50;
const button = (text: string, id: string, y: number, width: number): Renderable[] => [
  Yuuna.rectangle({
    color: "#3a5fb0",
    isClickable: true,
    id,
    position: { x: CENTER.x - width / 2, y: y - BUTTON_HEIGHT / 2 },
    size: { width, height: BUTTON_HEIGHT },
  }),
  Yuuna.text({
    text,
    color: "white",
    fontSize: 32,
    position: { x: CENTER.x, y },
    align: { x: "center", y: "middle" },
  }),
];

const titleScreen = (): Renderable[] => [
  heading("Food Clicker", CENTER.y - 50),
  ...button("Start", "start-button", CENTER.y + 30, 160),
];

const gameOverScreen = (state: GameState): Renderable[] => [
  heading(`Score: ${state.score}`, CENTER.y - 50),
  ...button("Back to Title", "restart-button", CENTER.y + 30, 260),
];

const playingScreen = (state: GameState): Renderable[] => [
  // The running score, top-left
  Yuuna.text({
    text: `Score: ${state.score}`,
    color: "white",
    position: { x: 20, y: 30 },
    align: { x: "left", y: "middle" },
  }),

  // Seconds left in the round, top-center
  Yuuna.text({
    text: `${Math.ceil(state.timeLeft / 1000)}s`,
    color: "white",
    position: { x: CENTER.x, y: 30 },
    align: { x: "center", y: "middle" },
  }),

  // Renders each currently-spawned food, fading out as it ages
  ...state.foods.map((food) =>
    Yuuna.sprite({
      resourceId: "food",
      frame: food.frame,
      scale: { x: FOOD_SCALE, y: FOOD_SCALE },
      opacity: Math.max(0, 1 - food.age / FOOD_LIFETIME),

      isClickable: true,
      id: `food-${food.id}`,

      position: { x: food.x, y: food.y },
    })
  ),

  // Renders each "+n" popup, drifting upward and fading out via its
  // color's alpha channel — TEXT has no opacity prop like SPRITE does
  ...state.popups.map((popup) => {
    const progress = popup.age / POPUP_DURATION;

    return Yuuna.text({
      text: `+${popup.value}`,
      color: `rgba(255, 215, 0, ${Math.max(0, 1 - progress)})`,

      position: { x: popup.x, y: popup.y - POPUP_RISE * progress },

      align: {
        x: "center",
        y: "middle",
      },
    });
  }),
];

export const render: RenderFunction = (state) => {
  // The music toggle stays up in every phase, title/game-over included
  const musicToggle = Yuuna.text({
    text: state.isMusicPlaying ? "⏸" : "▶",
    color: "white",

    isClickable: true,
    id: "music-toggle",

    position: { x: CANVAS_WIDTH - 30, y: 30 },

    align: {
      x: "right",
      y: "middle",
    },
  });

  const screen =
    state.phase === "title"
      ? titleScreen()
      : state.phase === "over"
      ? gameOverScreen(state)
      : playingScreen(state);

  return { renderables: [musicToggle, ...screen] };
};
