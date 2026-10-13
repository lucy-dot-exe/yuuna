<!--
  Running list of what's new since the last published release — every
  entry here becomes the next GitHub release's notes. Reset this file to
  empty right after publishing.
-->
- Added `rotation` to every renderable: it turns the renderable around the same anchor `scale` uses (its `position`, or a `LINE`'s `from`), in radians, clockwise on screen. Scale applies first, then rotation. It composes down a `GROUP` like `scale` does: children's positions turn with the parent, and their rotations add to the parent's. Hovering and clicking follow the rotated shape. To spin a `SPRITE` around its center, rotate a `GROUP` placed at that center. See the new Rotation example.
