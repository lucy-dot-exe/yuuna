// Tab Visibility — TAB_BLUR fires when the browser tab this game is
// running in is switched away from (another tab, minimized, ...), and
// TAB_FOCUS when it becomes the active tab again. The canonical use is
// exactly what's below: pauseMusic() on TAB_BLUR, resumeMusic() on
// TAB_FOCUS, so background music doesn't keep playing (or drift out of
// sync with a paused game) while nobody's looking at the tab.
//
// Switch to another tab for a bit and come back to see it in action —
// the counters below only move on TAB_BLUR/TAB_FOCUS themselves, so
// they'll confirm what happened once you're back.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

// Create a type for the state of your game
type GameState = { isFocused: boolean; blurCount: number; isMusicStarted: boolean };

// Create the initial state
const initialState: GameState = { isFocused: true, blurCount: 0, isMusicStarted: false };

const CENTER = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    renderables: [
      Yuuna.circle({
        color: state.isFocused ? "#4fc3f7" : "#e05a4b",
        position: CENTER,
        radius: 40,
      }),
      Yuuna.text({
        text: state.isFocused ? "Focused" : "Blurred",
        color: "white",
        fontSize: 20,
        position: CENTER,
        align: { x: "center", y: "middle" },
      }),

      Yuuna.text({
        text: `Switched away ${state.blurCount} time(s)`,
        color: "white",
        position: { x: CANVAS_WIDTH / 2, y: CENTER.y + 80 },
        align: { x: "center", y: "middle" },
      }),
      Yuuna.text({
        text: "Music pauses on TAB_BLUR, resumes on TAB_FOCUS",
        color: "#8899aa",
        fontSize: 22,
        position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 30 },
        align: { x: "center", y: "middle" },
      }),
    ],
  };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event, playMusic, pauseMusic, resumeMusic }) => {
  // Starts the background music once, the first time nextState runs —
  // same as examples/food-clicker's nextState.ts
  if (!state.isMusicStarted) {
    playMusic("theme");
    return { ...state, isMusicStarted: true };
  }

  if (event.tag === "TAB_BLUR") {
    pauseMusic();
    return { ...state, isFocused: false, blurCount: state.blurCount + 1 };
  }

  if (event.tag === "TAB_FOCUS") {
    resumeMusic();
    return { ...state, isFocused: true };
  }
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },

  music: {
    theme: { src: "./resources/floating-dream.ogg" },
  },
});
