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

const titleCase = (id) =>
  id
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

// Example games are written once in examples/ — either a single file
// (id.ts) or a folder of files for a multi-file game, optionally with a
// manifest.json inside the folder to set the file explorer's display
// order and which file opens by default — and fetched by the
// playground's "Select an example..." dropdown, instead of being
// hand-copied into dist/index.html. Every example is copied into its own
// dist/examples/<id>/ folder (even single-file ones), so the playground
// can fetch every file the same way regardless of how many there are,
// and indexed in dist/examples/manifest.json so the file explorer never
// drifts from what's actually in examples/.
async function copyExamples() {
  const sourceDir = path.join(root, "examples");
  const outputDir = path.join(root, "dist/examples");

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const examples = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      const id = entry.name.replace(/\.ts$/, "");

      await mkdir(path.join(outputDir, id), { recursive: true });
      await copyFile(path.join(sourceDir, entry.name), path.join(outputDir, id, entry.name));

      examples.push({ id, label: titleCase(id), files: [entry.name], entry: entry.name });
      continue;
    }

    if (entry.isDirectory()) {
      const id = entry.name;
      const projectDir = path.join(sourceDir, id);
      const projectFiles = (await readdir(projectDir)).filter((file) => file.endsWith(".ts"));

      await mkdir(path.join(outputDir, id), { recursive: true });

      for (const file of projectFiles) {
        await copyFile(path.join(projectDir, file), path.join(outputDir, id, file));
      }

      let meta = { label: titleCase(id), files: projectFiles, entry: projectFiles[0] };

      try {
        const rawManifest = await readFile(path.join(projectDir, "manifest.json"), "utf8");
        meta = { ...meta, ...JSON.parse(rawManifest) };
      } catch {
        // No manifest.json in this folder — fall back to the derived
        // label and readdir's (unordered) file list above.
      }

      examples.push({ id, ...meta });
    }
  }

  await writeFile(
    path.join(outputDir, "manifest.json"),
    JSON.stringify({ examples }, null, 2)
  );

  console.log(`Copied ${examples.length} example(s) to dist/examples`);
}

await mkdir(path.join(root, "dist/examples"), { recursive: true });
await generateAmbientTypes();
await copyExamples();
