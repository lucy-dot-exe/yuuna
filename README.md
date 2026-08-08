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

type GameState = { cookies: number };

runEngine<GameState>({
  initialState: { cookies: 0 },

  // Optional — size and color the canvas from code instead of HTML/CSS
  canvas: { width: 960, height: 540, backgroundColor: "#0d1831" },

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
  `CIRCLE`, `TEXT`, `SPRITE`, and `LINE`. Give one an `id` plus
  `isClickable` / `isHoverable` / `trackMouseMovement` to make it
  interactive. `TEXT` also takes a `fontSize` (defaults to `30`). Every
  renderable also takes:
  - `layer` — higher values render later, i.e. in front of lower ones.
    Defaults to `0`; renderables on the same layer keep `render()`'s order.
  - `scale` — `{ x, y }` multiplier on the renderable's size, anchored at
    its `position` (or `from`, for `LINE`). Defaults to `{ x: 1, y: 1 }`.
    A `CIRCLE` scaled unevenly draws (and hit-tests) as an ellipse.
  - `modulate` — a CSS color string that multiplies the renderable's color
    channel-by-channel, the same way Godot's `modulate` works — e.g.
    `"#808080"` halves brightness, `"#ff0000"` keeps only the red channel.
  - `children` — nested renderables, positioned relative to this one, like
    Godot's parent/child nodes. A child's `position` is added to its
    parent's (scaled by the parent's own `scale`), and `scale` / `modulate`
    / `layer` all compose down the tree — a child's effective scale is the
    parent's times its own, `modulate` multiplies the same way, and
    `layer` adds (relative to the parent's, matching Godot's default: a
    deeply-nested child can still end up drawn in front of an unrelated
    top-level renderable if its accumulated layer says so). A child is a
    full `Renderable`, so it can have its own `id` / `isClickable` / even
    its own `children`.
- **Events** — your `nextState` function receives one `GameEvent` per call:
  `TIME` (frame tick with `delta`), `CLICK`, `HOVER_IN`, `HOVER_OUT`, or
  `MOUSE_MOVE`.
- **Keyboard** — `nextState` also receives a `keyboard` map keyed by
  `KeyCode`-style keys (e.g. `"KeyW"`, `"ArrowLeft"`, `"Space"`), each with
  `isPressed` / `isJustPressed` / `isJustReleased`.
- **Sprites** — pass a `resources` map of `{ src, size, slices }` to
  `runEngine` to load spritesheets, then reference them by id with a
  `SPRITE` renderable's `resourceId` and `frame`. Set `flipX: true` to
  mirror a sprite horizontally — useful when the art is drawn facing one
  direction but needs to move the other way.
- **Sound effects** — pass a `sounds` map of `{ src }` to `runEngine`, then
  call the `playSound(id)` function `nextState` receives to play one, e.g.
  `playSound("collect")` when a cookie is clicked. Calling it again while
  a sound is still playing overlaps a new copy instead of cutting the
  first one off.
- **Music** — pass a `music` map of `{ src }` to `runEngine`, then use the
  `playMusic(id)` / `pauseMusic()` functions `nextState` receives to
  control a looping background track. Unlike `playSound`, only one track
  plays at a time and it keeps running in the background across frames
  instead of firing once; `pauseMusic()` leaves it where it stopped, so
  calling `playMusic(id)` again resumes it instead of starting over.
- **Canvas** — pass `canvas: { width, height, backgroundColor }` to
  `runEngine` to size and color the canvas from code. All three are
  optional; anything you don't set falls back to the canvas element's
  existing HTML/CSS.
- **Mechanics** — `nextState` can also be an array of small
  `NextStateFunction`s instead of one big function. Each one is run in
  order for every event, and can return:
  - a new state, to update to
  - `undefined` (or no `return` at all) — no change, but the rest of the
    list still runs, so a guard can just be `if (...) return;`
  - `STOP` (imported from `yuuna-engine`) — no change, and the rest of
    the list is skipped for this event, so a shared rule (like "nothing
    happens once the game is over") only needs to be written once

  ```ts
  import { runEngine, STOP, type NextStateFunction } from "yuuna-engine";

  const freezeOnGameOver: NextStateFunction<GameState> = ({ state }) => {
    if (state.lives <= 0) return STOP;
  };

  const moveEnemies: NextStateFunction<GameState> = ({ state, event }) => {
    if (event.tag === "TIME") {
      return { ...state, enemies: move(state.enemies, event.delta) };
    }
  };

  runEngine<GameState>({
    initialState,
    render,
    nextState: [freezeOnGameOver, moveEnemies /* ... */],
  });
  ```

## Development

```sh
yarn install
yarn build   # builds lib/ (npm package) and dist/bundle.js (landing page)
yarn watch   # rebuild on change
```

`dist/index.html` is the landing page — it loads `dist/bundle.js` in the
browser via a global `Yuuna` object and embeds a live Monaco editor so
visitors can edit and run a game directly on the page.

## License

MIT © [lucy-dot-exe](https://github.com/lucy-dot-exe)
