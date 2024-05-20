import typescript from "rollup-plugin-typescript2";

export default {
  input: "src/index.ts", // entry point for your application
  output: {
    file: "dist/bundle.js", // output bundle
    format: "iife", // immediately-invoked function expression for browsers
    name: "Luna",
    sourcemap: true, // generate sourcemap for debugging
  },
  plugins: [
    typescript({ tsconfig: "./tsconfig.json" }), // TypeScript plugin
  ],
};
