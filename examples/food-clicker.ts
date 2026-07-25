// Food Clicker — click the food to eat it and see the next item

// Create a type for the state of your game
type GameState = { frame: number; eaten: number };

// Create the initial state
const initialState: GameState = {
  frame: 0,
  eaten: 0,
};

const FOOD_FRAME_COUNT = 64; // an 8x8 grid of 16x16 food icons

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    renderables: [
      // Renders a text display for how many items have been eaten
      {
        type: "TEXT",
        text: `${state.eaten} eaten`,
        color: "white",

        position: {
          x: 100,
          y: 50,
        },

        align: {
          x: "left",
          y: "middle",
        },
      },

      // Renders the current food sprite, scaled up from its native 16x16
      {
        type: "SPRITE",
        resourceId: "food",
        frame: state.frame,
        scale: 4,

        isClickable: true,
        id: "food",

        position: {
          x: 20,
          y: 30,
        },
      },
    ],
  };
};

// Create a function that handles the game state
// Ask yourself: "given the current game state, if an event happens, what should the next state be?"
type NextStateFunction = (props: {
  state: GameState;
  event: GameEvent;
}) => GameState;

const nextState: NextStateFunction = (props) => {
  // If the event is a "food is clicked" event
  if (props.event.tag === "CLICK" && props.event.id === "food") {
    return {
      // Moves to the next food sprite in the sheet, wrapping around
      frame: (props.state.frame + 1) % FOOD_FRAME_COUNT,
      eaten: props.state.eaten + 1,
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

  // Loads the food spritesheet: a 128x128 image sliced into an 8x8 grid
  // of 16x16 food icons, referenced by resourceId below
  resources: {
    food: {
      src: "./resources/food.png",
      size: { width: 128, height: 128 },
      slices: { horizontal: 8, vertical: 8 },
    },
  },
});
