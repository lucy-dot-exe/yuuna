// Fullscreen — requestFullscreen()/exitFullscreen(), returned from
// runEngine() alongside sendEvent, wrap the Fullscreen API on the canvas.
//
// They can't be called from nextState: the Fullscreen API only grants a
// request made synchronously within a user gesture, and nextState runs
// from the engine's own event queue instead of directly inside the click
// that triggered it — see RunEngineFunction's requestFullscreen doc
// comment in src/engine/types.ts. So this example wires its own native
// click listener on the canvas instead, toggling on document.fullscreen-
// Element directly. FULLSCREEN_CHANGE is still how nextState finds out
// fullscreen actually changed, whether that came from this click or the
// user pressing Esc — the reliable way to reflect the real state either
// way.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const CENTER = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

// Create a type for the state of your game
type GameState = { isFullscreen: boolean };

// Create the initial state
const initialState: GameState = { isFullscreen: false };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => ({
  renderables: [
    Yuuna.rectangle({
      color: "#2d5c8f",
      position: { x: CENTER.x - 140, y: CENTER.y - 25 },
      size: { width: 280, height: 50 },
    }),
    Yuuna.text({
      text: state.isFullscreen ? "Fullscreen" : "Not fullscreen",
      color: "white",
      position: CENTER,
      align: { x: "center", y: "middle" },
    }),
    Yuuna.text({
      text: "Click anywhere to toggle fullscreen (or press Esc to leave it)",
      color: "#8899aa",
      fontSize: 20,
      position: { x: CENTER.x, y: CANVAS_HEIGHT - 30 },
      align: { x: "center", y: "middle" },
    }),
  ],
});

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "FULLSCREEN_CHANGE") {
    return { isFullscreen: event.isFullscreen };
  }
};

// Runs the engine, then wires a native click listener (not isClickable/
// CLICK — see the file header) that requests/exits fullscreen directly
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },
}).then(({ requestFullscreen, exitFullscreen }) => {
  const canvas = document.getElementById("yuuna")!;

  canvas.addEventListener("click", () => {
    if (document.fullscreenElement === canvas) {
      exitFullscreen();
    } else {
      requestFullscreen();
    }
  });
});
