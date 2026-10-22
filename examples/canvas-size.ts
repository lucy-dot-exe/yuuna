// Canvas Size — canvasSize sets the canvas's resolution from state, every
// tick: here it's wide while the window is wider than it is tall, and tall
// otherwise (try narrowing the window, or turning a phone upright). The
// WINDOW_RESIZE event, which also fires once at the start, is how the
// state learns the window's shape. The same grid of squares lays itself
// out in rows that fit whichever shape the canvas is.

// Create a type for the state of your game
type GameState = { tall: boolean };

const WIDE = { width: 960, height: 540 };
const TALL = { width: 540, height: 960 };
const SQUARE = 100;
const GAP = 20;
const COLORS = ["tomato", "gold", "mediumseagreen", "deepskyblue", "orchid", "orange", "turquoise", "hotpink"];

// Create the initial state
const initialState: GameState = { tall: false };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  const size = state.tall ? TALL : WIDE;
  const perRow = Math.floor((size.width - GAP) / (SQUARE + GAP));

  const renderables: Renderable[] = [
    Yuuna.text({ text: state.tall ? "Tall" : "Wide", color: "white", position: { x: GAP, y: GAP } }),
  ];

  COLORS.forEach((color, i) => {
    renderables.push(
      Yuuna.rectangle({
        color,
        position: { x: GAP + (i % perRow) * (SQUARE + GAP), y: 80 + Math.floor(i / perRow) * (SQUARE + GAP) },
        size: { width: SQUARE, height: SQUARE },
      })
    );
  });

  return { renderables };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "WINDOW_RESIZE") {
    return { tall: event.height > event.width };
  }
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  // canvasSize takes the place of canvas.width/height; "fit" refits the
  // new shape to the window right away
  canvasSize: (state) => (state.tall ? TALL : WIDE),
  canvas: { backgroundColor: "#0d1831", resize: "fit" },
});
