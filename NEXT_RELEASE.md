<!--
  Running list of what's new since the last published release — every
  entry here becomes the next GitHub release's notes. Reset this file to
  empty right after publishing.
-->

- Music: added `setMusicVolume(volume)` to control the current/next
  track's volume.
- Music: added a `MUSIC_END` event — set `loop: false` on a `music`
  entry to get notified when that track finishes instead of having it
  restart.
- Music: added `resumeMusic()`, an explicit pair to `pauseMusic()`.
- Added custom events — `runEngine`'s second type parameter is your own
  event payload type, delivered to `nextState` as a `CUSTOM` event via a
  `sendEvent()` function `runEngine()` now resolves with. For reporting
  async work (e.g. a `fetch()` resolving) back into the state machine.
- Added starter templates (`blank`, zero-install; `npm`, TypeScript +
  Vite) — grab one with `npx degit lucy-dot-exe/yuuna/templates/<name>`.
- Added small, focused playground examples for Camera, Groups & Layers,
  Mechanics Pipeline, and Custom Events, alongside the existing full
  game examples.
- Docs: trimmed the README down to the essentials and moved the full
  concept-by-concept reference to the wiki.
