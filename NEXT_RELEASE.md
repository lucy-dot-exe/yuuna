<!--
  Running list of what's new since the last published release — every
  entry here becomes the next GitHub release's notes. Reset this file to
  empty right after publishing.
-->

- Added a `MOUSE_LEAVE` event, fired when the mouse exits the canvas —
  also implies a `HOVER_OUT` for whatever was hovered at the time.
- Fixed a bug where re-running `runEngine()` (e.g. picking a new example in
  the playground) left the previous run's music playing underneath the new
  one instead of stopping it.
- Added `TAB_BLUR`/`TAB_FOCUS` events, fired when the browser tab the game
  is running in is switched away from / back to.
- Removed the Square Dash example.
- Replaced Tower Defense's sprites (not free for distribution) with new
  original placeholder art.
- Added a Shoot Em Up example — the ship follows the mouse, hold the
  button down to fire at enemies falling from the top.
- Added an Examples gallery to the landing page — a card grid over every
  example, similar to Phaser's labs page, that opens the one you click
  into the playground.
- Added a dedicated Examples page (`examples.html`, linked from the nav as
  "All Examples") with the same gallery and playground as the landing
  page's, on its own tab instead of scrolled to within it.
- Fixed clicks (and other input) silently stopping in the playground the
  longer a session went on — `runEngine()`'s click/keyboard/mouse
  listeners were piling up on the persistent playground canvas across
  every example switch and Auto-Reload edit instead of the old run's
  being cleaned up first.
- Shoot Em Up now hides the OS cursor over the canvas, since the ship
  already stands in for it. `render()` can return `cursor: "none"` for
  any game that wants the same.
- Reworked the playground's layout: the game canvas now sits above the
  editor (full width each) instead of the two side by side, and the
  editor's default height is shorter to match.
- Fixed the playground not respecting the page's side padding — it now
  uses the same gutter every other section on the page does, instead of
  a smaller, unrelated margin of its own.
- Added a `.gitignore` to the `npm` template, covering `node_modules/`
  and Vite's `dist/` build output.
- Added a Sprites example — loads a spritesheet and renders one frame
  from it, click to step through the sheet.
- Added an Animated Sprites example — an `ANIMATED_SPRITE` playing
  through a named animation on its own, click to pause/resume it.
- Added a Music Controls example — play/pause a looping track and adjust
  its volume with `playMusic`/`pauseMusic`/`setMusicVolume`.
- Added a Mouse Leave example, demonstrating `MOUSE_LEAVE`.
- Added a Tab Visibility example, demonstrating `TAB_BLUR`/`TAB_FOCUS` —
  pausing/resuming music as the tab loses/regains focus.
- Added zoom in/out (E/Q) to the Camera example.
- `dist/resources/` (example art/sound/music) is no longer committed —
  this repo being open source doesn't make every asset in it free to
  redistribute. `runEngine()` now falls back to a generated placeholder
  sheet for any image resource that fails to load, and no longer hangs
  forever on a missing sound/music file, so examples still run without
  the real assets present — no example code needed to change.
- Credited [Free Pixel Food!](https://henrysoftware.itch.io/pixel-food)
  by Henry Software (the food icons in Food Clicker and Sprites) in the
  README and in the site's footer.
- Added palette swap to SPRITE/ANIMATED_SPRITE: `swapColors: [{ from,
  to }]` replaces every pixel exactly matching `from` with `to` —
  recolor a sprite off one shared sheet instead of a separate art asset
  per color variant. Composes with the existing `modulate` tint, which
  still applies on top of the swap.
- Added a Palette Swap example — four skeletons, one shared spritesheet,
  each recolored with a different swapColors pair.
