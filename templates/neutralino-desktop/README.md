# neutralino-desktop

A Yuuna game wrapped in [Neutralino](https://neutralino.js.org) — a real
TypeScript + [Vite](https://vitejs.dev) dev setup (same as the
[`npm`](../npm) template), plus the config to run it as a native desktop
window instead of a browser tab.

## Develop it like a normal web page

```sh
npm install
npm run dev
```

Then open the URL Vite prints. Edit `src/main.ts` and save — the page
updates on its own. This step never touches Neutralino at all.

## Run it as a desktop window

Neutralino's CLI needs to fetch platform binaries + its client library
once, which needs an internet connection:

```sh
npm run neu:update
```

Then, any time you want to launch it as a native window:

```sh
npm run neu:run
```

(This builds the frontend with `vite build` into `app/` first — see
`vite.config.ts` — then hands that to `neu run`.)

## Build a distributable

```sh
npm run neu:build
```

Binaries land in `dist/`.

## Want the zero-build or plain web versions instead?

See [`blank`](../blank) (a single `index.html`, no install) or
[`npm`](../npm) (this same TypeScript + Vite setup, without the Neutralino
desktop shell).
