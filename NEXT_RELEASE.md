<!--
  Running list of what's new since the last published release — every
  entry here becomes the next GitHub release's notes. Reset this file to
  empty right after publishing.
-->
- Added `maxFps` to `runEngine`'s props — a function of state, recomputed every tick, that caps how many ticks per second the engine runs (each tick being one round of `nextState` plus one draw), so a game can drive it live from a settings menu. Ticks that would come too early are skipped rather than delayed: input keeps queuing and is delivered on the next tick that runs, whose `TIME` `delta` covers the whole gap, so game logic and animations stay in step with real time at any cap. Missing/undefined, `Infinity` or anything <= 0 keeps today's uncapped behavior. See the new Max FPS example.
