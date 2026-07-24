import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// The playground's Monaco editor type-checks against a global `Yuuna`
// (matching dist/bundle.js, a browser IIFE), not the ES module exports
// consumers get from npm. This turns the real source types into the
// ambient-global declarations Monaco needs, so the playground never
// drifts from src/engine/types.ts.
async function generateAmbientTypes() {
  const sourcePath = path.join(root, "src/engine/types.ts");
  const outputPath = path.join(root, "dist/yuuna.d.ts");

  const source = await readFile(sourcePath, "utf8");

  const ambient = source
    .replace(/^export declare /gm, "declare ")
    .replace(/^export /gm, "declare ");

  await writeFile(outputPath, ambient);

  console.log(
    `Generated ${path.relative(root, outputPath)} from ${path.relative(root, sourcePath)}`
  );
}

// Example games are written once in examples/ and fetched by the
// playground's "Select an example..." dropdown, instead of being
// hand-copied into dist/index.html.
async function copyExamples() {
  const sourceDir = path.join(root, "examples");
  const outputDir = path.join(root, "dist/examples");

  const files = await readdir(sourceDir);

  for (const file of files) {
    await copyFile(path.join(sourceDir, file), path.join(outputDir, file));
  }

  console.log(`Copied ${files.length} example(s) to dist/examples`);
}

await mkdir(path.join(root, "dist/examples"), { recursive: true });
await generateAmbientTypes();
await copyExamples();
