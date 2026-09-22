let autoReload = true;
let manifest = null;
let currentProject = null;
let models = {}; // fileName -> monaco.editor.ITextModel, for the open project
let openTabs = [];
let activeFile = null;

function onAutoReloadToggle(checked) {
  autoReload = checked;
}

// The Examples gallery below is a second, static picker over the same
// examples as #exampleSelect's dropdown (see EXAMPLES) — clicking a
// card just has to drive the same loadProject(id) the dropdown does,
// once Monaco/the manifest have actually finished loading (see the
// require(["vs/editor/editor.main"], ...) block further down, which
// resolves this once its setup — including the default example — is
// done).
let resolvePlaygroundReady;
const playgroundReady = new Promise((resolve) => {
  resolvePlaygroundReady = resolve;
});

// A gallery, Phaser-labs-style (https://labs.phaser.io), over the
// same examples/ the dropdown above pulls from — id has to match a
// dropdown <option>'s value / an id in dist/examples/manifest.json.
// Kept as a hardcoded list rather than generated from the manifest
// (which has no description/category) for the same reason the
// dropdown's <option>s already are: it's a handful of examples that
// change rarely, not worth a build step of its own.
const EXAMPLES = [
  {
    id: "cookie-clicker",
    label: "Cookie Clicker",
    category: "games",
    description: "Click the cookie, watch the counter go up — the smallest possible click → state → render loop.",
  },
  {
    id: "food-clicker",
    label: "Food Clicker",
    category: "games",
    description: "Beat the 30-second clock — catching food fast builds a combo that's worth more and spawns faster.",
  },
  {
    id: "tower-defense",
    label: "Tower Defense",
    category: "games",
    description: "Enemies walk down the lane in escalating waves — turrets melt anything that gets close enough.",
  },
  {
    id: "shoot-em-up",
    label: "Shoot Em Up",
    category: "games",
    description: "The ship follows your mouse — hold the button down to fire at enemies falling from the top.",
  },
  {
    id: "camera",
    label: "Camera",
    category: "feature",
    description: "Move with the arrow keys, zoom with E/Q — the camera follows you around a world bigger than the canvas.",
  },
  {
    id: "groups-and-layers",
    label: "Groups & Layers",
    category: "feature",
    description: "A GROUP composes position/scale/modulate/layer down to its children, like Godot's parent/child nodes.",
  },
  {
    id: "mechanics-pipeline",
    label: "Mechanics Pipeline",
    category: "feature",
    description: "nextState as an array of small, independent functions instead of one big one, with STOP as a shared early-exit.",
  },
  {
    id: "custom-events",
    label: "Custom Events",
    category: "feature",
    description: "Send an HTTP request and handle it once it resolves, reported back in via sendEvent.",
  },
  {
    id: "sprites",
    label: "Sprites",
    category: "feature",
    description: "Load a spritesheet and render one frame from it — click to step through the sheet.",
  },
  {
    id: "animated-sprites",
    label: "Animated Sprites",
    category: "feature",
    description: "An ANIMATED_SPRITE plays through a named animation on its own — click to pause/resume it.",
  },
  {
    id: "music-controls",
    label: "Music Controls",
    category: "feature",
    description: "Play/pause a looping track and adjust its volume with playMusic/pauseMusic/setMusicVolume.",
  },
  {
    id: "mouse-leave",
    label: "Mouse Leave",
    category: "feature",
    description: "MOUSE_LEAVE fires when the mouse exits the canvas entirely, with a HOVER_OUT alongside it.",
  },
  {
    id: "tab-visibility",
    label: "Tab Visibility",
    category: "feature",
    description: "TAB_BLUR/TAB_FOCUS fire when the browser tab is switched away from/back to — pausing music on blur is the canonical use.",
  },
  {
    id: "palette-swap",
    label: "Palette Swap",
    category: "feature",
    description: "One spritesheet, recolored into several variants with swapColors instead of a separate art asset per color.",
  },
  {
    id: "window-resize",
    label: "Window Resize",
    category: "feature",
    description: "canvas.resize keeps the logical resolution fixed while the display size tracks the window — click a mode to compare none/fit/stretch.",
  },
  {
    id: "fullscreen",
    label: "Fullscreen",
    category: "feature",
    description: "requestFullscreen/exitFullscreen wrap the Fullscreen API on the canvas — click to go fullscreen, Esc (or click again) to leave.",
  },
];

