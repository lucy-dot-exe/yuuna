// Animated Sprites — loading a spritesheet with a named animation and
// rendering it as an ANIMATED_SPRITE, which advances through the
// animation's frames on its own instead of needing one picked by hand
// (see examples/sprites.ts for that, plainer, SPRITE case). Click to
// pause/resume it, to see what the `paused` prop controls.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

// skeleton.png — same resource examples/tower-defense uses for its
// enemies: a 48x16 sheet, three 16x16 frames of a walk cycle in a row
const FRAME_SIZE = 16;
const FRAME_COUNT = 3;
const FRAME_DURATION = 150; // milliseconds each frame is shown
const SPRITE_SCALE = 8;

// Create a type for the state of your game
type GameState = { paused: boolean };

// Create the initial state
const initialState: GameState = { paused: false };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  const displaySize = FRAME_SIZE * SPRITE_SCALE;
  const center = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 - 20 };

  return {
    renderables: [
      {
        type: "ANIMATED_SPRITE",
        resourceId: "skeleton",
        animation: "walk",
        paused: state.paused,
        scale: { x: SPRITE_SCALE, y: SPRITE_SCALE },

        isClickable: true,
        id: "skeleton",

        // Like SPRITE, position anchors the top-left corner — offset
        // back by half the scaled-up size to center it on `center`
        position: { x: center.x - displaySize / 2, y: center.y - displaySize / 2 },
      },

      {
        type: "TEXT",
        text: state.paused ? "Paused" : "Playing",
        color: "white",
        position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 + 90 },
        align: { x: "center", y: "middle" },
      },
      {
        type: "TEXT",
        text: "Click the sprite to pause/resume the animation",
        color: "#8899aa",
        position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 30 },
        align: { x: "center", y: "middle" },
      },
    ],
  };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "CLICK" && event.id === "skeleton") {
    return { paused: !state.paused };
  }
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },

  // `animations` names one or more sequences over the sheet's frame
  // indices — "walk" here just plays every frame in order, looping — for
  // ANIMATED_SPRITE renderables to reference by name (see `animation:
  // "walk"` above)
  resources: {
    skeleton: {
      src: "./resources/skeleton.png",
      size: { width: FRAME_SIZE * FRAME_COUNT, height: FRAME_SIZE },
      slices: { horizontal: FRAME_COUNT, vertical: 1 },
      animations: {
        walk: {
          frames: Array.from({ length: FRAME_COUNT }, (_, frame) => frame),
          frameDuration: FRAME_DURATION,
          loop: true,
        },
      },
    },
  },
});
