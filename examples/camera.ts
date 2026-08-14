// Camera — move with the arrow keys, the camera follows you around a
// world bigger than the canvas

// Create a type for the state of your game
type GameState = { player: { x: number; y: number } };

// Create the initial state
const initialState: GameState = { player: { x: 0, y: 0 } };

const SPEED = 0.25; // pixels per millisecond
const CANVAS = { width: 960, height: 540 };

// A world-space grid, spanning well past what fits on screen at once —
// only the camera above lets you see all of it, panning underneath you
// as you move
const GRID_RANGE = 2000;
const GRID_STEP = 100;

const gridLines: LineRenderable[] = [];

for (let x = -GRID_RANGE; x <= GRID_RANGE; x += GRID_STEP) {
  gridLines.push({
    type: "LINE",
    color: "#294066",
    from: { x, y: -GRID_RANGE },
    to: { x, y: GRID_RANGE },
  });
}

for (let y = -GRID_RANGE; y <= GRID_RANGE; y += GRID_STEP) {
  gridLines.push({
    type: "LINE",
    color: "#294066",
    from: { x: -GRID_RANGE, y },
    to: { x: GRID_RANGE, y },
  });
}

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    renderables: [
      ...gridLines,

      // World-space — the camera below pans/zooms this along with the grid
      {
        type: "CIRCLE",
        color: "deepskyblue",
        position: state.player,
        radius: 20,
      },

      // screenSpace: true opts this out of the camera, so it stays fixed
      // in the corner instead of panning away with the world
      {
        type: "TEXT",
        screenSpace: true,
        text: `world position: (${Math.round(state.player.x)}, ${Math.round(state.player.y)})`,
        color: "white",
        position: { x: 10, y: 10 },
      },
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

  return { player: { x, y } };
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { ...CANVAS, backgroundColor: "#0d1831" },

  // { x, y } is the world position mapped to canvas (0, 0) — centering the
  // player on screen means offsetting by half the canvas size. zoom: 1
  // here, but it's a function of state too, so it could react to
  // something like a zoom level the player controls.
  camera: (state) => ({
    x: state.player.x - CANVAS.width / 2,
    y: state.player.y - CANVAS.height / 2,
    zoom: 1,
  }),
});
