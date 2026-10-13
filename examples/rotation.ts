// Rotation — turning renderables around their anchor, and composing
// rotation down a GROUP to its children

const CENTER = { x: 480, y: 270 };
const SPRITE_SCALE = 6;

// Create a type for the state of your game
type GameState = { angle: number; hovered: boolean };

// Create the initial state
const initialState: GameState = { angle: 0, hovered: false };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => ({
  renderables: [
    // rotation turns a renderable around its anchor — for a RECTANGLE
    // that's its position, the top-left corner — in radians, clockwise.
    // Hit-testing follows the rotated shape: hover the bar to tint it.
    Yuuna.rectangle({
      id: "bar",
      isHoverable: true,
      position: { x: 200, y: 270 },
      size: { width: 160, height: 24 },
      color: state.hovered ? "#ffd166" : "#3a7bd5",
      rotation: state.angle,
    }),

    // To spin a sprite around its center, rotate a GROUP placed at that
    // center and offset the sprite by minus half its (scaled) size
    Yuuna.group({
      position: CENTER,
      rotation: state.angle,
      children: [
        Yuuna.sprite({
          resourceId: "food",
          frame: 12,
          scale: { x: SPRITE_SCALE, y: SPRITE_SCALE },
          position: { x: (-16 * SPRITE_SCALE) / 2, y: (-16 * SPRITE_SCALE) / 2 },
        }),

        // A child's position turns with its parent's rotation, so this
        // moon orbits the sprite — and its own rotation adds to the
        // parent's, so it spins twice as fast as it orbits
        Yuuna.group({
          position: { x: 120, y: 0 },
          rotation: state.angle,
          children: [
            Yuuna.rectangle({
              position: { x: -12, y: -12 },
              size: { width: 24, height: 24 },
              color: "#cccccc",
            }),
          ],
        }),
      ],
    }),

    Yuuna.text({
      text: "hover the blue bar",
      color: "white",
      position: { x: CENTER.x, y: CENTER.y + 180 },
      align: { x: "center", y: "top" },
    }),
  ],
});

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "HOVER_IN" && event.id === "bar") {
    return { ...state, hovered: true };
  }

  if (event.tag === "HOVER_OUT" && event.id === "bar") {
    return { ...state, hovered: false };
  }

  if (event.tag === "TIME") {
    return { ...state, angle: state.angle + event.delta / 1000 };
  }

  return state;
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  // food.png is a 128x128 sheet of 16x16 icons (see the Sprites example)
  resources: {
    food: {
      src: "./resources/pixel-food/food.png",
      size: { width: 128, height: 128 },
      slices: { horizontal: 8, vertical: 8 },
    },
  },

  canvas: { width: 960, height: 540, backgroundColor: "#0d1831" },
});