function renderExamplesGrid() {
  const gridByCategory = {
    games: document.getElementById("examplesGamesGrid"),
    feature: document.getElementById("examplesFeatureGrid"),
  };

  // Not every page has the full Examples gallery — the landing page
  // only has #tryItGameTabs below (see renderTryItGameTabs()).
  if (!gridByCategory.games || !gridByCategory.feature) return;

  for (const example of EXAMPLES) {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-3";

    const icon = example.category === "games" ? "bi-joystick" : "bi-puzzle";

    col.innerHTML = `
      <div class="card example-card bg-body-tertiary h-100" tabindex="0" role="button">
        <div class="card-body">
          <div class="example-icon ${example.category}"><i class="bi ${icon}"></i></div>
          <h5 class="card-title">${example.label}</h5>
          <p class="card-text text-body-secondary" style="font-size: 0.9rem">${example.description}</p>
        </div>
      </div>
    `;

    const card = col.querySelector(".example-card");
    card.addEventListener("click", () => openExample(example.id));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openExample(example.id);
      }
    });

    gridByCategory[example.category].appendChild(col);
  }
}

renderExamplesGrid();

// Waits for the playground to be ready (see playgroundReady above),
// then loads the clicked example into it and scrolls it into view —
// the same effect as picking it from #exampleSelect by hand.
async function openExample(id) {
  document.getElementById("exampleSelect").value = id;
  document.getElementById("playground").scrollIntoView({ behavior: "smooth" });

  await playgroundReady;
  await loadProject(id);
}

// The landing page's "Try it live" section (#tryItGameTabs) replaces
// #exampleSelect's dropdown with cards acting as tabs, restricted to
// just the Games examples — the section is meant for playing with a
// full game, not hunting through every small feature snippet (those
// stay on the All Examples page). #exampleSelect itself still exists
// there, as a hidden input rather than a real <select> — loadProject()
// and its callers don't need to know the difference.
function renderTryItGameTabs() {
  const container = document.getElementById("tryItGameTabs");
  if (!container) return; // examples.html keeps the plain dropdown instead

  const games = EXAMPLES.filter((example) => example.category === "games");

  for (const example of games) {
    const col = document.createElement("div");
    col.className = "col-6 col-lg-3";

    col.innerHTML = `
      <div class="card example-card game-tab-card bg-body-tertiary h-100" tabindex="0" role="button" data-id="${example.id}">
        <div class="card-body">
          <div class="example-icon games"><i class="bi bi-joystick"></i></div>
          <h5 class="card-title">${example.label}</h5>
          <p class="card-text text-body-secondary" style="font-size: 0.85rem">${example.description}</p>
        </div>
      </div>
    `;

    const card = col.querySelector(".game-tab-card");
    card.addEventListener("click", () => selectTryItGame(example.id));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectTryItGame(example.id);
      }
    });

    container.appendChild(col);
  }

  updateActiveGameTab(document.getElementById("exampleSelect").value);
}

renderTryItGameTabs();

// Same load as openExample() above, minus the scroll (the tabs are
// already right next to the playground), plus updating which tab
// shows as active.
async function selectTryItGame(id) {
  document.getElementById("exampleSelect").value = id;
  updateActiveGameTab(id);

  await playgroundReady;
  await loadProject(id);
}

function updateActiveGameTab(id) {
  const container = document.getElementById("tryItGameTabs");
  if (!container) return;

  for (const card of container.querySelectorAll(".game-tab-card")) {
    card.classList.toggle("active", card.dataset.id === id);
  }
}

// Drag the handle below the editor to resize it vertically — Monaco's
// automaticLayout (set below) picks up the container's new height on
// its own, so there's nothing to tell the editor about the resize.
(function setupVerticalResize() {
  const shell = document.getElementById("playgroundShell");
  const handle = document.getElementById("resizeHandle");
  const MIN_HEIGHT = 200;
  const MAX_HEIGHT = 1600;

  let startY = 0;
  let startHeight = 0;

  function onPointerMove(event) {
    const height = startHeight + (event.clientY - startY);
    shell.style.height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, height)) + "px";
  }

  function onPointerUp() {
    handle.classList.remove("dragging");
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  }

  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    startY = event.clientY;
    startHeight = shell.getBoundingClientRect().height;
    handle.classList.add("dragging");
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  });
})();

// Uploaded assets — session-only object URLs for images/audio the user
// drops in via the Assets panel, so a resources[id].src (or sounds/music
// src) can point at real art without it being committed to examples/
// resources/ or hosted anywhere. Kept as plain blob URLs rather than
// persisted (e.g. IndexedDB) on purpose — this is a scratch playground,
// not a project manager, and a blob URL already lives for as long as the
// page itself does, i.e. the whole time the playground is actually open.
let uploadedAssets = []; // { name, url }

