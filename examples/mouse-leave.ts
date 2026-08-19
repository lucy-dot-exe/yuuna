// Mouse Leave — MOUSE_LEAVE fires once the mouse exits the canvas
// entirely, and (per the engine) always brings a HOVER_OUT along with it
// for whatever was hovered at the time, since the mousemove that would
// normally carry that HOVER_OUT can't happen once the mouse isn't over
// the canvas anymore.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

// Create a type for the state of your game
type GameState = {
  isInside: boolean;
  leaveCount: number;
  lastExit: { x: number; y: number } | null;
};

// Create the initial state
const initialState: GameState = { isInside: true, leaveCount: 0, lastExit: null };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    renderables: [
      // Covers the whole canvas so there's always something hovered to
      // report a HOVER_OUT for — isHoverable is all MOUSE_LEAVE itself
      // needs, though; it fires regardless of what (if anything) is
      // under the cursor when it happens.
      Yuuna.rectangle({
        id: "arena",
        isHoverable: true,
        color: state.isInside ? "rgba(79, 195, 247, 0.08)" : "rgba(224, 90, 75, 0.08)",
        position: { x: 0, y: 0 },
        size: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      }),

      Yuuna.text({
        text: state.isInside ? "Mouse is inside the canvas" : "Mouse left the canvas",
        color: state.isInside ? "#4fc3f7" : "#e05a4b",
        fontSize: 28,
        position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 - 20 },
        align: { x: "center", y: "middle" },
      }),
      Yuuna.text({
        text: `Left ${state.leaveCount} time(s)${
          state.lastExit ? ` — last at (${Math.round(state.lastExit.x)}, ${Math.round(state.lastExit.y)})` : ""
        }`,
        color: "white",
        position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 + 20 },
        align: { x: "center", y: "middle" },
      }),
      Yuuna.text({
        text: "Move the mouse off any edge of the canvas",
        color: "#8899aa",
        position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 30 },
        align: { x: "center", y: "middle" },
      }),
    ],
  };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "HOVER_IN" && event.id === "arena") {
    return { ...state, isInside: true };
  }

  if (event.tag === "MOUSE_LEAVE") {
    return { ...state, isInside: false, leaveCount: state.leaveCount + 1, lastExit: event.mouse };
  }
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },
});
