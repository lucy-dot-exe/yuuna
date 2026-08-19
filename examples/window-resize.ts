// Window Resize — canvas.resize lets the on-screen display size track the
// browser window while the logical resolution renderables are positioned
// in (CANVAS_WIDTH x CANVAS_HEIGHT below) stays fixed: "none" leaves the
// canvas at its fixed pixel size, "fit" letterboxes to preserve aspect
// ratio, and "stretch" fills the window on both axes (which can distort
// the grid below if the window's aspect ratio doesn't match the canvas's).
// A grid over the whole canvas makes the difference obvious at a glance —
// try resizing the browser window in each mode.
//
// canvas.resize is read once when runEngine() starts, not reactively (see
// applyResize() in src/engine/runEngine.ts) — so switching modes here just
// calls Yuuna.runEngine() again with a different canvas.resize, the same
// as reloading the page with a different value. That's safe to do as
// often as you like: resetCanvas, run internally as the first step of
// every runEngine() call, tears down the previous run's listeners/loop
// first.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const GRID_SIZE = 60;

type ResizeMode = "none" | "fit" | "stretch";

const MODES: ResizeMode[] = ["none", "fit", "stretch"];

type GameState = { mode: ResizeMode };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  const renderables: Renderable[] = [];

  // A grid over the whole logical canvas — the easiest way to see what
  // each resize mode actually does to the display: "stretch" turns the
  // squares into rectangles once the window's aspect ratio stops
  // matching the canvas's, "fit" keeps them square (with letterboxing)
  // instead.
  for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
    renderables.push({ type: "LINE", from: { x, y: 0 }, to: { x, y: CANVAS_HEIGHT }, color: "#22335a" });
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
    renderables.push({ type: "LINE", from: { x: 0, y }, to: { x: CANVAS_WIDTH, y }, color: "#22335a" });
  }

  renderables.push({
    type: "TEXT",
    text: `canvas.resize: "${state.mode}"`,
    color: "white",
    position: { x: CANVAS_WIDTH / 2, y: 50 },
    align: { x: "center", y: "middle" },
  });
  renderables.push({
    type: "TEXT",
    text: "Try resizing the browser window",
    color: "#8899aa",
    fontSize: 20,
    position: { x: CANVAS_WIDTH / 2, y: 90 },
    align: { x: "center", y: "middle" },
  });

  const buttonWidth = 140;
  const buttonHeight = 44;
  const gap = 20;
  const totalWidth = MODES.length * buttonWidth + (MODES.length - 1) * gap;
  const startX = CANVAS_WIDTH / 2 - totalWidth / 2;
  const buttonY = CANVAS_HEIGHT - 90;

  MODES.forEach((mode, index) => {
    const x = startX + index * (buttonWidth + gap);

    renderables.push({
      type: "RECTANGLE",
      id: `mode-${mode}`,
      isClickable: true,
      color: mode === state.mode ? "#0d6efd" : "#334166",
      position: { x, y: buttonY },
      size: { width: buttonWidth, height: buttonHeight },
    });
    renderables.push({
      type: "TEXT",
      text: mode,
      color: "white",
      position: { x: x + buttonWidth / 2, y: buttonY + buttonHeight / 2 },
      align: { x: "center", y: "middle" },
    });
  });

  return { renderables };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag !== "CLICK") {
    return;
  }

  const clicked = MODES.find((mode) => event.id === `mode-${mode}`);

  if (clicked !== undefined && clicked !== state.mode) {
    start(clicked);
  }
};

// Wraps runEngine() so switching modes is just calling this again with a
// different one — see the file header for why that's how canvas.resize
// has to be changed at runtime.
function start(mode: ResizeMode) {
  Yuuna.runEngine<GameState>({
    initialState: { mode },
    nextState,
    render,

    canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831", resize: mode },
  });
}

start("fit");
