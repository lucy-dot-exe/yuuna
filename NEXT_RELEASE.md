<!--
  Running list of what's new since the last published release — every
  entry here becomes the next GitHub release's notes. Reset this file to
  empty right after publishing.
-->

- `canvas.resize` option (`"none" | "fit" | "stretch"`) lets the display size track the browser window while the logical resolution renderables are positioned in stays fixed. `"fit"` letterboxes to preserve aspect ratio, `"stretch"` fills the window on both axes.
- `requestFullscreen`/`exitFullscreen`, returned from `runEngine()` alongside `sendEvent`, request/exit fullscreen on the canvas. A new `FullscreenChangeEvent` (`FULLSCREEN_CHANGE`) fires from `nextState` whenever fullscreen is entered or exited, however it happened (including the user pressing Esc).
- Added a Window Resize example — three buttons switch canvas.resize between `"none"`/`"fit"`/`"stretch"` over a grid, so the difference between them is visible instead of just described.
