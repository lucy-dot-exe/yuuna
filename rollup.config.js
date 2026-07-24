import typescript from "rollup-plugin-typescript2";

// Library build: consumed via `npm install` (ESM + CJS + type declarations)
const libBuild = {
  input: "src/index.ts",
  output: [
    { file: "lib/index.js", format: "es", sourcemap: true },
    { file: "lib/index.cjs", format: "cjs", sourcemap: true, exports: "named" },
  ],
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
      useTsconfigDeclarationDir: true,
      tsconfigOverride: {
        compilerOptions: { declaration: true, declarationDir: "lib" },
      },
    }),
  ],
};

// Demo build: browser bundle used by the landing page (dist/index.html)
const demoBuild = {
  input: "src/index.ts",
  output: {
    file: "dist/bundle.js", // output bundle
    format: "iife", // immediately-invoked function expression for browsers
    name: "Yuuna",
    sourcemap: true, // generate sourcemap for debugging
  },
  plugins: [
    typescript({ tsconfig: "./tsconfig.json" }), // TypeScript plugin
  ],
};

export default [libBuild, demoBuild];
