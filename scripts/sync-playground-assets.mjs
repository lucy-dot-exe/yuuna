import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Game art/audio in dist/resources (everything except yuuna.png) is
// gitignored — see .gitignore — because it isn't freely redistributable,
// but the deployed Pages site still needs it (playground-assets release,
// downloaded by .github/workflows/deploy-pages.yml). This script keeps
// that release in sync with whatever is on disk right now, without ever
// putting the files themselves in git. Manifest cache lives under .git/
// (never tracked, never committed) so re-runs skip the upload when
// nothing changed.
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const resourcesDir = path.join(root, "dist/resources");
const manifestPath = path.join(root, ".git", "playground-assets-manifest.json");
const releaseTag = "playground-assets";
const repo = "lucy-dot-exe/yuuna";
const assetName = "playground-resources.zip";

function hashFile(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function loadManifest() {
  if (!existsSync(manifestPath)) return {};
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return {};
  }
}

function main() {
  if (!existsSync(resourcesDir)) {
    console.log("sync-playground-assets: dist/resources doesn't exist — skipping.");
    return;
  }

  const present = readdirSync(resourcesDir).filter((f) => f !== "yuuna.png");
  if (present.length === 0) {
    console.log("sync-playground-assets: no private assets present locally — skipping.");
    return;
  }

  const hashes = {};
  for (const file of present) {
    hashes[file] = hashFile(path.join(resourcesDir, file));
  }

  const previous = loadManifest();
  if (JSON.stringify(hashes) === JSON.stringify(previous)) {
    console.log("sync-playground-assets: assets unchanged since last sync — skipping upload.");
    return;
  }

  console.log(`sync-playground-assets: change detected in ${present.join(", ")} — repackaging and uploading.`);

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "yuuna-playground-assets-"));
  try {
    for (const file of present) {
      copyFileSync(path.join(resourcesDir, file), path.join(tmpDir, file));
    }

    const zipPath = path.join(tmpDir, assetName);
    if (process.platform === "win32") {
      execFileSync("powershell", [
        "-NoProfile",
        "-Command",
        `Compress-Archive -Path '${tmpDir}\\*' -DestinationPath '${zipPath}' -Force`,
      ]);
    } else {
      execFileSync("zip", ["-j", zipPath, ...present.map((f) => path.join(tmpDir, f))]);
    }

    execFileSync("gh", ["release", "upload", releaseTag, zipPath, "--repo", repo, "--clobber"], {
      stdio: "inherit",
    });

    writeFileSync(manifestPath, JSON.stringify(hashes, null, 2));
    console.log("sync-playground-assets: uploaded and manifest updated.");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

try {
  main();
} catch (err) {
  console.warn(`sync-playground-assets: skipping — ${err.message}`);
}
