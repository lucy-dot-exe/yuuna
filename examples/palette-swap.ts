// Palette Swap — one spritesheet, recolored into several variants with
// swapColors instead of needing a separate art asset per color. Each
// skeleton below shares the exact same skeleton.png; only the `to`
// colors in its swapColors differ. Click one to pause/resume just that
// one, to see the swap has nothing to do with the animation itself —
// it's just which colors get drawn for a given frame.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

// skeleton.png — same resource examples/animated-sprites.ts uses: a
// 48x16 sheet, three 16x16 frames of a walk cycle in a row
const FRAME_SIZE = 16;
const FRAME_COUNT = 3;
const FRAME_DURATION = 150; // milliseconds each frame is shown
const SPRITE_SCALE = 6;

// The sheet only actually uses two near-white shades — a main body/head
// tone and a slightly darker one used for shading — found by sampling
// the loaded image's pixels. swapColors matches exactly, so both need
// their own `from`/`to` pair; leaving one out would recolor the body
// but leave its shading a stray, unswapped off-white.
const BODY_WHITE = "rgb(250,250,250)";
const SHADE_WHITE = "rgb(235,235,240)";

// Each variant is just a pair of `to` colors for the same two `from`
// shades above — the whole "one sheet, many variants" idea in one
// array. An empty swapColors (the original) proves the point too: it's
// the same sheet, just with nothing replaced.
const PALETTES: { label: string; swapColors: { from: string; to: string }[] }[] = [
  { label: "Original", swapColors: [] },
  {
    label: "Red Team",
    swapColors: [
      { from: BODY_WHITE, to: "#e05a4b" },
      { from: SHADE_WHITE, to: "#a83d32" },
    ],
  },
  {
    label: "Blue Team",
    swapColors: [
      { from: BODY_WHITE, to: "#4fc3f7" },
      { from: SHADE_WHITE, to: "#2f8fc0" },
    ],
  },
  {
    label: "Green Team",
    swapColors: [
      { from: BODY_WHITE, to: "#75c298" },
      { from: SHADE_WHITE, to: "#4a9268" },
    ],
  },
];

// Create a type for the state of your game
type GameState = { paused: boolean[] };

// Create the initial state — one paused flag per palette, all playing
const initialState: GameState = { paused: PALETTES.map(() => false) };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  const displaySize = FRAME_SIZE * SPRITE_SCALE;
  const columnWidth = CANVAS_WIDTH / PALETTES.length;

  return {
    renderables: [
      ...PALETTES.flatMap((palette, index): Renderable[] => {
        const center = { x: columnWidth * (index + 0.5), y: CANVAS_HEIGHT / 2 - 20 };

        return [
          Yuuna.animatedSprite({
            resourceId: "skeleton",
            animation: "walk",
            paused: state.paused[index],
            scale: { x: SPRITE_SCALE, y: SPRITE_SCALE },
            swapColors: palette.swapColors,

            isClickable: true,
            id: `skeleton-${index}`,

            position: { x: center.x - displaySize / 2, y: center.y - displaySize / 2 },
          }),
          Yuuna.text({
            text: palette.label,
            color: "white",
            position: { x: center.x, y: center.y + 90 },
            align: { x: "center", y: "middle" },
          }),
        ];
      }),

      Yuuna.text({
        text: "Click a skeleton to pause/resume just that one",
        color: "#8899aa",
        position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 30 },
        align: { x: "center", y: "middle" },
      }),
    ],
  };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "CLICK" && event.id?.startsWith("skeleton-")) {
    const index = Number(event.id.slice("skeleton-".length));

    return {
      paused: state.paused.map((paused, i) => (i === index ? !paused : paused)),
    };
  }
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },

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
