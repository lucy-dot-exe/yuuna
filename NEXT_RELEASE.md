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
