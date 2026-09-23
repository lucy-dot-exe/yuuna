<!--
  Running list of what's new since the last published release — every
  entry here becomes the next GitHub release's notes. Reset this file to
  empty right after publishing.
-->
- Added `timeScale` to `runEngine`'s props — a function of state, recomputed every tick, that globally scales the passage of simulated time: every `TIME` event's own `delta`, and every `ANIMATED_SPRITE`'s own playback speed (composed with that renderable's own `timeScale`, if it has one). 0 freezes both game logic and animation playback in place; missing/undefined keeps today's 1x behavior. Lets a game drive a live speed-up/slow-motion control or a pause that still wants renderables drawn, without touching anything else measured in real time (input, audio, the loop's own tick rate).
- Added `addResource` to the object `runEngine()` resolves with, alongside `sendEvent`/`requestFullscreen`/`exitFullscreen` — registers a resource under an id after the engine's already running, loading it exactly like `resources` does (placeholder-on-failure included), then makes it usable by `resourceId` from a `SPRITE`/`ANIMATED_SPRITE` as soon as the returned Promise resolves. For art that isn't known until runtime (a level loaded later, a user-supplied skin, ...) instead of everything needing to be listed upfront.
