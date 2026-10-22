<!--
  Running list of what's new since the last published release — every
  entry here becomes the next GitHub release's notes. Reset this file to
  empty right after publishing.
-->
- Added `rotation` to every renderable: it turns the renderable around the same anchor `scale` uses (its `position`, or a `LINE`'s `from`), in radians, clockwise on screen. Scale applies first, then rotation. It composes down a `GROUP` like `scale` does: children's positions turn with the parent, and their rotations add to the parent's. Hovering and clicking follow the rotated shape. To spin a `SPRITE` around its center, rotate a `GROUP` placed at that center. See the new Rotation example.
- Added multi-touch: `touches` in every `nextState` call lists each finger on the canvas — its `id`, where it is now and where it touched down (`mouse`/`worldMouse`, `startMouse`/`startWorldMouse`), and `isPressed`/`isJustPressed`/`isJustReleased` like `keyboard`. A tap shorter than one tick is still reported once. One finger at a time still acts as the mouse, as before; it's now always the same finger until it lifts (a second finger no longer moves the mouse), and `isMouse` says which one it is. The new `touchAsMouse(state, mouse)` prop decides whether a finger landing at `mouse` may be that one — return false to keep, say, a virtual joystick's thumb from also pressing buttons. See the new Multi Touch example.
