import { GameEvent, Luna, Renderable } from "./engine/types";

// Cookie clicker

// Create a type for the state of your game
type GameState = { cookies: number };

// Create the initial state
const initialState: GameState = {
  cookies: 0,
};

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    renderables: [
      // Renders a text display for the number of cookies
      {
        type: "TEXT",
        text: `${state.cookies} cookies`,
        color: "black",

        position: {
          x: 100,
          y: 50,
        },

        align: {
          x: "left",
          y: "middle",
        },
      },

      // Renders a cookie: a clickable brown circle
      {
        type: "CIRCLE",
        color: "brown",

        isClickable: true,
        id: "cookie",

        position: {
          x: 50,
          y: 50,
        },
        radius: 25,
      },
    ],
  };
};

// Create a function that handles the game state
// Ask youself: "given the current game state, if an event happens, what should the next state be?"
type NextStateFunction = (props: {
  state: GameState;
  event: GameEvent;
}) => GameState;

const nextState: NextStateFunction = (props) => {
  // If the event is a "cookie is clicked" event
  if (props.event.tag === "CLICK" && props.event.id === "cookie") {
    return {
      // Sums 1 in the cookies counter
      cookies: props.state.cookies + 1,
    };
  }

  // Else, state remains unchanged
  return props.state;
};

// Runs the engine
Luna.runEngine<GameState>({
  initialState,
  nextState,
  render,
});
