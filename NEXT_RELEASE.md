<!--
  Running list of what's new since the last published release — every
  entry here becomes the next GitHub release's notes. Reset this file to
  empty right after publishing.
-->

- Added a factory function per renderable variant — `rectangle`/`circle`/`text`/`sprite`/`animatedSprite`/`line`/`group` (`Yuuna.sprite({...})` in the browser bundle, `import { sprite } from "yuuna-engine"` from npm) — so `render()` can build renderables without writing `{ type: "SPRITE", ... }` object literals by hand.
