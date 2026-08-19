import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // Neutralino's own `neu build` already claims `dist/` for its
    // binary output (see neutralino.config.json's cli.resourcesPath) —
    // built here instead so the two don't collide.
    outDir: "app",
  },
});
