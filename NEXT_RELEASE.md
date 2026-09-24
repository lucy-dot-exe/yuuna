<!--
  Running list of what's new since the last published release — every
  entry here becomes the next GitHub release's notes. Reset this file to
  empty right after publishing.
-->
- Added right mouse button support. `RIGHT_CLICK` is a new `GameEvent`, `CLICK`'s counterpart for the secondary button (fired on an `isClickable` renderable under the cursor, with the same `id`/`mouse`/`worldMouse` fields, and from Ctrl+click on macOS too); a separate tag, so existing `CLICK` handlers don't start reacting to right clicks. `nextState` also receives `rightMouseButton`, `mouseButton`'s counterpart (`isPressed`/`isJustPressed`/`isJustReleased`). Both are mouse only; touch still drives `CLICK`/`mouseButton` as before.
- Added `canvas.disableContextMenu` to `runEngine`'s props, on by default: right-clicking the canvas no longer opens the browser's context menu. Set it to `false` to get the menu back; `RIGHT_CLICK`/`rightMouseButton` work either way. See the new Mouse Buttons example.
