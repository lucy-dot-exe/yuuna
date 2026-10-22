// Virtual Pointer — a cursor moved by the arrow keys, pressed with Space,
// that works exactly like the mouse: hold Space and steer to paint the
// grid (the same mouseButton + HOVER_IN code a real mouse paints with),
// or tap Space over the button to click it. The mouse still works too.
// On a phone the same idea drives a cursor from a virtual joystick.

// Create a type for the state of your game
type GameState = { cursor: { x: number; y: number }; isPressed: boolean; painted: string[]; clicks: number };

const CANVAS = { width: 960, height: 540 };
const CURSOR_SPEED = 0.35;
const CELL = 40;
const GRID = { x: 80, y: 90, cols: 12, rows: 9 };

// Create the initial state
const initialState: GameState = { cursor: { x: 480, y: 270 }, isPressed: false, painted: [], clicks: 0 };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  const renderables: Renderable[] = [];

  for (let col = 0; col < GRID.cols; col++) {
    for (let row = 0; row < GRID.rows; row++) {
      const id = `cell:${col}:${row}`;
      renderables.push(
        Yuuna.rectangle({
          id,
          isHoverable: true,
          color: state.painted.includes(id) ? "hotpink" : "#1c2b4d",
          position: { x: GRID.x + col * CELL, y: GRID.y + row * CELL },
          size: { width: CELL - 2, height: CELL - 2 },
        })
      );
    }
  }

  renderables.push(
    Yuuna.rectangle({ id: "button", isClickable: true, color: "#2a8f5b", position: { x: 640, y: 220 }, size: { width: 240, height: 100 } }),
    Yuuna.text({ text: `Clicks: ${state.clicks}`, color: "white", position: { x: 760, y: 270 }, align: { x: "center", y: "middle" } }),
    Yuuna.text({ text: "Arrows move the cursor, Space presses it", color: "#8899aa", position: { x: 20, y: 20 } }),

    // The engine doesn't draw the pointer — this is the game's own cursor
    Yuuna.circle({ color: state.isPressed ? "gold" : "white", position: state.cursor, radius: 8 })
  );

  return { renderables };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event, keyboard, mouseButton }) => {
  if (event.tag === "CLICK" && event.id === "button") {
    return { ...state, clicks: state.clicks + 1 };
  }

  // Paints while the button is held — the same code works for the mouse
  // and the virtual pointer, which is the point
  if (event.tag === "HOVER_IN" && event.id?.startsWith("cell:") && mouseButton.isPressed && !state.painted.includes(event.id)) {
    return { ...state, painted: [...state.painted, event.id] };
  }

  if (event.tag === "TIME") {
    const dx = (keyboard.ArrowRight.isPressed ? 1 : 0) - (keyboard.ArrowLeft.isPressed ? 1 : 0);
    const dy = (keyboard.ArrowDown.isPressed ? 1 : 0) - (keyboard.ArrowUp.isPressed ? 1 : 0);
    const step = CURSOR_SPEED * event.delta;

    return {
      ...state,
      cursor: {
        x: Math.max(0, Math.min(CANVAS.width, state.cursor.x + dx * step)),
        y: Math.max(0, Math.min(CANVAS.height, state.cursor.y + dy * step)),
      },
      isPressed: keyboard.Space.isPressed,
    };
  }
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,
  canvas: { ...CANVAS, backgroundColor: "#0d1831" },

  // Read every tick: moving it hovers, isPressed holds mouseButton down,
  // and letting go clicks whatever it's over
  virtualPointer: (state) => ({ x: state.cursor.x, y: state.cursor.y, isPressed: state.isPressed }),
});
