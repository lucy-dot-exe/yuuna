<!--
  Running list of what's new since the last published release — every
  entry here becomes the next GitHub release's notes. Reset this file to
  empty right after publishing.
-->
- Added custom fonts. `runEngine` takes a `fonts` prop, keyed by family name (e.g. `fonts: { Pixel: { src: "./pixel.woff2" } }`), and `TEXT` renderables take a `fontFamily`. It can name a loaded font, a font the page already has (a system font or one from a stylesheet), or a generic family like `"monospace"`. Fonts finish loading before the first frame, so text never flashes in a fallback font, and click/hover areas match the font text is drawn in. Arial is still the default, and the fallback for a font that's missing or fails to load. See the new Custom Fonts example.
