// Food Clicker — food icons spawn at random spots and fade out after a
// few seconds; click one before it disappears to score a point

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const CENTER = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

const FOOD_NATIVE_SIZE = 16; // one food icon, before scale
const FOOD_FRAME_COUNT = 64; // an 8x8 grid of 16x16 food icons
const FOOD_SCALE = 4;
const FOOD_DISPLAY_SIZE = FOOD_NATIVE_SIZE * FOOD_SCALE;

const FOOD_LIFETIME = 3000; // milliseconds a food stays before disappearing
const SPAWN_INTERVAL = 600; // milliseconds between spawns

// Keeps spawns off the canvas edges
const SPAWN_MARGIN = 20;

const POPUP_DURATION = 600; // milliseconds the "+1" stays on screen
const POPUP_RISE = 40; // pixels the "+1" drifts upward over its lifetime

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

// Create a type for the state of your game
type Food = { id: number; x: number; y: number; frame: number; age: number };
// A "+1" that appears where a food was clicked, drifts up, and fades out
type Popup = { id: number; x: number; y: number; age: number };
type GameState = {
  foods: Food[];
  nextFoodId: number;
  spawnTimer: number;
  popups: Popup[];
  nextPopupId: number;
  eaten: number;
  // isMusicStarted only tracks the one-time auto-start below; isMusicPlaying
  // is the current on/off state the icon toggles and its glyph reflects
  isMusicStarted: boolean;
  isMusicPlaying: boolean;
};

// Create the initial state
const initialState: GameState = {
  foods: [],
  nextFoodId: 0,
  spawnTimer: 0, // spawns the first food right away instead of after a wait
  popups: [],
  nextPopupId: 0,
  eaten: 0,
  isMusicStarted: false,
  isMusicPlaying: false,
};

const spawnFood = (id: number): Food => ({
  id,
  x: randomBetween(SPAWN_MARGIN, CANVAS_WIDTH - FOOD_DISPLAY_SIZE - SPAWN_MARGIN),
  y: randomBetween(SPAWN_MARGIN, CANVAS_HEIGHT - FOOD_DISPLAY_SIZE - SPAWN_MARGIN),
  frame: Math.floor(Math.random() * FOOD_FRAME_COUNT),
  age: 0,
});

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    renderables: [
      // Renders the score, centered on the canvas
      {
        type: "TEXT",
        text: `${state.eaten}`,
        color: "white",

        position: CENTER,

        align: {
          x: "center",
          y: "middle",
        },
      },

      // Renders a music on/off icon in the top-right corner — just a
      // clickable glyph, no button chrome around it
      {
        type: "TEXT",
        text: state.isMusicPlaying ? "⏸" : "▶",
        color: "white",

        isClickable: true,
        id: "music-toggle",

        position: { x: CANVAS_WIDTH - 30, y: 30 },

        align: {
          x: "right",
          y: "middle",
        },
      },

      // Renders each currently-spawned food, fading out as it ages so its
      // disappearance doesn't come as a total surprise
      ...state.foods.map(
        (food): Renderable => ({
          type: "SPRITE",
          resourceId: "food",
          frame: food.frame,
          scale: FOOD_SCALE,
          opacity: Math.max(0, 1 - food.age / FOOD_LIFETIME),

          isClickable: true,
          id: `food-${food.id}`,

          position: { x: food.x, y: food.y },
        })
      ),

      // Renders each "+1" popup, drifting upward and fading out — TEXT has
      // no opacity prop, so the fade is baked into the color's alpha instead
      ...state.popups.map((popup): Renderable => {
        const progress = popup.age / POPUP_DURATION;

        return {
          type: "TEXT",
          text: "+1",
          color: `rgba(255, 215, 0, ${Math.max(0, 1 - progress)})`,

          position: { x: popup.x, y: popup.y - POPUP_RISE * progress },

          align: {
            x: "center",
            y: "middle",
          },
        };
      }),
    ],
  };
};

// Create a function that handles the game state
// Ask yourself: "given the current game state, if an event happens, what should the next state be?"
// NextStateFunction<State> comes from the engine — its props also include
// `keyboard`, used below alongside `playSound`/`playMusic`/`pauseMusic`
const nextState: NextStateFunction<GameState> = (props) => {
  // Starts the background music once, the first time nextState runs —
  // playMusic() loops the track and keeps it running in the background
  // from here on, independent of frame updates or clicks
  if (!props.state.isMusicStarted) {
    props.playMusic("theme");

    return { ...props.state, isMusicStarted: true, isMusicPlaying: true };
  }

  // If the music icon is clicked, toggle it: pauseMusic() leaves it where
  // it stopped, so a later playMusic() call picks back up instead of
  // restarting the track
  if (props.event.tag === "CLICK" && props.event.id === "music-toggle") {
    if (props.state.isMusicPlaying) {
      props.pauseMusic();
    } else {
      props.playMusic("theme");
    }

    return { ...props.state, isMusicPlaying: !props.state.isMusicPlaying };
  }

  // If a food is clicked, collect it: score a point, play the collect
  // sound, pop a "+1" where it was clicked, and remove the food so it
  // can't be clicked (or expire) again
  if (props.event.tag === "CLICK" && props.event.id?.startsWith("food-")) {
    const clickedId = props.event.id;
    const { mouse } = props.event;

    props.playSound("collect");

    return {
      ...props.state,
      eaten: props.state.eaten + 1,
      foods: props.state.foods.filter((food) => `food-${food.id}` !== clickedId),
      popups: [...props.state.popups, { id: props.state.nextPopupId, x: mouse.x, y: mouse.y, age: 0 }],
      nextPopupId: props.state.nextPopupId + 1,
    };
  }

  // On every frame tick: age out foods and popups, and spawn a new food
  // once the spawn timer runs out
  if (props.event.tag === "TIME") {
    const { delta } = props.event;

    const foods = props.state.foods
      .map((food) => ({ ...food, age: food.age + delta }))
      .filter((food) => food.age < FOOD_LIFETIME);

    const popups = props.state.popups
      .map((popup) => ({ ...popup, age: popup.age + delta }))
      .filter((popup) => popup.age < POPUP_DURATION);

    const spawnTimer = props.state.spawnTimer - delta;

    if (spawnTimer > 0) {
      return { ...props.state, foods, popups, spawnTimer };
    }

    return {
      ...props.state,
      foods: [...foods, spawnFood(props.state.nextFoodId)],
      nextFoodId: props.state.nextFoodId + 1,
      spawnTimer: spawnTimer + SPAWN_INTERVAL,
      popups,
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

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },

  // Loads the food spritesheet: a 128x128 image sliced into an 8x8 grid
  // of 16x16 food icons, referenced by resourceId below
  resources: {
    food: {
      src: "./resources/food.png",
      size: { width: 128, height: 128 },
      slices: { horizontal: 8, vertical: 8 },
    },
  },

  // Loads the collect sound effect and background music track, played by
  // playSound("collect") and playMusic("theme")/pauseMusic() above
  sounds: {
    collect: { src: "./resources/collect.wav" },
  },
  music: {
    theme: { src: "./resources/floating-dream.ogg" },
  },
});
