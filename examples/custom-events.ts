// Custom events — send an HTTP request and handle it once it resolves

// Create a type for the state of your game
type GameState = {
  status: "idle" | "loading" | "done" | "error";
  title: string | null;
};

// Create the initial state
const initialState: GameState = { status: "idle", title: null };

// Your own event payload type — runEngine's second type parameter. Its
// shape is entirely up to you; here it just reports how the fetch below
// turned out.
type FetchResult = { status: "done"; title: string } | { status: "error" };

// runEngine() only resolves with sendEvent() once it's done loading, but
// nextState (which needs to call it) has to exist before that call is
// made — so it's declared here and assigned once the engine's actually
// running, below. By the time nextState is ever called by the engine,
// this has long since been assigned.
let sendEvent: (event: FetchResult) => void = () => {};

const CENTER = { x: 480, y: 270 };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  const label =
    state.status === "idle"
      ? "Click to fetch a random to-do"
      : state.status === "loading"
        ? "Loading..."
        : state.status === "error"
          ? "Request failed — click to retry"
          : state.title!;

  return {
    renderables: [
      // A clickable rectangle standing in for a button — isClickable
      // plus an id is all any renderable needs to receive CLICK events
      {
        type: "RECTANGLE",
        id: "fetch-button",
        isClickable: true,
        color: state.status === "loading" ? "#555" : "#2d5c8f",

        position: { x: CENTER.x - 150, y: CENTER.y - 25 },
        size: { width: 300, height: 50 },
      },
      {
        type: "TEXT",
        text: label,
        color: "white",

        position: { x: CENTER.x, y: CENTER.y },
        align: { x: "center", y: "middle" },
      },
    ],
  };
};

// Create a function that handles the game state
// NextStateFunction<State, Custom> comes from the engine — Custom is the
// FetchResult type above, which makes `event.event` below type-safe
const nextState: NextStateFunction<GameState, FetchResult> = ({ state, event }) => {
  // A CUSTOM event's payload lives at `event.event` — `event` itself is
  // just the { tag: "CUSTOM", event } wrapper, same shape as every other
  // GameEvent variant, just generic over what you put in it
  if (event.tag === "CUSTOM") {
    return event.event.status === "done"
      ? { status: "done", title: event.event.title }
      : { status: "error", title: null };
  }

  if (event.tag === "CLICK" && event.id === "fetch-button" && state.status !== "loading") {
    // The actual async work — fired here as a side effect, same as
    // calling playSound/playMusic from inside nextState. Its result
    // arrives back as a CUSTOM event above, on whatever later tick the
    // fetch happens to resolve on, instead of blocking this one.
    fetch(`https://jsonplaceholder.typicode.com/todos/${1 + Math.floor(Math.random() * 200)}`)
      .then((response) => response.json())
      .then((todo) => sendEvent({ status: "done", title: todo.title }))
      .catch(() => sendEvent({ status: "error" }));

    return { status: "loading", title: null };
  }

  return state;
};

// Runs the engine, then stashes sendEvent so nextState (defined above,
// before it existed) can start using it
Yuuna.runEngine<GameState, FetchResult>({
  initialState,
  nextState,
  render,

  canvas: { width: 960, height: 540, backgroundColor: "#0d1831" },
}).then((engine) => {
  sendEvent = engine.sendEvent;
});
