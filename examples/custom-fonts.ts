// Custom Fonts — load a font file through runEngine's `fonts` prop and use
// it from a TEXT renderable's `fontFamily`, next to a generic family and
// the default (Arial). Click any line to cycle its color: text's
// clickable area is measured with the same font it's drawn in.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const COLORS = ["white", "#ffcc66", "#66ddff", "#ff7799"];

// Create a type for the state of your game
type GameState = { colorIndexById: Record<string, number> };

// Create the initial state
const initialState: GameState = { colorIndexById: {} };

const CENTER = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

// Each line: a fontFamily (undefined = the default, Arial) and a caption
const LINES = [
  { id: "custom", fontFamily: "Press Start 2P", text: "Press Start 2P", caption: "loaded via `fonts`" },
  { id: "generic", fontFamily: "monospace", text: "monospace", caption: "a generic family" },
  { id: "default", fontFamily: undefined, text: "Arial", caption: "the default" },
];

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    cursor: "pointer",
    renderables: [
      ...LINES.flatMap((line, index) => {
        const y = CENTER.y - 110 + index * 100;

        return [
          Yuuna.text({
            text: line.text,
            color: COLORS[state.colorIndexById[line.id] ?? 0],
            fontSize: 32,
            fontFamily: line.fontFamily,

            isClickable: true,
            id: line.id,

            position: { x: CENTER.x, y },
            align: { x: "center", y: "middle" },
          }),
          Yuuna.text({
            text: line.caption,
            color: "#8899aa",
            fontSize: 16,
            position: { x: CENTER.x, y: y + 34 },
            align: { x: "center", y: "middle" },
          }),
        ];
      }),

      Yuuna.text({
        text: "Click a line to change its color",
        color: "#8899aa",
        fontSize: 12,
        fontFamily: "Press Start 2P",
        position: { x: CENTER.x, y: CANVAS_HEIGHT - 30 },
        align: { x: "center", y: "middle" },
      }),
    ],
  };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "CLICK" && event.id !== undefined) {
    const colorIndex = ((state.colorIndexById[event.id] ?? 0) + 1) % COLORS.length;

    return { ...state, colorIndexById: { ...state.colorIndexById, [event.id]: colorIndex } };
  }
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },

  // The key is the family name fontFamily refers to — it doesn't have to
  // match the name inside the font file
  fonts: {
    "Press Start 2P": { src: "./resources/press-start-2p/PressStart2P-Regular.ttf" },
  },
});
