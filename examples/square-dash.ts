// Square Dash — move the square with the arrow keys

// Create a type for the state of your game
type GameState = { position: { x: number; y: number } };

// Create the initial state
const initialState: GameState = {
  position: { x: 460, y: 380 },
};

const SPEED = 0.3; // pixels per millisecond
const SIZE = 40;

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    renderables: [
      {
        type: "RECTANGLE",
        color: "deepskyblue",

        position: state.position,
        size: { width: SIZE, height: SIZE },
      },
    ],
  };
};

// Create a function that handles the game state
// Ask yourself: "given the current game state, if an event happens, what should the next state be?"
// NextStateFunction<State> comes from the engine — its props also include
// `playSound`/`playMusic`/`pauseMusic`, unused here
const nextState: NextStateFunction<GameState> = ({ state, event, keyboard }) => {
  // Only move on frame ticks, using the elapsed time so speed stays the
  // same regardless of frame rate
  if (event.tag !== "TIME") {
    return state;
  }

  const distance = SPEED * event.delta;

  let { x, y } = state.position;

  if (keyboard.ArrowLeft.isPressed) x -= distance;
  if (keyboard.ArrowRight.isPressed) x += distance;
  if (keyboard.ArrowUp.isPressed) y -= distance;
  if (keyboard.ArrowDown.isPressed) y += distance;

  // Keep the square inside the canvas
  x = Math.max(0, Math.min(960 - SIZE, x));
  y = Math.max(0, Math.min(800 - SIZE, y));

  return { position: { x, y } };
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,
});
