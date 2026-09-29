// Mouse Wheel — scroll over the canvas to zoom in/out around the mouse,
// using the WHEEL event, and press Backspace to reset the view.

// Create a type for the state of your game
// The camera lives in state directly: WHEEL moves it, and runEngine's
// `camera` prop below just reads it back out
type GameState = { camera: { x: number; y: number; zoom: number } };

const CANVAS = { width: 960, height: 540 };
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
// How much one wheel notch zooms by — multiplicative, so each notch feels
// the same however zoomed in/out you already are
const ZOOM_STEP = 1.15;

// Starts with world (0, 0) at the center of the canvas
const INITIAL_CAMERA = { x: -CANVAS.width / 2, y: -CANVAS.height / 2, zoom: 1 };

// Create the initial state
const initialState: GameState = { camera: INITIAL_CAMERA };

// A world-space grid of dots, with the origin marked, to have something
// to zoom in on
const GRID_RANGE = 1000;
const GRID_STEP = 50;

const dots: CircleRenderable[] = [];

for (let x = -GRID_RANGE; x <= GRID_RANGE; x += GRID_STEP) {
  for (let y = -GRID_RANGE; y <= GRID_RANGE; y += GRID_STEP) {
    dots.push(Yuuna.circle({ color: "#294066", position: { x, y }, radius: 3 }));
  }
}

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    renderables: [
      ...dots,
      Yuuna.circle({ color: "deepskyblue", position: { x: 0, y: 0 }, radius: 12 }),

      // screenSpace: true keeps these fixed in place instead of zooming
      Yuuna.text({
        screenSpace: true,
        text: `zoom: ${state.camera.zoom.toFixed(2)}x`,
        color: "white",
        position: { x: 10, y: 10 },
      }),
      Yuuna.text({
        screenSpace: true,
        text: "Scroll to zoom around the mouse, Backspace to reset",
        color: "#8899aa",
        position: { x: 10, y: CANVAS.height - 24 },
      }),
    ],
  };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event, keyboard }) => {
  if (event.tag === "WHEEL") {
    // Only the sign of deltaY is used — how far one notch scrolls varies
    // by browser/device, but up is always negative and down positive
    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.camera.zoom * factor));

    // Zooming around the mouse means the world point under it
    // (worldMouse) stays under it: screen = (world - camera) * zoom, so
    // the camera has to be world - screen / zoom at the new zoom
    return {
      camera: {
        x: event.worldMouse.x - event.mouse.x / zoom,
        y: event.worldMouse.y - event.mouse.y / zoom,
        zoom,
      },
    };
  }

  if (event.tag === "TIME" && keyboard.Backspace.isJustPressed) {
    return { camera: INITIAL_CAMERA };
  }
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  // disableWheelScroll is on by default, so scrolling over the canvas
  // zooms without also scrolling the page
  canvas: { ...CANVAS, backgroundColor: "#0d1831" },

  camera: (state) => state.camera,
});