function onAssetFilesSelected(fileList) {
  for (const file of fileList) {
    const url = URL.createObjectURL(file);
    uploadedAssets = uploadedAssets.filter((asset) => asset.name !== file.name);
    uploadedAssets.push({ name: file.name, url });
  }

  renderAssetsPanel();
}

function copyAssetUrl(url, button) {
  navigator.clipboard.writeText(url).then(() => {
    const original = button.textContent;
    button.textContent = "Copied!";
    setTimeout(() => (button.textContent = original), 1200);
  });
}

function renderAssetsPanel() {
  const list = document.getElementById("assetsList");
  list.innerHTML = "";

  for (const asset of uploadedAssets) {
    const item = document.createElement("div");
    item.className = "asset-item";
    item.innerHTML = `
      <span class="ts-badge" style="background: #6f42c1">A</span>
      <span class="asset-name" title="${asset.name}">${asset.name}</span>
      <button type="button" class="btn btn-sm btn-outline-light asset-copy">Copy path</button>
    `;
    item.querySelector(".asset-copy").onclick = (event) => copyAssetUrl(asset.url, event.target);
    list.appendChild(item);
  }
}

(function setupAssetsPanel() {
  const button = document.getElementById("uploadAssetButton");
  const input = document.getElementById("assetFileInput");

  button.addEventListener("click", () => input.click());
  input.addEventListener("change", (event) => {
    onAssetFilesSelected(event.target.files);
    input.value = ""; // lets re-selecting the same file fire "change" again
  });
})();

require.config({
  paths: { vs: "https://unpkg.com/monaco-editor@0.30.1/min/vs" },
});

require(["vs/editor/editor.main"], async function () {
  // yuuna.d.ts is generated from src/engine/types.ts, and
  // manifest.json from examples/'s actual folder structure, both by
  // scripts/generate-playground-assets.mjs (see package.json's
  // `build`/`watch` scripts) — fetched instead of hardcoded so the
  // playground's autocomplete and file explorer never drift from
  // the real engine types / what's actually in examples/.
  const [yuunasContext, loadedManifest] = await Promise.all([
    fetch("./yuuna.d.ts").then((res) => res.text()),
    fetch("./examples/manifest.json").then((res) => res.json()),
  ]);

  manifest = loadedManifest;

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    yuunasContext,
    "inmemory://model/yuunasContext.d.ts"
  );

  // Needed so a multi-file example's `import { GameState } from
  // "./state"` actually resolves between its files' models instead
  // of erroring — only overrides the two options that matter for
  // that, leaving Monaco's other TypeScript defaults alone.
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  });

  window.editor = monaco.editor.create(document.getElementById("editorContainer"), {
    language: "typescript",
    theme: "vs-dark",
    automaticLayout: true,
  });

  await loadProject(document.getElementById("exampleSelect").value);
  resolvePlaygroundReady();
});

// Fetches every file belonging to a project (a single-file game is
// just a one-file project) and gives each its own Monaco model on a
// stable file:///<project>/<file> URI — real enough that the
// TypeScript language service resolves the "./state"-style imports
// between them the same way it would across real files on disk —
// then shows the file explorer + tabs for it.
async function loadProject(id) {
  const project = manifest.examples.find((example) => example.id === id);

  if (project === undefined) {
    console.error(`No example registered with id "${id}"`);
    return;
  }

  for (const file of Object.keys(models)) {
    models[file].dispose();
  }
  models = {};

  for (const file of project.files) {
    const source = await fetch(`./examples/${id}/${file}`).then((res) => res.text());
    const model = monaco.editor.createModel(source, "typescript", monaco.Uri.file(`/${id}/${file}`));

    model.onDidChangeContent(() => {
      if (!autoReload) {
        setAutoReloadButtonState(true);
        return;
      }

      updatePreview();
    });

    models[file] = model;
  }

  currentProject = project;
  openTabs = [project.entry];
  activeFile = project.entry;
  window.editor.setModel(models[activeFile]);

  renderExplorer();
  updatePreview();
}

// Switches which file the editor is showing — opens it as a new tab
// the first time, same as clicking a file in VS Code's Explorer
function openFile(file) {
  if (!openTabs.includes(file)) {
    openTabs.push(file);
  }

  activeFile = file;
  window.editor.setModel(models[file]);
  renderExplorer();
}

