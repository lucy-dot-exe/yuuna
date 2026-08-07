// Cookie clicker

// Create a type for the state of your game
type GameState = { cookies: number };

// Create the initial state
const initialState: GameState = {
  cookies: 0,
};

// Center the cookie + label as a group in the middle of the canvas
const CENTER = { x: 480, y: 270 };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    renderables: [
      // Renders a cookie: a clickable chocolate-brown circle
      {
        type: "CIRCLE",
        color: "#6B4423",

        isClickable: true,
        id: "cookie",

        position: {
          x: CENTER.x - 50,
          y: CENTER.y,
        },
        radius: 30,
      },

      // Renders a text display for the number of cookies, vertically
      // centered against the cookie
      {
        type: "TEXT",
        text: `${state.cookies} cookies`,
        color: "white",

        position: {
          x: CENTER.x,
          y: CENTER.y,
        },

        align: {
          x: "left",
          y: "middle",
        },
      },
    ],
  };
};

// Create a function that handles the game state
// Ask youself: "given the current game state, if an event happens, what should the next state be?"
// NextStateFunction<State> comes from the engine — its props also include
// `keyboard` and `playSound`/`playMusic`/`pauseMusic`, unused here
const nextState: NextStateFunction<GameState> = (props) => {
  // If the event is a "cookie is clicked" event
  if (props.event.tag === "CLICK" && props.event.id === "cookie") {
    // Plays the "collect" sound effect
    props.playSound("collect");

    return {
      // Sums 1 in the cookies counter
      cookies: props.state.cookies + 1,
    };
  }

  // Else, state remains unchanged
  return props.state;
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: 960, height: 540, backgroundColor: "#0d1831" },

  // Loads the cookie collect sound effect, referenced by id ("collect")
  // via playSound() in nextState above
  sounds: {
    collect: { src: "./resources/collect.wav" },
  },
});
