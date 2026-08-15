<p align="center">
  <img src="dist/resources/yuuna.png" alt="Yuuna" width="120" height="120" />
</p>

# Yuuna

[Live demo & playground](https://lucy-dot-exe.github.io/yuuna/) · [GitHub](https://github.com/lucy-dot-exe/yuuna)

A lightweight, state-machine-based TypeScript game engine built for quick
prototypes — drop it into a page and it's running, no editor or build step
required. You describe your game as a `state`, a `render(state)` function,
and a `nextState({ state, event, keyboard })` function — Yuuna owns the
render loop, input handling, and canvas drawing. It's scratch paper for game
ideas, not a replacement for Godot or Unity.

## Install

```sh
npm install yuuna-engine
```

## Quick start

Add a canvas with `id="yuuna"` to your page:

```html
<canvas id="yuuna"></canvas>
```

Then describe your game as state + render + nextState:

```ts
import { runEngine } from "yuuna-engine";

// The shape of your game's data — whatever it takes to fully describe
// what's on screen and how it behaves
type GameState = { cookies: number };

// What that state looks like before anything has happened yet
const initialState: GameState = { cookies: 0 };

runEngine<GameState>({
  initialState,

  // Given the current state, what should be drawn this frame? Called
  // every frame — always derive the picture from state, instead of
  // reaching for the canvas directly.
  render: (state) => ({
    renderables: [
      {
        type: "TEXT",
        text: `${state.cookies} cookies`,
        color: "black",
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

  // Given the current state and something that just happened, what's the
  // next state? Called once per event (a click, a frame tick, ...) — the
  // only place game logic lives.
  nextState: ({ state, event }) => {
    if (event.tag === "CLICK" && event.id === "cookie") {
      return { cookies: state.cookies + 1 };
    }

    return state;
  },
});
```

## Concepts

- **Renderables** — declarative shapes drawn each frame: `RECTANGLE`,
  `CIRCLE`, `TEXT`, `SPRITE`, `ANIMATED_SPRITE`, `LINE`, and `GROUP`. Give
  one an `id` plus `isClickable`/`isHoverable` to make it interactive.
- **Events** — `nextState` receives one `GameEvent` per call: `TIME`,
  `CLICK`, `HOVER_IN`, `HOVER_OUT`, `MOUSE_MOVE`, `MOUSE_LEAVE`,
  `MUSIC_END`, or a `CUSTOM` event of a type you define yourself, for
  reporting things like an async `fetch()` resolving back into your
  state machine.
- **Keyboard, camera, sprites & animation, sound effects & music,
  canvas config, and mechanics pipelines** all follow the same idea:
  small, focused props and functions `runEngine`/`nextState` take, that
  compose with everything above instead of replacing it.

This README stays intentionally thin — the full concept-by-concept
reference, with every option and example, lives on the
[wiki](https://github.com/lucy-dot-exe/yuuna/wiki). The
[playground](https://lucy-dot-exe.github.io/yuuna/#playground) also has a
small, focused example for most of these you can run and edit directly.

## Templates

Prefer a working starting point over typing the quick start out by
hand? Grab one from [`templates/`](templates):

- **[blank](templates/blank)** — a single `index.html`, zero install —
  open it in a browser and it runs.
- **[npm](templates/npm)** — TypeScript + a dev server with hot reload
  (via Vite), for a real local project.

```sh
npx degit lucy-dot-exe/yuuna/templates/blank my-game
# or: npx degit lucy-dot-exe/yuuna/templates/npm my-game
```

[`degit`](https://github.com/Rich-Harris/degit) copies the folder without
its git history — no cloning or forking the whole engine repo needed.
Each template's own README has more on running it once copied.

## Development

```sh
yarn install
yarn build   # builds lib/ (npm package) and dist/bundle.js (landing page)
yarn watch   # rebuild on change
```

`dist/index.html` is the landing page — it loads `dist/bundle.js` in the
browser via a global `Yuuna` object and embeds a live Monaco editor so
visitors can edit and run a game directly on the page.

## Assets

The examples' art/sound/music lives in `dist/resources/`, gitignored
rather than committed — this repo being open source doesn't make every
asset in it free to redistribute. `runEngine()` falls back to a
generated placeholder for any image that isn't there (and simply plays
nothing for missing audio) instead of failing, so the examples still
run without them — just with placeholder art in place of the real
thing. Drop the real files in locally (or restore them from wherever
you got this repo from) to see them for real.

Currently used:

- **[Free Pixel Food!](https://henrysoftware.itch.io/pixel-food)** by
  [Henry Software](https://henrysoftware.itch.io/) — the food icons in
  the Food Clicker and Sprites examples. CC0; credited here by choice,
  not requirement.

## License

MIT © [lucy-dot-exe](https://github.com/lucy-dot-exe)
