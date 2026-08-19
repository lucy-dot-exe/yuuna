<!--
  Running list of what's new since the last published release — every
  entry here becomes the next GitHub release's notes. Reset this file to
  empty right after publishing.
-->

- Added a factory function per renderable variant — `rectangle`/`circle`/`text`/`sprite`/`animatedSprite`/`line`/`group` (`Yuuna.sprite({...})` in the browser bundle, `import { sprite } from "yuuna-engine"` from npm) — so `render()` can build renderables without writing `{ type: "SPRITE", ... }` object literals by hand.
- `resources[id].size` is now optional, defaulting to the loaded image's own dimensions — only needed explicitly if you want a mismatch caught, or the sheet might load as a placeholder before its real size is known.
