// Max FPS — maxFps caps how many ticks per second the engine runs, and
// like camera/timeScale it's a function of state, so it can change live
// from a settings menu rather than only being set once at boot. Click a
// cap below and watch the measured FPS follow it: the ball gets choppier
// at low caps, but it keeps moving at the same speed across the screen,
// because each TIME event's `delta` still covers all the real time since
// the last tick that ran.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const BALL_RADIUS = 24;
// Pixels per millisecond, so the ball's speed doesn't depend on the cap.
const BALL_SPEED = 0.4;

// undefined means uncapped, the same as leaving maxFps out entirely.
const CAPS: (number | undefined)[] = [10, 30, 60, undefined];

const capId = (cap: number | undefined) => `cap-${cap ?? "none"}`;
const capLabel = (cap: number | undefined) => (cap === undefined ? "Uncapped" : `${cap} FPS`);

// Create a type for the state of your game
type GameState = {
  maxFps: number | undefined;
  ballX: number;
  direction: 1 | -1;
  // Ticks counted since the FPS readout last updated, and how long ago
  // that was — turned into `measuredFps` about twice a second.
  ticks: number;
  sampleMs: number;
  measuredFps: number;
};

// Create the initial state
const initialState: GameState = {
  maxFps: 30,
  ballX: BALL_RADIUS,
  direction: 1,
  ticks: 0,
  sampleMs: 0,
  measuredFps: 0,
};

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  const renderables: Renderable[] = [
    Yuuna.text({
      text: `Measured: ${Math.round(state.measuredFps)} FPS`,
      color: "white",
      position: { x: CANVAS_WIDTH / 2, y: 60 },
      align: { x: "center", y: "middle" },
    }),
    Yuuna.text({
      text: `maxFps: ${capLabel(state.maxFps)}`,
      color: "#8899aa",
      fontSize: 20,
      position: { x: CANVAS_WIDTH / 2, y: 100 },
      align: { x: "center", y: "middle" },
    }),
    Yuuna.circle({
      color: "#4fc3f7",
      position: { x: state.ballX, y: CANVAS_HEIGHT / 2 },
      radius: BALL_RADIUS,
    }),
  ];

  const buttonWidth = 160;
  const buttonHeight = 44;
  const gap = 20;
  const totalWidth = CAPS.length * buttonWidth + (CAPS.length - 1) * gap;
  const startX = CANVAS_WIDTH / 2 - totalWidth / 2;
  const buttonY = CANVAS_HEIGHT - 90;

  CAPS.forEach((cap, index) => {
    const x = startX + index * (buttonWidth + gap);

    renderables.push(
      Yuuna.rectangle({
        id: capId(cap),
        isClickable: true,
        color: cap === state.maxFps ? "#0d6efd" : "#334166",
        position: { x, y: buttonY },
        size: { width: buttonWidth, height: buttonHeight },
      })
    );
    renderables.push(
      Yuuna.text({
        text: capLabel(cap),
        color: "white",
        fontSize: 22,
        position: { x: x + buttonWidth / 2, y: buttonY + buttonHeight / 2 },
        align: { x: "center", y: "middle" },
      })
    );
  });

  return { renderables };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "CLICK") {
    // findIndex rather than find, since undefined is itself a valid cap.
    const clickedIndex = CAPS.findIndex((cap) => event.id === capId(cap));
    return clickedIndex === -1 ? undefined : { ...state, maxFps: CAPS[clickedIndex] };
  }

  if (event.tag !== "TIME") {
    return undefined;
  }

  // Bounces between the walls, moving by delta so the speed stays the
  // same whatever the cap is.
  let ballX = state.ballX + BALL_SPEED * event.delta * state.direction;
  let direction = state.direction;
  if (ballX > CANVAS_WIDTH - BALL_RADIUS) {
    ballX = CANVAS_WIDTH - BALL_RADIUS;
    direction = -1;
  } else if (ballX < BALL_RADIUS) {
    ballX = BALL_RADIUS;
    direction = 1;
  }

  const ticks = state.ticks + 1;
  const sampleMs = state.sampleMs + event.delta;
  if (sampleMs >= 500) {
    return { ...state, ballX, direction, ticks: 0, sampleMs: 0, measuredFps: (ticks * 1000) / sampleMs };
  }

  return { ...state, ballX, direction, ticks, sampleMs };
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },

  // Read fresh every tick, so clicking a button above takes effect
  // immediately.
  maxFps: (state) => state.maxFps ?? Infinity,
});
