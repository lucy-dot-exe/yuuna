<!--
  Running list of what's new since the last published release — every
  entry here becomes the next GitHub release's notes. Reset this file to
  empty right after publishing.
-->
- Added mouse wheel support. `WHEEL` is a new `GameEvent` that fires when the mouse wheel or a trackpad scrolls over the canvas. It has `deltaX`/`deltaY` (always in pixels, even where the browser reports lines), `mouse`/`worldMouse`, and the `id` of the renderable under the mouse, if any (no `isHoverable`/`isClickable` needed).
- Added `canvas.disableWheelScroll` to `runEngine`'s props, on by default: scrolling over the canvas no longer scrolls (or Ctrl+zooms) the page. Set it to `false` for a game embedded in a longer page that doesn't use the wheel. `WHEEL` fires either way. See the new Mouse Wheel example.
- Added `Backspace` to the tracked keyboard keys, so `keyboard.Backspace` works like any other key (and no longer triggers the browser's default while the canvas is focused).
