// Mouse Buttons — the right mouse button gets the same two things the
// left one has: RIGHT_CLICK is CLICK's counterpart (fired on an
// isClickable renderable under the cursor), and rightMouseButton is
// mouseButton's (held/just pressed/just released, every tick). Left
// click a tile to count it up, right click to count it down, and hold
// either button anywhere on the canvas to light up its indicator.
//
// The browser's own right-click menu stays closed over the canvas by
// default — set canvas.disableContextMenu to false to get it back.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const TILE_COUNT = 5;
const TILE_SIZE = 120;
const TILE_GAP = 24;

// Create a type for the state of your game
type GameState = {
  counts: number[];
  isLeftHeld: boolean;
  isRightHeld: boolean;
};

// Create the initial state
const initialState: GameState = {
  counts: Array.from({ length: TILE_COUNT }, () => 0),
  isLeftHeld: false,
  isRightHeld: false,
};

const tileId = (index: number) => `tile-${index}`;

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  const renderables: Renderable[] = [
    Yuuna.text({
      text: "Left click: +1 · Right click: -1",
      color: "white",
      position: { x: CANVAS_WIDTH / 2, y: 70 },
      align: { x: "center", y: "middle" },
    }),
  ];

  const totalWidth = TILE_COUNT * TILE_SIZE + (TILE_COUNT - 1) * TILE_GAP;
  const startX = CANVAS_WIDTH / 2 - totalWidth / 2;
  const tileY = CANVAS_HEIGHT / 2 - TILE_SIZE / 2 - 20;

  state.counts.forEach((count, index) => {
    const x = startX + index * (TILE_SIZE + TILE_GAP);

    renderables.push(
      Yuuna.rectangle({
        id: tileId(index),
        isClickable: true,
        color: count > 0 ? "#2e7d4f" : count < 0 ? "#8a2f2f" : "#334166",
        position: { x, y: tileY },
        size: { width: TILE_SIZE, height: TILE_SIZE },
      })
    );
    renderables.push(
      Yuuna.text({
        text: `${count}`,
        color: "white",
        fontSize: 40,
        position: { x: x + TILE_SIZE / 2, y: tileY + TILE_SIZE / 2 },
        align: { x: "center", y: "middle" },
      })
    );
  });

  // One indicator per button, lit while it's held — driven by
  // mouseButton/rightMouseButton rather than by clicks.
  const indicators = [
    { label: "Left held", isHeld: state.isLeftHeld, x: CANVAS_WIDTH / 2 - 140 },
    { label: "Right held", isHeld: state.isRightHeld, x: CANVAS_WIDTH / 2 + 140 },
  ];

  for (const { label, isHeld, x } of indicators) {
    renderables.push(
      Yuuna.circle({
        color: isHeld ? "#4fc3f7" : "#22335a",
        position: { x: x - 70, y: CANVAS_HEIGHT - 80 },
        radius: 14,
      }),
      Yuuna.text({
        text: label,
        color: isHeld ? "white" : "#8899aa",
        fontSize: 22,
        position: { x: x - 46, y: CANVAS_HEIGHT - 80 },
        align: { x: "left", y: "middle" },
      })
    );
  }

  return { renderables };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event, mouseButton, rightMouseButton }) => {
  const isLeftHeld = mouseButton.isPressed;
  const isRightHeld = rightMouseButton.isPressed;

  if (event.tag === "CLICK" || event.tag === "RIGHT_CLICK") {
    const index = state.counts.findIndex((_, i) => event.id === tileId(i));

    if (index !== -1) {
      const step = event.tag === "CLICK" ? 1 : -1;
      const counts = state.counts.map((count, i) => (i === index ? count + step : count));
      return { counts, isLeftHeld, isRightHeld };
    }
  }

  if (isLeftHeld !== state.isLeftHeld || isRightHeld !== state.isRightHeld) {
    return { ...state, isLeftHeld, isRightHeld };
  }

  return undefined;
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },
});
