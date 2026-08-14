# blank

The zero-install Yuuna starter — a single `index.html` that loads the
engine straight from a CDN build of the published npm package. No
`npm install`, no build step.

## Use it

Copy `index.html` and open it in a browser (double-click it, or serve
the folder with anything that speaks static files — e.g.
`npx serve .`). Edit the `<script type="module">` in place and reload
to see changes.

## Want TypeScript?

This template is plain JS on purpose, so opening the file is enough on
its own. If you want type-checking while you edit, see the
[`npm`](../npm) template instead — same starting game, with
`yuuna-engine`'s types wired up through a real `npm install`.
