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
