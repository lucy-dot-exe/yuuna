<!--
  Running list of what's new since the last published release — every
  entry here becomes the next GitHub release's notes. Reset this file to
  empty right after publishing.
-->
- Added pitch control for audio. `playSound` takes an optional second argument, `{ pitch }`, a playback-rate multiplier (default `1`; `2` is an octave up, `0.5` an octave down), so each play of a sound can have its own pitch, e.g. `playSound("jump", { pitch: 0.9 + Math.random() * 0.2 })` for variety. `nextState` also receives `setMusicPitch(pitch)`, which works like `setMusicVolume`: it applies to the current track and to whatever plays next. Pitch changes speed along with it, like a tape, so a `loop: false` track fires `MUSIC_END` sooner or later. Values are clamped to 0.25–4. The Music Controls example now has pitch buttons.
- Added volume control for sound effects. `playSound`'s options also take `volume` (0–1, default `1`) for a single play, and `nextState` receives `setSoundVolume(volume)` for an overall sound effect volume (e.g. an "SFX volume" setting), separate from `setMusicVolume`. The two are multiplied together. `setSoundVolume` affects sounds started after it's called; sounds already playing keep their volume.
- Added `restartMusic()`, received by `nextState`: it starts the current track over from the beginning, even if it was paused or had ended (`playMusic`/`resumeMusic` always continue from where the track left off). The Music Controls example now has a Restart button.
