// Multi Touch — on a touchscreen, every finger shows up in `touches`:
// each one draws a line from where it touched down to where it is now.
// The left half is a joystick that moves the ball; touchAsMouse keeps
// fingers landing there out of mouse input, so the joystick thumb never
// presses the button. A finger on the right half is the mouse, as usual —
// tap the button while steering with the other thumb.

// Create a type for the state of your game
type GameState = { ball: { x: number; y: number }; taps: number; touches: TouchState[] };

const CANVAS = { width: 960, height: 540 };
const BALL_SPEED = 0.4;
// How far (in pixels) a joystick finger has to drag for full speed
const STICK_RANGE = 60;

// Create the initial state
const initialState: GameState = { ball: { x: 480, y: 270 }, taps: 0, touches: [] };

// The finger steering the ball: the first one that landed on the left half
const joystickTouch = (touches: TouchState[]) => touches.find((t) => t.isPressed && t.startMouse.x < CANVAS.width / 2);

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  const renderables: Renderable[] = [
    Yuuna.rectangle({ color: "#13213f", position: { x: 0, y: 0 }, size: { width: CANVAS.width / 2, height: CANVAS.height } }),
    Yuuna.text({ text: "Joystick", color: "#5a6f99", position: { x: 20, y: 20 } }),
    Yuuna.rectangle({
      id: "button",
      isClickable: true,
      isHoverable: true,
      color: "#2a8f5b",
      position: { x: 640, y: 220 },
      size: { width: 200, height: 100 },
    }),
    Yuuna.text({ text: `Taps: ${state.taps}`, color: "white", position: { x: 740, y: 270 }, align: { x: "center", y: "middle" } }),
    Yuuna.circle({ color: "gold", position: state.ball, radius: 20 }),
  ];

  for (const touch of state.touches) {
    renderables.push(
      Yuuna.line({ from: touch.startMouse, to: touch.mouse, color: "#8899aa", width: 4 }),
      // The mouse finger is drawn white, every other finger blue
      Yuuna.circle({ color: touch.isMouse ? "white" : "deepskyblue", position: touch.mouse, radius: 30, modulate: "#ffffffaa" })
    );
  }

  return { renderables };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event, touches }) => {
  if (event.tag === "CLICK" && event.id === "button") {
    return { ...state, taps: state.taps + 1 };
  }

  if (event.tag === "TIME") {
    // A joystick is just a drag: how far the finger is from where it
    // touched down, capped at STICK_RANGE
    const stick = joystickTouch(touches);
    const dx = stick ? Math.max(-1, Math.min(1, (stick.mouse.x - stick.startMouse.x) / STICK_RANGE)) : 0;
    const dy = stick ? Math.max(-1, Math.min(1, (stick.mouse.y - stick.startMouse.y) / STICK_RANGE)) : 0;

    return {
      ...state,
      touches,
      ball: { x: state.ball.x + dx * BALL_SPEED * event.delta, y: state.ball.y + dy * BALL_SPEED * event.delta },
    };
  }
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,
  canvas: { ...CANVAS, backgroundColor: "#0d1831", resize: "fit" },

  // Fingers landing on the left half are the joystick's, never the mouse
  touchAsMouse: (state, mouse) => mouse.x >= CANVAS.width / 2,
});
