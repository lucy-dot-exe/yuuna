// Groups & layers — a GROUP composing position/scale/modulate/layer down
// to its children, like Godot's parent/child nodes

// Create a type for the state of your game
type GameState = { hovered: boolean; spin: number };

// Create the initial state
const initialState: GameState = { hovered: false, spin: 0 };

const CENTER = { x: 480, y: 270 };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  // Orbits the two moons back and forth — purely cosmetic, just something
  // to show layer/scale/modulate composing down the tree over time
  const wobble = Math.sin(state.spin) * 40;

  return {
    renderables: [
      {
        type: "GROUP",
        position: CENTER,
        // Scaling the group scales every child with it, anchored at the
        // group's own position. GROUP itself is never interactable — it
        // has no shape to hit-test — so `hovered` below is driven by the
        // planet's own isHoverable instead of the group's.
        scale: state.hovered ? { x: 1.2, y: 1.2 } : { x: 1, y: 1 },

        children: [
          // The planet itself — position is relative to the group's, so
          // { x: 0, y: 0 } here means "centered on the group". This is
          // the renderable that's actually hoverable.
          {
            type: "CIRCLE",
            id: "planet",
            isHoverable: true,
            color: "#3a7bd5",
            position: { x: 0, y: 0 },
            radius: 50,
          },

          // A moon in front of the planet — layer is relative to its
          // parent's, so 1 here means "one step in front of the group"
          {
            type: "CIRCLE",
            color: "#cccccc",
            position: { x: 90 + wobble, y: 0 },
            radius: 14,
            layer: 1,
            // Tints the moon red without touching its own `color` — the
            // same "#ff0000" on the planet above would keep only the
            // planet's red channel too, if it had one
            modulate: state.hovered ? "#ff8080" : undefined,
          },

          // A moon behind the planet — layer: -1 draws it before (i.e.
          // underneath) the group, so the planet occludes it here
          {
            type: "CIRCLE",
            color: "#999999",
            position: { x: -70 - wobble, y: 0 },
            radius: 10,
            layer: -1,
          },
        ],
      },

      {
        type: "TEXT",
        text: "hover the planet",
        color: "white",
        position: { x: CENTER.x, y: CENTER.y + 100 },
        align: { x: "center", y: "top" },
      },
    ],
  };
};

// Create a function that handles the game state
// NextStateFunction<State> comes from the engine — its props also include
// `playSound`/`playMusic`/`pauseMusic`, unused here
const nextState: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "HOVER_IN" && event.id === "planet") {
    return { ...state, hovered: true };
  }

  if (event.tag === "HOVER_OUT" && event.id === "planet") {
    return { ...state, hovered: false };
  }

  if (event.tag === "TIME") {
    return { ...state, spin: state.spin + event.delta / 500 };
  }

  return state;
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: 960, height: 540, backgroundColor: "#0d1831" },
});
