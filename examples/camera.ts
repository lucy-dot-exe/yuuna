// Camera — move with the arrow keys, the camera follows you around a
// world bigger than the canvas. Zoom in/out with E/Q.

// Create a type for the state of your game
type GameState = { player: { x: number; y: number }; zoom: number };

// Create the initial state
const initialState: GameState = { player: { x: 0, y: 0 }, zoom: 1 };

const SPEED = 0.25; // pixels per millisecond
const ZOOM_SPEED = 0.0012; // zoom multiplier change per millisecond
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;
const CANVAS = { width: 960, height: 540 };

// A world-space grid, spanning well past what fits on screen at once —
// only the camera above lets you see all of it, panning underneath you
// as you move
const GRID_RANGE = 2000;
const GRID_STEP = 100;

const gridLines: LineRenderable[] = [];

for (let x = -GRID_RANGE; x <= GRID_RANGE; x += GRID_STEP) {
  gridLines.push(
    Yuuna.line({
      color: "#294066",
      from: { x, y: -GRID_RANGE },
      to: { x, y: GRID_RANGE },
    })
  );
}

for (let y = -GRID_RANGE; y <= GRID_RANGE; y += GRID_STEP) {
  gridLines.push(
    Yuuna.line({
      color: "#294066",
      from: { x: -GRID_RANGE, y },
      to: { x: GRID_RANGE, y },
    })
  );
}

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    renderables: [
      ...gridLines,

      // World-space — the camera below pans/zooms this along with the grid
      Yuuna.circle({
        color: "deepskyblue",
        position: state.player,
        radius: 20,
      }),

      // screenSpace: true opts this out of the camera, so it stays fixed
      // in the corner instead of panning away with the world
      Yuuna.text({
        screenSpace: true,
        text: `world position: (${Math.round(state.player.x)}, ${Math.round(state.player.y)}) — zoom: ${state.zoom.toFixed(2)}x`,
        color: "white",
        position: { x: 10, y: 10 },
      }),
      Yuuna.text({
        screenSpace: true,
        text: "Arrow keys to move, E to zoom in, Q to zoom out",
        color: "#8899aa",
        position: { x: 10, y: CANVAS.height - 24 },
      }),
    ],
  };
};

// Create a function that handles the game state
// NextStateFunction<State> comes from the engine — its props also include
// `playSound`/`playMusic`/`pauseMusic`, unused here
const nextState: NextStateFunction<GameState> = ({ state, event, keyboard }) => {
  if (event.tag !== "TIME") {
    return state;
  }

  const distance = SPEED * event.delta;
  let { x, y } = state.player;

  if (keyboard.ArrowLeft.isPressed) x -= distance;
  if (keyboard.ArrowRight.isPressed) x += distance;
  if (keyboard.ArrowUp.isPressed) y -= distance;
  if (keyboard.ArrowDown.isPressed) y += distance;

  // E zooms in (multiplies zoom up), Q zooms out — a multiplicative
  // change (rather than +/- a flat amount) so it feels like a consistent
  // rate of zoom regardless of how zoomed in/out you already are
  let zoom = state.zoom;
  const zoomFactor = 1 + ZOOM_SPEED * event.delta;

  if (keyboard.KeyE.isPressed) zoom *= zoomFactor;
  if (keyboard.KeyQ.isPressed) zoom /= zoomFactor;

  zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

  return { player: { x, y }, zoom };
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { ...CANVAS, backgroundColor: "#0d1831" },

  // { x, y } is the world position mapped to canvas (0, 0) — centering
  // the player on screen means offsetting by half the canvas size, in
  // world units. That offset itself shrinks as zoom grows (screen =
  // (world - camera.position) * zoom), so it's divided by zoom here to
  // keep the player centered at any zoom level instead of drifting
  // off-center as state.zoom changes away from 1.
  camera: (state) => ({
    x: state.player.x - CANVAS.width / 2 / state.zoom,
    y: state.player.y - CANVAS.height / 2 / state.zoom,
    zoom: state.zoom,
  }),
});