// Closing a tab only changes what's showing — it doesn't remove the
// file from the project, same as closing a tab in real VS Code
function closeTab(file, event) {
  event.stopPropagation();

  openTabs = openTabs.filter((openFile) => openFile !== file);

  if (openTabs.length === 0) {
    openTabs = [currentProject.entry];
  }

  if (activeFile === file) {
    activeFile = openTabs[openTabs.length - 1];
    window.editor.setModel(models[activeFile]);
  }

  renderExplorer();
}

function renderExplorer() {
  // Targets #fileList rather than the whole #fileSidebar — the sidebar
  // also holds the Assets section (see setupAssetsPanel below), which
  // shouldn't be wiped out every time the project's file list re-renders.
  const sidebar = document.getElementById("fileList");
  sidebar.innerHTML = `<div class="folder-label">${currentProject.label.toUpperCase()}</div>`;

  for (const file of currentProject.files) {
    const item = document.createElement("div");
    item.className = "file-item" + (file === activeFile ? " active" : "");
    item.innerHTML = `<span class="ts-badge">TS</span><span>${file}</span>`;
    item.onclick = () => openFile(file);
    sidebar.appendChild(item);
  }

  const tabBar = document.getElementById("tabBar");
  tabBar.innerHTML = "";

  for (const file of openTabs) {
    const tab = document.createElement("div");
    tab.className = "tab" + (file === activeFile ? " active" : "");
    tab.innerHTML = `<span class="ts-badge">TS</span><span>${file}</span><span class="close">×</span>`;
    tab.onclick = () => openFile(file);
    tab.querySelector(".close").onclick = (event) => closeTab(file, event);
    tabBar.appendChild(tab);
  }
}

function setAutoReloadButtonState(state) {
  const button = document.getElementById("autoreload-button");

  if (state) {
    button.classList.remove("btn-dark");
    button.classList.add("btn-primary");
  } else {
    button.classList.add("btn-dark");
    button.classList.remove("btn-primary");
  }
}

// Compiles every file in the current project, strips each one's
// import/export statements, orders them so a file always comes
// after whatever it locally imports (a topological sort over each
// file's own "./x" imports — re-run on every edit, so reordering a
// file's imports re-orders execution instead of needing a
// hardcoded order), and evals the concatenation as one script.
// That's safe specifically because everything ends up sharing one
// scope: a cross-file reference like spawnFood() just becomes an
// ordinary JS variable reference once both files' code is in the
// same eval. Single-file examples go through the exact same path —
// with no imports to strip or order, it's a no-op down to today's
// "compile the one file, eval it" behavior.
async function updatePreview() {
  setAutoReloadButtonState(false);

  if (currentProject === null) {
    return;
  }

  const worker = await monaco.languages.typescript.getTypeScriptWorker();

  const sourceByFile = {};
  const compiledByFile = {};

  for (const file of currentProject.files) {
    const model = models[file];
    sourceByFile[file] = model.getValue();

    const client = await worker(model.uri);
    const result = await client.getEmitOutput(model.uri.toString());
    compiledByFile[file] = result.outputFiles[0]?.text ?? "";
  }

  const order = topoSortFiles(currentProject.files, sourceByFile);
  const script = order.map((file) => stripModuleSyntax(compiledByFile[file])).join("\n\n");

  try {
    eval(script);
  } catch (error) {
    console.error("Error running the compiled code:", error);
  }
}

function topoSortFiles(files, sourceByFile) {
  const baseNameToFile = new Map(files.map((file) => [file.replace(/\.ts$/, ""), file]));
  const visited = new Set();
  const order = [];

  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);

    for (const dep of localImportsOf(sourceByFile[file])) {
      const depFile = baseNameToFile.get(dep);
      if (depFile !== undefined) visit(depFile);
    }

    order.push(file);
  }

  for (const file of files) visit(file);

  return order;
}

// Extracts the "./foo" part of this file's own local imports (import
// specifiers spanning multiple lines included), ignoring imports
// from packages/ambient globals — there's nothing to order those
// against, they're not one of this project's own files
function localImportsOf(source) {
  const importRe = /import\s[^;]*from\s*["']\.\/([\w-]+)["'];?/g;
  const deps = [];
  let match;

  while ((match = importRe.exec(source)) !== null) {
    deps.push(match[1]);
  }

  return deps;
}

function stripModuleSyntax(code) {
  return code
    .replace(/^\s*import\s[^;]*;/gm, "") // dropped — every file shares one scope once concatenated
    .replace(/^export\s+/gm, ""); // top-level declarations just become plain consts/functions
}
