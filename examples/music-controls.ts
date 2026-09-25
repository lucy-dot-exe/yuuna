// Music Controls — play/pause a looping background track and adjust its
// volume and pitch, via playMusic()/pauseMusic()/setMusicVolume()/
// setMusicPitch() (all props every NextStateFunction receives, alongside
// state/event/keyboard).

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const VOLUME_STEP = 0.1;
const MAX_SEMITONES = 12;

// Create a type for the state of your game
// Pitch is kept in semitones (0 = normal) because that's the natural unit
// for stepping it; setMusicPitch() itself takes a playback-rate multiplier
type GameState = { isPlaying: boolean; volume: number; semitones: number };

// Create the initial state — isPlaying starts false: playMusic() needs a
// user gesture (a click) to actually start audio in the browser, so
// there's nothing to autoplay on load here
const initialState: GameState = { isPlaying: false, volume: 0.6, semitones: 0 };

const CENTER = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

// 12 semitones is an octave, i.e. double (or half) the playback rate
const semitonesToPitch = (semitones: number) => 2 ** (semitones / 12);

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  return {
    renderables: [
      Yuuna.text({
        text: state.isPlaying ? "⏸  Pause" : "▶  Play",
        color: "white",
        fontSize: 28,

        isClickable: true,
        id: "toggle",

        position: { x: CENTER.x, y: CENTER.y - 40 },
        align: { x: "center", y: "middle" },
      }),

      // Volume down / up, either side of a readout — clamped in
      // nextState below, so these two are always safe to click
      Yuuna.text({
        text: "−",
        color: "#8899aa",
        fontSize: 28,
        isClickable: true,
        id: "volume-down",
        position: { x: CENTER.x - 140, y: CENTER.y + 30 },
        align: { x: "center", y: "middle" },
      }),
      Yuuna.text({
        text: `Volume: ${Math.round(state.volume * 100)}%`,
        color: "white",
        position: { x: CENTER.x, y: CENTER.y + 30 },
        align: { x: "center", y: "middle" },
      }),
      Yuuna.text({
        text: "+",
        color: "#8899aa",
        fontSize: 28,
        isClickable: true,
        id: "volume-up",
        position: { x: CENTER.x + 140, y: CENTER.y + 30 },
        align: { x: "center", y: "middle" },
      }),

      // Pitch down / up — changes the track's speed along with its pitch
      Yuuna.text({
        text: "−",
        color: "#8899aa",
        fontSize: 28,
        isClickable: true,
        id: "pitch-down",
        position: { x: CENTER.x - 140, y: CENTER.y + 80 },
        align: { x: "center", y: "middle" },
      }),
      Yuuna.text({
        text: `Pitch: ${state.semitones > 0 ? "+" : ""}${state.semitones} semitones`,
        color: "white",
        position: { x: CENTER.x, y: CENTER.y + 80 },
        align: { x: "center", y: "middle" },
      }),
      Yuuna.text({
        text: "+",
        color: "#8899aa",
        fontSize: 28,
        isClickable: true,
        id: "pitch-up",
        position: { x: CENTER.x + 140, y: CENTER.y + 80 },
        align: { x: "center", y: "middle" },
      }),

      Yuuna.text({
        text: "Click Play, then try the volume and pitch buttons while it's playing",
        color: "#8899aa",
        position: { x: CENTER.x, y: CANVAS_HEIGHT - 30 },
        align: { x: "center", y: "middle" },
      }),
    ],
  };
};

// Create a function that handles the game state
const nextState: NextStateFunction<GameState> = ({
  state,
  event,
  playMusic,
  pauseMusic,
  setMusicVolume,
  setMusicPitch,
}) => {
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

  if (event.tag === "CLICK" && (event.id === "pitch-up" || event.id === "pitch-down")) {
    const delta = event.id === "pitch-up" ? 1 : -1;
    const semitones = Math.min(MAX_SEMITONES, Math.max(-MAX_SEMITONES, state.semitones + delta));

    // Like setMusicVolume, this also applies to whatever plays next, so
    // it works whether or not the track is currently playing
    setMusicPitch(semitonesToPitch(semitones));

    return { ...state, semitones };
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
