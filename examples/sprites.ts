// Sprites — loading a spritesheet and rendering a single frame from it as
// a static SPRITE. Click the sprite to step through the sheet, one frame
// at a time, to see how `frame` picks which slice gets drawn.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

// food.png is a 128x128 sheet sliced into an 8x8 grid of 16x16 icons —
// same resource examples/food-clicker uses, just rendered as one static
// SPRITE here instead of many clickable, spawning ones.
const SHEET_COLUMNS = 8;
const SHEET_ROWS = 8;
const FRAME_COUNT = SHEET_COLUMNS * SHEET_ROWS;
const SPRITE_SCALE = 6;

// Create a type for the state of your game
type GameState = { frame: number };

// Create the initial state
const initialState: GameState = { frame: 0 };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  const center = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 - 20 };

  return {
    renderables: [
      // A single frame from the sheet, picked by index — resourceId
      // points at the loaded spritesheet (see resources below), frame is
      // its position in slices/vertical * horizontal + column order
      Yuuna.sprite({
        resourceId: "food",
        frame: state.frame,
        scale: { x: SPRITE_SCALE, y: SPRITE_SCALE },

        isClickable: true,
        id: "sprite",

        // SPRITE's position is its top-left corner, not its center — so
        // it's offset back by half its scaled-up size to actually center
        // it on `center` above
        position: {
          x: center.x - (8 * SPRITE_SCALE) / 2,
          y: center.y - (8 * SPRITE_SCALE) / 2,
        },
      }),

      Yuuna.text({
        text: `Frame ${state.frame} / ${FRAME_COUNT - 1}`,
        color: "white",
        position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 + 90 },
        align: { x: "center", y: "middle" },
      }),
      Yuuna.text({
        text: "Click the sprite to step through the sheet",
        color: "#8899aa",
        position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 30 },
        align: { x: "center", y: "middle" },
      }),
    ],
  };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "CLICK" && event.id === "sprite") {
    return { frame: (state.frame + 1) % FRAME_COUNT };
  }
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },

  // Loads the spritesheet once, up front — size is the whole sheet's
  // pixel dimensions, slices is how many columns/rows it's cut into.
  // Individual SPRITE renderables above then just reference it by
  // resourceId and pick a frame index into that grid.
  resources: {
    food: {
      src: "./resources/pixel-food/food.png",
      size: { width: 128, height: 128 },
      slices: { horizontal: SHEET_COLUMNS, vertical: SHEET_ROWS },
    },
  },
});
