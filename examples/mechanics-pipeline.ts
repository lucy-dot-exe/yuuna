// Mechanics — nextState as an array of small, independent functions
// instead of one big one, with STOP as a shared early-exit

// Create a type for the state of your game
type GameState = { hits: number; livesLeft: number; isOver: boolean };

// Create the initial state
const initialState: GameState = { hits: 0, livesLeft: 3, isOver: false };

const CENTER = { x: 480, y: 270 };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    renderables: [
      // A click only becomes a CLICK event if it lands on some clickable
      // renderable — clicking empty canvas produces nothing at all. This
      // full-canvas rectangle is what "a miss" actually hits; it's listed
      // before the target below so the target (same layer) draws on top
      // and wins the hit-test wherever the two overlap.
      {
        type: "RECTANGLE",
        id: "background",
        isClickable: true,
        color: "#0d1831",
        position: { x: 0, y: 0 },
        size: { width: 960, height: 540 },
      },
      {
        type: "CIRCLE",
        id: "target",
        isClickable: true,
        color: state.isOver ? "#555" : "crimson",
        position: CENTER,
        radius: 40,
      },
      {
        type: "TEXT",
        text: state.isOver
          ? `Game over — ${state.hits} hits`
          : `${state.hits} hits · ${state.livesLeft} lives left`,
        color: "white",
        position: { x: CENTER.x, y: CENTER.y - 80 },
        align: { x: "center", y: "bottom" },
      },
      {
        type: "TEXT",
        text: state.isOver ? "" : "Click the target — missing costs a life",
        color: "#aaaaaa",
        position: { x: CENTER.x, y: CENTER.y + 80 },
        align: { x: "center", y: "top" },
      },
    ],
  };
};

// Runs first in the pipeline (see nextState below) — once the game is
// over, returning STOP here skips every mechanic listed after it, so
// none of them need their own "if (state.isOver) return state;" guard
const freezeOnGameOver: NextStateFunction<GameState> = ({ state }) => {
  if (state.isOver) {
    return STOP;
  }
};

// A hit on the target
const countHits: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "CLICK" && event.id === "target") {
    return { ...state, hits: state.hits + 1 };
  }
};

// A miss — a click that landed on the background instead of the target
const countMisses: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "CLICK" && event.id === "background") {
    const livesLeft = state.livesLeft - 1;
    return { ...state, livesLeft, isOver: livesLeft <= 0 };
  }
};

// Create a function that handles the game state
// nextState doesn't have to be one function — it can be a list like this
// one instead, run in order for every event. Each returns a new state, an
// early STOP, or undefined to make no change and let the rest keep going.
const nextState: (NextStateFunction<GameState> | NextStateFunction<GameState>[]) = [
  freezeOnGameOver,
  countHits,
  countMisses,
];

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: 960, height: 540, backgroundColor: "#0d1831" },
});
