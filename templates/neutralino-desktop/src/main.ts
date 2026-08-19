import { runEngine, type NextStateFunction } from "yuuna-engine";

// Only present once this is actually running inside the Neutralino shell
// (see index.html's guarded neutralino.js script tag) — declared instead
// of imported so `npm run dev`'s plain browser preview, which never loads
// neutralino.js, still works untouched.
declare const Neutralino: { init: () => void } | undefined;
if (typeof Neutralino !== "undefined") {
  Neutralino.init();
}

// The shape of your game's data — whatever it takes to fully describe
// what's on screen and how it behaves
type GameState = { cookies: number };

// What that state looks like before anything has happened yet
const initialState: GameState = { cookies: 0 };

// Given the current state and something that just happened, what's the
// next state? Called once per event (a click, a frame tick, ...) — the
// only place game logic lives.
const nextState: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "CLICK" && event.id === "cookie") {
    return { cookies: state.cookies + 1 };
  }

  return state;
};

runEngine<GameState>({
  initialState,
  nextState,

  canvas: { width: 960, height: 540, backgroundColor: "#0d1831" },

  // Given the current state, what should be drawn this frame? Called
  // every frame — always derive the picture from state, instead of
  // reaching for the canvas directly.
  render: (state) => ({
    renderables: [
      {
        type: "TEXT",
        text: `${state.cookies} cookies`,
        color: "white",
        position: { x: 100, y: 50 },
      },
      {
        type: "CIRCLE",
        id: "cookie",
        isClickable: true,
        color: "brown",
        position: { x: 50, y: 50 },
        radius: 25,
      },
    ],
  }),
});
