// Music Controls — play/pause a looping background track and adjust its
// volume, via playMusic()/pauseMusic()/setMusicVolume() (all props every
// NextStateFunction receives, alongside state/event/keyboard).

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const VOLUME_STEP = 0.1;

// Create a type for the state of your game
type GameState = { isPlaying: boolean; volume: number };

// Create the initial state — isPlaying starts false: playMusic() needs a
// user gesture (a click) to actually start audio in the browser, so
// there's nothing to autoplay on load here
const initialState: GameState = { isPlaying: false, volume: 0.6 };

const CENTER = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    renderables: [
      {
        type: "TEXT",
        text: state.isPlaying ? "⏸  Pause" : "▶  Play",
        color: "white",
        fontSize: 28,

        isClickable: true,
        id: "toggle",

        position: { x: CENTER.x, y: CENTER.y - 40 },
        align: { x: "center", y: "middle" },
      },

      // Volume down / up, either side of a readout — clamped in
      // nextState below, so these two are always safe to click
      {
        type: "TEXT",
        text: "−",
        color: "#8899aa",
        fontSize: 28,
        isClickable: true,
        id: "volume-down",
        position: { x: CENTER.x - 140, y: CENTER.y + 30 },
        align: { x: "center", y: "middle" },
      },
      {
        type: "TEXT",
        text: `Volume: ${Math.round(state.volume * 100)}%`,
        color: "white",
        position: { x: CENTER.x, y: CENTER.y + 30 },
        align: { x: "center", y: "middle" },
      },
      {
        type: "TEXT",
        text: "+",
        color: "#8899aa",
        fontSize: 28,
        isClickable: true,
        id: "volume-up",
        position: { x: CENTER.x + 140, y: CENTER.y + 30 },
        align: { x: "center", y: "middle" },
      },

      {
        type: "TEXT",
        text: "Click Play, then try the volume buttons while it's playing",
        color: "#8899aa",
        position: { x: CENTER.x, y: CANVAS_HEIGHT - 30 },
        align: { x: "center", y: "middle" },
      },
    ],
  };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({ state, event, playMusic, pauseMusic, setMusicVolume }) => {
  if (event.tag === "CLICK" && event.id === "toggle") {
    if (state.isPlaying) {
      pauseMusic();
    } else {
      // setMusicVolume applies to whatever plays next too, so this picks
      // up straight away — no need to call it again just because
      // playback (re)started
      setMusicVolume(state.volume);
      playMusic("theme");
    }

    return { ...state, isPlaying: !state.isPlaying };
  }

  if (event.tag === "CLICK" && (event.id === "volume-up" || event.id === "volume-down")) {
    const delta = event.id === "volume-up" ? VOLUME_STEP : -VOLUME_STEP;
    const volume = Math.min(1, Math.max(0, state.volume + delta));

    setMusicVolume(volume);

    return { ...state, volume };
  }
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },

  // loop defaults to true — the track restarts on its own with no
  // MUSIC_END event to react to, which is what "background music" means
  // here (set loop: false instead for a one-shot track you want to know
  // the end of)
  music: {
    theme: { src: "./resources/floating-dream.ogg" },
  },
});
