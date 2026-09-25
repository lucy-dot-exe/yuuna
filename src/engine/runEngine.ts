import { exhaust } from "../utils/exhaust";
import { Position } from "../utils/Position";
import { iterateRecord, iterateRecordAsync } from "../utils/iterateRecord";
import { createRecord } from "../utils/createRecord";
import { getKeys } from "../utils/getKeys";
import {
  AnimatedSpriteRenderable,
  CustomGameEvent,
  GameEvent,
  KeyboardState,
  Renderable,
  ResourceConfig,
  RunEngineFunction,
  RunEngineProps,
  STOP,
  keyboardKeys,
} from "./types";

let resetCanvas: (() => void) | null = null;
let latestRunId = 0;

// Shared between drawing TEXT renderables and hit-testing them for
// clicks/hovers, so the clickable area always matches what's on screen.
const DEFAULT_TEXT_FONT_SIZE = 30;
const DEFAULT_TEXT_FONT_FAMILY = "Arial";

// CSS keywords rather than font names — quoting one (`"serif"`) would
// look for a font actually called "serif" instead of the browser's
// default serif font.
const genericFontFamilies = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
]);

// Every other family is quoted, so names with spaces or digits work, and
// followed by Arial as the fallback for one that isn't available.
const textFont = (fontSize: number, fontFamily: string = DEFAULT_TEXT_FONT_FAMILY) => {
  const family = genericFontFamilies.has(fontFamily) ? fontFamily : JSON.stringify(fontFamily);

  return `${fontSize}px ${family}, ${DEFAULT_TEXT_FONT_FAMILY}`;
};

// Renderables with the same layer keep render()'s order — Array#sort is
// stable — so `layer` only needs to move something relative to the rest,
// not say anything about where exactly it lands among equal layers.
const sortByLayer = (renderables: Renderable[]): Renderable[] =>
  [...renderables].sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0));

// A LINE has no `position`, just two endpoints — `from` anchors its scale
// the same way `position` anchors every other renderable's.
const anchorOf = (renderable: Renderable): Position =>
  renderable.type === "LINE" ? renderable.from : renderable.position;

// No RunEngineProps.camera set is the same as one that doesn't pan or zoom.
const DEFAULT_CAMERA = { x: 0, y: 0, zoom: 1 };

// Stands in for a resources[id].src image that fails to load — most
// often because it's a real, not-necessarily-open-source asset that
// (correctly) isn't checked into a public repo, rather than a bug. Drawn
// at the sheet's *declared* size (resources[id].size, not anything read
// off the failed image), so every existing frame/slice/animation still
// lines up exactly as if the real sheet had loaded — nothing about the
// example's own code has to know or care that this happened.
const createPlaceholderSheet = (size: { width: number; height: number }): HTMLCanvasElement => {
  const canvas = window.document.createElement("canvas");
  canvas.width = Math.max(1, size.width);
  canvas.height = Math.max(1, size.height);

  const context = canvas.getContext("2d");

  if (context === null) {
    return canvas;
  }

  // The old "missing texture" magenta/black checkerboard — deliberately
  // eye-catching (rather than, say, a plain gray box) so a placeholder
  // reads as "an asset is missing" at a glance instead of quietly
  // passing for a real, if plain, sprite.
  const cellSize = Math.max(4, Math.min(16, Math.round(Math.min(canvas.width, canvas.height) / 4)));

  for (let y = 0; y < canvas.height; y += cellSize) {
    for (let x = 0; x < canvas.width; x += cellSize) {
      const isEvenCell = (x / cellSize + y / cellSize) % 2 === 0;
      context.fillStyle = isEvenCell ? "#ff00ff" : "#000000";
      context.fillRect(x, y, cellSize, cellSize);
    }
  }

  return canvas;
};

// Used only when a resource declares neither `size` (see settle() below)
// nor actually loads — there's no image to measure and nothing declared
// to fall back to, so there's no way to know the intended dimensions at
// all. An arbitrary, small-but-visible size, purely so the placeholder
// still draws as *something* instead of a 0x0/NaN canvas.
const DEFAULT_PLACEHOLDER_SIZE = { width: 64, height: 64 };

type ResourceEntry = {
  image: CanvasImageSource;
  size: { width: number; height: number };
  slices: { horizontal: number; vertical: number };
  animations: Record<string, { frames: number[]; frameDuration: number; loop: boolean }>;
};

// Loads a single resources[id] entry into a ResourceEntry — shared by the
// startup resources (below) and addResource (returned from runEngine, at
// the bottom of this file) so a resource registered later loads exactly
// the same way, placeholder fallback included.
const loadResource = (value: ResourceConfig): Promise<ResourceEntry> =>
  new Promise<ResourceEntry>((resolve) => {
    const image = new Image();

    // A single, unsliced image (1x1) if unset — only an actual
    // spritesheet needs this declared.
    const slices = value.slices ?? { horizontal: 1, vertical: 1 };

    // sheetSize is the whole loaded sheet's pixel dimensions — value's
    // declared `size` if set, otherwise whatever the image actually
    // measures once it's loaded (or DEFAULT_PLACEHOLDER_SIZE if even
    // that isn't available, i.e. no `size` declared *and* the image
    // failed to load too).
    const settle = (loadedImage: CanvasImageSource, sheetSize: { width: number; height: number }) => {
      resolve({
        image: loadedImage,
        size: {
          width: sheetSize.width / slices.horizontal,
          height: sheetSize.height / slices.vertical,
        },
        slices,
        animations: value.animations ?? {},
      });
    };

    image.src = value.src;
    image.onload = () => settle(image, value.size ?? { width: image.naturalWidth, height: image.naturalHeight });
    // Missing/failed-to-load asset (see .gitignore's dist/resources/
    // note) — a placeholder sheet, sized to match what this resource
    // declared, keeps every frame/slice/animation index the caller
    // already computes valid instead of drawing nothing or throwing.
    image.onerror = () => {
      const placeholderSize = value.size ?? DEFAULT_PLACEHOLDER_SIZE;
      settle(createPlaceholderSheet(placeholderSize), placeholderSize);
    };
  });

export const runEngine: RunEngineFunction = async <State, Custom = never>(
  props: RunEngineProps<State, Custom>
) => {
  const runId = ++latestRunId;

  resetCanvas?.();

  const canvas = window.document.getElementById("yuuna");

  if (canvas === null) {
    throw new Error('No HTML element found with id "yuuna"');
  }

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('No Canvas element found with id "yuuna"');
  }

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Failed to get context from canvas");
  }

  if (props.canvas?.width !== undefined) {
    canvas.width = props.canvas.width;
  }

  if (props.canvas?.height !== undefined) {
    canvas.height = props.canvas.height;
  }

  if (props.canvas?.backgroundColor !== undefined) {
    canvas.style.backgroundColor = props.canvas.backgroundColor;
  }

  // The canvas's *logical* resolution — the fixed space every renderable
  // position, and every mouse/touch coordinate, is expressed in. Captured
  // here, before pixelRatio (below) scales the actual backing buffer past
  // it, so both stay anchored to this regardless of what pixelRatio does.
  const logicalWidth = canvas.width;
  const logicalHeight = canvas.height;

  // Scales the backing buffer beyond logicalWidth/logicalHeight so text
  // and vector shapes (fillText, arc, ...) render crisply on a HiDPI
  // screen — most phones — instead of the same logical-resolution buffer
  // just being stretched larger by applyResize below. `true` follows the
  // display's own devicePixelRatio; a number sets it explicitly; leaving
  // this unset keeps today's 1x behavior. Sprites are unaffected either
  // way — imageSmoothingEnabled stays false below regardless — so pixel
  // art has no reason to turn this on.
  const pixelRatio = props.canvas?.pixelRatio === true ? window.devicePixelRatio || 1 : props.canvas?.pixelRatio ?? 1;

  if (pixelRatio !== 1) {
    // Resizing the backing buffer resets the 2D context's transform (and
    // everything else about its state), so context.scale below has to
    // come after this, not before.
    canvas.width = logicalWidth * pixelRatio;
    canvas.height = logicalHeight * pixelRatio;
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;
    context.scale(pixelRatio, pixelRatio);
  }

  // Make the canvas focusable so keyboard input is scoped to it instead of
  // leaking to the rest of the page (e.g. arrow keys scrolling the window).
  canvas.tabIndex = 0;

  // Stops the browser from treating a drag/pinch on the canvas as page
  // scroll/zoom — backs up the touchstart/touchmove preventDefault calls
  // below for gestures (e.g. a pinch starting on the canvas) preventDefault
  // alone doesn't reliably stop.
  canvas.style.touchAction = "none";

  // Resizes the *display* size only (CSS width/height) — canvas.width/
  // height above stays the fixed logical resolution every renderable's
  // position is already expressed in, so this never needs to touch any
  // of that math. See RunEngineProps.canvas.resize for the mode semantics.
  const applyResize = () => {
    const mode = props.canvas?.resize;

    if (mode === undefined || mode === "none") {
      return;
    }

    if (mode === "stretch") {
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      return;
    }

    const scale = Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height);

    canvas.style.width = `${canvas.width * scale}px`;
    canvas.style.height = `${canvas.height * scale}px`;
  };

  applyResize();
  window.addEventListener("resize", applyResize);

  const requestFullscreen = () => canvas.requestFullscreen();
  // exitFullscreen() rejects with a TypeError if nothing is fullscreen —
  // guarded into a no-op instead, so callers don't need to track that
  // state themselves just to call this safely.
  const exitFullscreen = () =>
    window.document.fullscreenElement === null ? Promise.resolve() : window.document.exitFullscreen();

  let state: State = props.initialState;

  const events: (GameEvent | CustomGameEvent<Custom>)[] = [];

  // Lets a caller report something that happened outside the render loop
  // (e.g. a fetch().then() callback) back into it — the event is queued
  // here and delivered to nextState as a CustomGameEvent on the next tick,
  // the same as any built-in event.
  const sendEvent = (event: Custom) => {
    events.push({ tag: "CUSTOM", event });
  };

  const resources = props.resources ?? {};
  const resourceById = await iterateRecordAsync(resources, ({ value }) => loadResource(value));

  // Registers a resource after startup — loads it exactly like the
  // resources above (loadResource is the same function), then adds it to
  // the same resourceById map every SPRITE/ANIMATED_SPRITE lookup already
  // reads from, so it's usable by `resourceId` as soon as this resolves.
  const addResource = async (id: string, resource: ResourceConfig) => {
    resourceById[id] = await loadResource(resource);
  };

  // Loaded with the FontFace API and registered on document.fonts, which
  // is what makes a family name usable from context.font. Awaiting load()
  // here (instead of letting the browser load it lazily on first use) is
  // what keeps the first frames from drawing — and hit-testing — text in
  // the fallback font. A font that fails to load is never added, so its
  // TEXT falls back to Arial, same as any other unavailable family.
  const loadFont = async (family: string, src: string) => {
    const face = new FontFace(family, `url(${JSON.stringify(src)})`);

    try {
      await face.load();
      window.document.fonts.add(face);
    } catch {}

    return face;
  };

  const fonts = props.fonts ?? {};
  const fontFaceById = await iterateRecordAsync(fonts, ({ key, value }) => loadFont(key, value.src));

  // document.fonts belongs to the page, not to this run — so the fonts
  // this run added are removed again when it ends (see resetCanvas and the
  // abandoned-run check below), instead of every playground re-run adding
  // another copy of the same family.
  const removeFonts = () => {
    for (const face of Object.values(fontFaceById)) {
      window.document.fonts.delete(face);
    }
  };

  const loadAudio = (src: string) =>
    new Promise<HTMLAudioElement>((resolve) => {
      const audio = new Audio(src);

      audio.oncanplaythrough = function () {
        resolve(audio);
      };
      // Missing/failed-to-load audio — resolve anyway instead of hanging
      // this Promise (and every resource after it, via Promise.all)
      // forever waiting for a "canplaythrough" that's never coming.
      // playSound/playMusic below already no-op safely on an element
      // that can't actually play.
      audio.onerror = () => resolve(audio);
    });

  const sounds = props.sounds ?? {};
  const audioById = await iterateRecordAsync(sounds, ({ value }) => loadAudio(value.src));

  // Pitch is implemented as playbackRate with preservesPitch off (which
  // browsers default to on, stretching the sound without changing its
  // pitch) — so pitch and speed change together, like a tape. Clamped to
  // a range every browser actually plays instead of muting/throwing.
  const clampPitch = (pitch: number) => Math.min(4, Math.max(0.25, pitch));

  const applyPitch = (audio: HTMLAudioElement, pitch: number) => {
    audio.preservesPitch = false;
    audio.playbackRate = pitch;
  };

  // Overall sound effect volume — applied when each sound starts rather
  // than tracked per playing instance, since the clones below aren't
  // kept around once playSound returns.
  let soundVolume = 1;

  const clampVolume = (volume: number) => Math.min(1, Math.max(0, volume));

  // Cloning the loaded element per play (instead of reusing it directly)
  // lets the same sound overlap itself — e.g. rapid clicks each get their
  // own playback instead of restarting/cutting off the previous one. It
  // also gives each overlapping copy its own pitch and volume.
  const playSound = (id: string, options?: { pitch?: number; volume?: number }) => {
    const audio = audioById[id];

    if (audio === undefined) {
      return;
    }

    const instance = audio.cloneNode() as HTMLAudioElement;
    applyPitch(instance, clampPitch(options?.pitch ?? 1));
    instance.volume = clampVolume(options?.volume ?? 1) * soundVolume;
    // A missing/failed-to-load sound (see loadAudio's onerror above)
    // rejects here instead of playing — caught and dropped rather than
    // left as an unhandled rejection, same as playMusic/resumeMusic below.
    instance.play().catch(() => {});
  };

  const setSoundVolume = (volume: number) => {
    soundVolume = clampVolume(volume);
  };

  const music = props.music ?? {};
  const musicById = await iterateRecordAsync(music, ({ value }) => loadAudio(value.src));

  // Registered once per track at load time — fires only for a track
  // whose `loop` is false, since a looping <audio> never reaches "ended"
  // (the browser restarts it before the event would fire).
  for (const id of getKeys(musicById)) {
    musicById[id].addEventListener("ended", () => {
      events.push({ tag: "MUSIC_END", id });
    });
  }

  // Unlike sounds, music reuses the same element instead of cloning it —
  // there's only ever one track playing, and reusing it is what lets
  // pauseMusic()/playMusic() resume from where playback left off instead
  // of starting over.
  let currentMusic: HTMLAudioElement | null = null;

  // Volume is a property of each HTMLAudioElement, not global — tracked
  // separately here and (re)applied on every playMusic() so switching
  // tracks keeps the volume the game last set instead of resetting to
  // each element's default of 1.
  let musicVolume = 1;
  // Same reasoning as musicVolume — playbackRate is per-element too.
  let musicPitch = 1;

  const playMusic = (id: string) => {
    const audio = musicById[id];

    if (audio === undefined) {
      return;
    }

    if (currentMusic !== null && currentMusic !== audio) {
      currentMusic.pause();
    }

    audio.loop = music[id]?.loop ?? true;
    audio.volume = musicVolume;
    applyPitch(audio, musicPitch);
    audio.play().catch(() => {});
    currentMusic = audio;
  };

  const pauseMusic = () => {
    currentMusic?.pause();
  };

  const resumeMusic = () => {
    currentMusic?.play().catch(() => {});
  };

  const restartMusic = () => {
    if (currentMusic === null) {
      return;
    }

    currentMusic.currentTime = 0;
    currentMusic.play().catch(() => {});
  };

  const setMusicVolume = (volume: number) => {
    musicVolume = clampVolume(volume);

    if (currentMusic !== null) {
      currentMusic.volume = musicVolume;
    }
  };

  const setMusicPitch = (pitch: number) => {
    musicPitch = clampPitch(pitch);

    if (currentMusic !== null) {
      applyPitch(currentMusic, musicPitch);
    }
  };

  // A newer runEngine() call started while this one was still loading
  // resources (e.g. a spritesheet) — abandon this run instead of setting
  // up a second, orphaned render loop alongside the newer one. The
  // fullscreen functions are no-ops here since this run never gets far
  // enough to own the canvas — the newer run's are the ones that matter.
  if (runId !== latestRunId) {
    removeFonts();

    return {
      sendEvent,
      requestFullscreen: () => Promise.resolve(),
      exitFullscreen: () => Promise.resolve(),
      addResource,
    };
  }

  context.imageSmoothingEnabled = false;

  // An offscreen 1x1 canvas used only to resolve a CSS color string (a
  // name, hex, rgb(), hsl(), ...) into concrete RGBA bytes: paint it that
  // color and read the pixel back. Lets modulateColor() below multiply
  // any two colors together without hand-rolling a CSS color parser.
  const colorSwatchContext = window.document.createElement("canvas").getContext("2d");

  // Color strings are almost always the same literal reused every frame,
  // and getImageData is one of the slower canvas operations — cached so a
  // given color only actually gets resolved once.
  const resolvedColorByString: Record<string, [number, number, number, number]> = {};

  const resolveColor = (color: string): [number, number, number, number] => {
    const cached = resolvedColorByString[color];

    if (cached !== undefined) {
      return cached;
    }

    if (colorSwatchContext === null) {
      return [255, 255, 255, 255];
    }

    colorSwatchContext.clearRect(0, 0, 1, 1);
    colorSwatchContext.fillStyle = color;
    colorSwatchContext.fillRect(0, 0, 1, 1);

    const [r, g, b, a] = colorSwatchContext.getImageData(0, 0, 1, 1).data;
    const resolved: [number, number, number, number] = [r, g, b, a];

    resolvedColorByString[color] = resolved;
    return resolved;
  };

  // Multiplies two colors channel-by-channel, the same way Godot's
  // `modulate` works — e.g. modulating "white" by "#808080" halves
  // brightness, by "#ff0000" keeps only the red channel.
  const modulateColor = (color: string, modulate: string): string => {
    const [r1, g1, b1, a1] = resolveColor(color);
    const [r2, g2, b2, a2] = resolveColor(modulate);

    const mixChannel = (c1: number, c2: number) => (c1 * c2) / 255;

    return `rgba(${mixChannel(r1, r2)}, ${mixChannel(g1, g2)}, ${mixChannel(b1, b2)}, ${mixChannel(a1, a2) / 255})`;
  };

  // Combines a parent's already-composed modulate with a child's own —
  // undefined means "no tint from this side", so it just passes the
  // other one through instead of multiplying against an implicit white.
  const composeModulate = (parent: string | undefined, own: string | undefined): string | undefined => {
    if (parent === undefined) return own;
    if (own === undefined) return parent;
    return modulateColor(parent, own);
  };

  // A parent's accumulated position/scale/modulate/layer, passed down
  // while flattening — see flattenRenderable below.
  type Transform = {
    anchor: Position;
    scale: { x: number; y: number };
    modulate: string | undefined;
    layer: number;
  };

  const IDENTITY_TRANSFORM: Transform = {
    anchor: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    modulate: undefined,
    layer: 0,
  };

  // A child's own position is authored relative to its parent, in the
  // parent's local (unscaled) units — the same way Godot composes
  // Node2D transforms — so it needs both the parent's scale and its
  // accumulated offset applied to land in absolute canvas coordinates.
  const transformPoint = (parent: Transform, localPoint: Position): Position => ({
    x: parent.anchor.x + localPoint.x * parent.scale.x,
    y: parent.anchor.y + localPoint.y * parent.scale.y,
  });

  // Each id's accumulated playback time for its current animation, plus
  // when that was last updated — keyed by id, since an ANIMATED_SPRITE
  // has no state of its own (render() returns brand-new objects every
  // frame). elapsedMs only advances while not paused (see
  // resolveAnimatedSprite), so pausing genuinely stops the clock rather
  // than just freezing which frame gets drawn — unpausing resumes from
  // the same frame instead of skipping ahead by however long it was
  // paused. Accumulating incrementally like this (instead of computing
  // elapsed from an absolute start time every call) is also what makes
  // pausing possible at all, and as a side effect means a `timeScale`
  // that changes over an animation's lifetime scales each tick as it
  // happens rather than retroactively rescaling the whole duration so
  // far. Pruned each renderState() call (see seenAnimationIds there) to
  // only ids actually present that frame, so a game that spawns entities
  // with ever-incrementing ids doesn't leak one entry per entity ever
  // spawned.
  const animationStateById = new Map<string, { animation: string; elapsedMs: number; lastUpdateTime: number }>();
  const seenAnimationIds = new Set<string>();

  // Resolves an ANIMATED_SPRITE down to a plain SPRITE with `frame`
  // computed from how long its current animation has been playing —
  // everything past this point (flattenRenderable's position/scale/
  // modulate/layer composition, hit-testing, drawing) treats the result
  // exactly like any other SPRITE, with no idea ANIMATED_SPRITE exists.
  const resolveAnimatedSprite = (renderable: AnimatedSpriteRenderable): Renderable => {
    seenAnimationIds.add(renderable.id);

    const resource = resourceById[renderable.resourceId];
    const animation = resource.animations[renderable.animation];
    // Composed with RunEngineProps.timeScale (currentTimeScale, set once
    // per tick below) — this renderable's own speed multiplied by
    // whatever the whole game's currently running at, so a global 2x/4x/
    // stop control speeds up (or freezes) every animation right along
    // with the rest of the simulation, not just movement/timers.
    const timeScale = (renderable.timeScale ?? 1) * currentTimeScale;
    const paused = renderable.paused ?? false;

    const now = Date.now();
    const tracked = animationStateById.get(renderable.id);

    // A new id, or the same id switching to a different animation, both
    // start that animation over from frame 0 rather than picking up
    // wherever the previous timer happened to be.
    const previous =
      tracked !== undefined && tracked.animation === renderable.animation
        ? tracked
        : { animation: renderable.animation, elapsedMs: 0, lastUpdateTime: now };

    const elapsedMs = paused
      ? previous.elapsedMs
      : previous.elapsedMs + Math.max(0, now - previous.lastUpdateTime) * timeScale;

    // lastUpdateTime always moves forward, paused or not — otherwise the
    // first tick after unpausing would see a gap stretching back to
    // whenever it was paused, and (dis)count that whole gap as elapsed
    // playback time in one jump.
    animationStateById.set(renderable.id, { animation: renderable.animation, elapsedMs, lastUpdateTime: now });

    const frameCursor = Math.floor(elapsedMs / animation.frameDuration);
    const frameIndex = animation.loop
      ? frameCursor % animation.frames.length
      : Math.min(frameCursor, animation.frames.length - 1);

    return { ...renderable, type: "SPRITE", frame: animation.frames[frameIndex] };
  };

  // Turns a render() tree into the flat list the rest of the engine
  // already knows how to sort/draw/hit-test — each renderable's own
  // position/from/to/scale/modulate/layer replaced by the *effective*
  // (absolute, fully composed with its ancestors') values, and its
  // children peeled off into their own entries in the returned list
  // instead of staying nested. Nothing past this point needs to know
  // parent/child relationships existed at all.
  const flattenRenderable = (renderable: Renderable, parent: Transform): Renderable[] => {
    const resolved = renderable.type === "ANIMATED_SPRITE" ? resolveAnimatedSprite(renderable) : renderable;

    const localScale = resolved.scale ?? { x: 1, y: 1 };
    const scale = { x: parent.scale.x * localScale.x, y: parent.scale.y * localScale.y };
    const modulate = composeModulate(parent.modulate, resolved.modulate);
    const layer = parent.layer + (resolved.layer ?? 0);

    const effective: Renderable =
      resolved.type === "LINE"
        ? {
            ...resolved,
            from: transformPoint(parent, resolved.from),
            to: transformPoint(parent, resolved.to),
            scale,
            modulate,
            layer,
            children: undefined,
          }
        : {
            ...resolved,
            position: transformPoint(parent, resolved.position),
            scale,
            modulate,
            layer,
            children: undefined,
          };

    const childTransform: Transform = { anchor: anchorOf(effective), scale, modulate, layer };
    const children = (resolved.children ?? []).flatMap((child) => flattenRenderable(child, childTransform));

    return [effective, ...children];
  };

  // parent defaults to the identity transform (used for screen-space
  // renderables, and by everything before the camera existed) — callers
  // that need a different root, like renderState's camera below, pass
  // their own.
  const flattenRenderables = (renderables: Renderable[], parent: Transform = IDENTITY_TRANSFORM): Renderable[] =>
    renderables.flatMap((renderable) => flattenRenderable(renderable, parent));

  const getFocusedElement = (position: Position, r: Renderable): boolean => {
    const isNonInteractable =
      r.type === "LINE" ||
      r.type === "GROUP" ||
      // Unreachable — flattenRenderable always resolves ANIMATED_SPRITE
      // to a plain SPRITE before hit-testing ever sees one. Listed here
      // (rather than left for exhaust() to catch) so getFocusedElement
      // itself type-checks as exhaustive.
      r.type === "ANIMATED_SPRITE" ||
      ((r.isHoverable === undefined || !r.isHoverable) &&
        (r.isClickable === undefined || !r.isClickable));

    if (isNonInteractable) {
      return false;
    }

    // Scale is applied around the renderable's anchor as a draw-time canvas
    // transform (see applyScale below) rather than by inflating its
    // size — so hit-testing does the inverse instead: bring the mouse
    // position into the renderable's own unscaled coordinate space, then
    // run the exact same math below as if scale were untouched. For
    // CIRCLE this also happens to be the standard "is this point inside
    // this ellipse" test, for free, once it's drawing as one.
    const { x: scaleX, y: scaleY } = r.scale ?? { x: 1, y: 1 };
    const anchor = anchorOf(r);
    const localPosition: Position = {
      x: anchor.x + (position.x - anchor.x) / scaleX,
      y: anchor.y + (position.y - anchor.y) / scaleY,
    };

    if (r.type === "CIRCLE") {
      const delta = {
        x: Math.abs(localPosition.x - r.position.x),
        y: Math.abs(localPosition.y - r.position.y),
      };

      const distance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
      const isHovered = distance < r.radius;
      return isHovered;
    }

    if (r.type === "RECTANGLE") {
      const topLeft = { x: r.position.x, y: r.position.y };
      const bottomRight = {
        x: r.position.x + r.size.width,
        y: r.position.y + r.size.height,
      };

      const isInsideX = localPosition.x > topLeft.x && localPosition.x < bottomRight.x;
      const isInsideY = localPosition.y > topLeft.y && localPosition.y < bottomRight.y;

      const isHovered = isInsideX && isInsideY;
      return isHovered;
    }

    if (r.type === "SPRITE") {
      const topLeft = { x: r.position.x, y: r.position.y };
      const resource = resourceById[r.resourceId];

      const bottomRight = {
        x: r.position.x + resource.size.width,
        y: r.position.y + resource.size.height,
      };

      const isInsideX = localPosition.x > topLeft.x && localPosition.x < bottomRight.x;
      const isInsideY = localPosition.y > topLeft.y && localPosition.y < bottomRight.y;

      const isHovered = isInsideX && isInsideY;

      return isHovered;
    }

    if (r.type === "TEXT") {
      // Text has no explicit size, so its clickable area is derived from
      // measuring it the same way it's drawn (see the TEXT branch in the
      // render loop below) — anchored the same way its `align` positions
      // it relative to `position`.
      const fontSize = r.fontSize ?? DEFAULT_TEXT_FONT_SIZE;
      context.font = textFont(fontSize, r.fontFamily);
      const width = context.measureText(r.text).width;
      const height = fontSize;

      const alignX = r.align?.x ?? "left";
      const left =
        alignX === "center" ? r.position.x - width / 2 : alignX === "right" ? r.position.x - width : r.position.x;

      const alignY = r.align?.y ?? "top";
      const top =
        alignY === "middle" ? r.position.y - height / 2 : alignY === "bottom" ? r.position.y - height : r.position.y;

      const isInsideX = localPosition.x > left && localPosition.x < left + width;
      const isInsideY = localPosition.y > top && localPosition.y < top + height;

      return isInsideX && isInsideY;
    }

    exhaust(r);
  };

  // The camera is just another ancestor transform, exactly like a
  // renderable's own parent — { x, y } is the world position mapped to
  // canvas (0, 0), so it's the anchor transformPoint already expects:
  // screen = (world - camera.position) * zoom.
  const cameraTransformOf = (camera: { x: number; y: number; zoom: number }): Transform => ({
    anchor: { x: -camera.x * camera.zoom, y: -camera.y * camera.zoom },
    scale: { x: camera.zoom, y: camera.zoom },
    modulate: undefined,
    layer: 0,
  });

  // The inverse of cameraTransformOf, for turning a raw canvas position
  // (mouse) into a world position (worldMouse) — see ClickEvent etc.
  const toWorldPosition = (position: Position, camera: { x: number; y: number; zoom: number }): Position => ({
    x: camera.x + position.x / camera.zoom,
    y: camera.y + position.y / camera.zoom,
  });

  // Every call site needs renderables flattened and in draw order — the
  // mousemove/click handlers below to find whichever's topmost under the
  // mouse, the draw loop to actually draw them that way — so both are
  // applied once here instead of separately wherever props.render() gets
  // called. Screen-space renderables skip the camera entirely (flattened
  // from the identity transform, same as before there was a camera);
  // everything else is flattened as if the camera were its shared parent.
  const renderState = (state: State) => {
    const result = props.render(state);
    const camera = props.camera?.(state) ?? DEFAULT_CAMERA;
    const cameraTransform = cameraTransformOf(camera);

    const worldRenderables = result.renderables.filter((r) => !r.screenSpace);
    const screenRenderables = result.renderables.filter((r) => r.screenSpace);

    seenAnimationIds.clear();

    const renderables = sortByLayer([
      ...flattenRenderables(worldRenderables, cameraTransform),
      ...flattenRenderables(screenRenderables),
    ]);

    // Anything not seen this pass is no longer being rendered (e.g. the
    // entity it belonged to died) — drop its tracked start time instead
    // of keeping it forever.
    for (const id of animationStateById.keys()) {
      if (!seenAnimationIds.has(id)) {
        animationStateById.delete(id);
      }
    }

    return { cursor: result.cursor, renderables, camera };
  };

  // ev.offsetX/offsetY are in CSS-rendered pixels, which differ from the
  // canvas's drawing-buffer resolution whenever it's displayed at a
  // different size (e.g. scaled down to fit its container). Renderable
  // positions are all in buffer coordinates, so mouse coordinates need
  // the same conversion to line up.
  const getCanvasPosition = (ev: MouseEvent): Position => {
    return {
      x: (ev.offsetX * logicalWidth) / canvas.clientWidth,
      y: (ev.offsetY * logicalHeight) / canvas.clientHeight,
    };
  };

  // Touch's equivalent of getCanvasPosition — a Touch has no offsetX/Y
  // (that's a MouseEvent-only convenience), so this gets there manually
  // via getBoundingClientRect instead. clientX/Y and the rect are both
  // viewport-relative, so their difference stays correct regardless of
  // page scroll.
  const getTouchPosition = (touch: Touch): Position => {
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((touch.clientX - rect.left) * logicalWidth) / canvas.clientWidth,
      y: ((touch.clientY - rect.top) * logicalHeight) / canvas.clientHeight,
    };
  };

  const updateState = (updateFn: (state: State) => State) => {
    state = updateFn(state);
  };

  const nextStateFns = Array.isArray(props.nextState) ? props.nextState : [props.nextState];

  let lastFrame: number = Date.now();
  // When the next tick is due under RunEngineProps.maxFps — only read
  // or advanced while a cap is set (see the top of the loop below).
  let nextTickAt = 0;
  let hoveredId: string | null = null;

  // How much this tick's simulated time is scaled by (see
  // RunEngineProps.timeScale) — set once per tick, right before that
  // tick's own TIME event delta is computed, and read again later the
  // same tick by resolveAnimatedSprite (below) so a single number
  // governs both game logic and animation playback consistently within
  // one tick rather than each recomputing props.timeScale(state)
  // separately (state may itself have just changed this same tick).
  let currentTimeScale = 1;

  // Shared by the mouse "click"/"contextmenu" listeners and the touch
  // handlers below — firing a CLICK (or RIGHT_CLICK) is the same "is
  // whatever's currently hovered isClickable" check either way; only how
  // `mouse` was determined differs (a real click event vs. a lifted
  // finger), and which button it was.
  const fireClick = (mouse: Position, tag: "CLICK" | "RIGHT_CLICK" = "CLICK") => {
    if (hoveredId === null) return;

    const { renderables, camera } = renderState(state);

    const hovered = renderables.find((e) => e.id === hoveredId);

    if (hovered !== undefined && hovered.isClickable) {
      events.push({ tag, id: hovered.id, mouse, worldMouse: toWorldPosition(mouse, camera) });
    }
  };

  const handleClick = (ev: MouseEvent) => fireClick(getCanvasPosition(ev));

  canvas.addEventListener("click", handleClick);

  // contextmenu rather than mouseup with button 2 — it's the browser's
  // own "secondary click" (Ctrl+click on macOS included), the same way
  // "click" above is its primary one, and it's the event that has to be
  // cancelled to keep the browser's menu from opening anyway.
  const handleContextMenu = (ev: MouseEvent) => {
    if (props.canvas?.disableContextMenu ?? true) {
      ev.preventDefault();
    }

    fireClick(getCanvasPosition(ev), "RIGHT_CLICK");
  };

  canvas.addEventListener("contextmenu", handleContextMenu);

  const initialState: { keyboardState: KeyboardState } = {
    keyboardState: createRecord(keyboardKeys, () => false),
  };

  let previousState: { keyboardState: KeyboardState } = {
    keyboardState: { ...initialState.keyboardState },
  };

  const currentState: { keyboardState: KeyboardState } = {
    keyboardState: { ...initialState.keyboardState },
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const pressedKey = keyboardKeys.find((key) => key === event.code);

    if (pressedKey !== undefined) {
      // Stop tracked keys (arrows, space, ...) from also scrolling the
      // page or triggering other browser defaults while the canvas is
      // focused.
      event.preventDefault();
      currentState.keyboardState[pressedKey] = true;
    }
  };

  canvas.addEventListener("keydown", handleKeyDown);

  const handleKeyUp = (event: KeyboardEvent) => {
    const releasedKey = keyboardKeys.find((key) => key === event.code);

    if (releasedKey !== undefined) {
      event.preventDefault();
      currentState.keyboardState[releasedKey] = false;
    }
  };

  canvas.addEventListener("keyup", handleKeyUp);

  // mouseButton/rightMouseButton state (see NextStateProps.mouseButton)
  // — double-buffers exactly like keyboardState above, one per button.
  let previousMouseButtonState = { isPressed: false };
  const currentMouseButtonState = { isPressed: false };
  let previousRightMouseButtonState = { isPressed: false };
  const currentRightMouseButtonState = { isPressed: false };

  const handleMouseDown = (event: MouseEvent) => {
    // Primary and secondary buttons only — matching CLICK and
    // RIGHT_CLICK respectively. Middle/back/forward stay ignored.
    if (event.button === 0) {
      currentMouseButtonState.isPressed = true;
    } else if (event.button === 2) {
      currentRightMouseButtonState.isPressed = true;
    }
  };

  canvas.addEventListener("mousedown", handleMouseDown);

  const handleMouseUp = (event: MouseEvent) => {
    if (event.button === 0) {
      currentMouseButtonState.isPressed = false;
    } else if (event.button === 2) {
      currentRightMouseButtonState.isPressed = false;
    }
  };

  // On window rather than the canvas — so releasing the button after
  // having dragged off the canvas while still holding it down still
  // clears isPressed, instead of leaving it stuck true forever.
  window.addEventListener("mouseup", handleMouseUp);

  // Shared by mousemove and the touch handlers below — updates hoveredId
  // from a canvas position and fires HOVER_IN/HOVER_OUT as whatever's
  // underneath it changes. Touch has no ambient hover the way a mouse
  // does (nothing is "hovered" until a finger actually touches down), but
  // feeding a touch's position through this the same as the mouse's is
  // what lets an isHoverable renderable react to a tap/drag at all.
  const updateHover = (mouse: Position) => {
    const { renderables, camera } = renderState(state);
    const worldMouse = toWorldPosition(mouse, camera);

    const hovered = [...renderables]
      .reverse()
      .find((r) => getFocusedElement(mouse, r));

    if (hovered !== undefined && hovered.isHoverable) {
      events.push({ tag: "HOVER_IN", id: hovered.id, mouse, worldMouse });
    }

    if (hoveredId !== null) {
      const lastHovered = renderables.find((r) => r.id === hoveredId);

      if (lastHovered !== undefined && lastHovered.id !== hovered?.id) {
        events.push({ tag: "HOVER_OUT", id: lastHovered.id, mouse, worldMouse });
      }
    }

    hoveredId = hovered === undefined ? null : hovered.id ?? null;
  };

  const handleMouseMoveHover = (ev: MouseEvent) => updateHover(getCanvasPosition(ev));

  canvas.addEventListener("mousemove", handleMouseMoveHover);

  const updateTracking = (mouse: Position) => {
    if (hoveredId === null) {
      return;
    }

    const { renderables, camera } = renderState(state);

    const hovered = renderables.find((r) => r.id === hoveredId);

    if (hovered !== undefined && hovered.trackMouseMovement) {
      events.push({ tag: "MOUSE_MOVE", mouse, worldMouse: toWorldPosition(mouse, camera), id: hovered.id });
    }
  };

  const handleMouseMoveTracking = (ev: MouseEvent) => updateTracking(getCanvasPosition(ev));

  canvas.addEventListener("mousemove", handleMouseMoveTracking);

  // No further mousemove fires once the mouse is off the canvas, so this
  // is also the only chance to report a HOVER_OUT for whatever was
  // hovered when it left — otherwise that hover would just dangle,
  // never explicitly ended.
  // Shared by mouseleave and the touch handlers below — clears whatever's
  // hovered (firing HOVER_OUT for it) without a HOVER_IN taking its
  // place. Returns worldMouse so callers that need it (MOUSE_LEAVE below)
  // don't have to call renderState() a second time just to get it.
  const clearHover = (mouse: Position) => {
    const { renderables, camera } = renderState(state);
    const worldMouse = toWorldPosition(mouse, camera);

    if (hoveredId !== null) {
      const lastHovered = renderables.find((r) => r.id === hoveredId);

      if (lastHovered !== undefined) {
        events.push({ tag: "HOVER_OUT", id: lastHovered.id, mouse, worldMouse });
      }
    }

    hoveredId = null;
    return worldMouse;
  };

  const handleMouseLeave = (ev: MouseEvent) => {
    const mouse = getCanvasPosition(ev);
    const worldMouse = clearHover(mouse);

    events.push({ tag: "MOUSE_LEAVE", mouse, worldMouse });
  };

  canvas.addEventListener("mouseleave", handleMouseLeave);

  // Translates touch into the same HOVER_IN/HOVER_OUT/MOUSE_MOVE/CLICK
  // events mouse input already produces (via updateHover/updateTracking/
  // fireClick/clearHover above), so existing game code written against
  // those events works on a touchscreen with no changes of its own.
  // Single-touch only — touches[0]/changedTouches[0] — the same "one
  // active pointer" model mouse input already assumes; a second finger is
  // ignored rather than tracked as its own pointer.
  //
  // preventDefault on start/move keeps a drag/tap on the canvas from also
  // scrolling, pinch-zooming, or triggering pull-to-refresh — the browser
  // gestures a touchscreen normally reserves that space for; { passive:
  // false } is what makes preventDefault actually take effect here.
  const handleTouchStart = (ev: TouchEvent) => {
    ev.preventDefault();

    const touch = ev.touches[0];
    if (touch === undefined) return;

    currentMouseButtonState.isPressed = true;

    const mouse = getTouchPosition(touch);
    updateHover(mouse);
    updateTracking(mouse);
  };

  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });

  const handleTouchMove = (ev: TouchEvent) => {
    ev.preventDefault();

    const touch = ev.touches[0];
    if (touch === undefined) return;

    const mouse = getTouchPosition(touch);
    updateHover(mouse);
    updateTracking(mouse);
  };

  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

  // A lifted finger both releases (mirroring mouseup) and clicks
  // (mirroring the browser's own click-after-mouseup) — touch has no
  // separate "up" and "click" events of its own the way mouse does, so
  // both happen here together, in that order. hover is updated once more
  // first so a plain tap (touchstart immediately followed by touchend,
  // with no touchmove between them to have already done this) still
  // fires CLICK against whatever's actually under it; hover is then
  // cleared, since nothing's left touching it once the finger lifts.
  const handleTouchEnd = (ev: TouchEvent) => {
    ev.preventDefault();

    currentMouseButtonState.isPressed = false;

    const touch = ev.changedTouches[0];
    if (touch === undefined) return;

    const mouse = getTouchPosition(touch);
    updateHover(mouse);
    fireClick(mouse);
    clearHover(mouse);
  };

  canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

  // A cancelled touch (e.g. an incoming call interrupting the page, or
  // the OS deciding it's a system gesture instead) never fires touchend —
  // handled the same as lifting the finger, minus the click, since
  // there's no tap to speak of once the touch itself has been cancelled.
  const handleTouchCancel = (ev: TouchEvent) => {
    currentMouseButtonState.isPressed = false;

    const touch = ev.changedTouches[0];
    if (touch === undefined) return;

    clearHover(getTouchPosition(touch));
  };

  canvas.addEventListener("touchcancel", handleTouchCancel, { passive: false });

  // Tab switches are a document-level concern (visibilitychange), not
  // something that ever reaches the canvas itself the way mouse/keyboard
  // events do.
  const handleVisibilityChange = () => {
    events.push({ tag: window.document.hidden ? "TAB_BLUR" : "TAB_FOCUS" });
  };

  window.document.addEventListener("visibilitychange", handleVisibilityChange);

  // Fullscreen is a document-level concern too, and fires for every way
  // fullscreen can change — the requestFullscreen()/exitFullscreen()
  // above, but also things neither of those causes directly, like the
  // user pressing Esc. Re-running applyResize() here (rather than relying
  // solely on the "resize" listener) covers browsers that don't also fire
  // a window resize when fullscreen is toggled.
  const handleFullscreenChange = () => {
    events.push({ tag: "FULLSCREEN_CHANGE", isFullscreen: window.document.fullscreenElement === canvas });
    applyResize();
  };

  window.document.addEventListener("fullscreenchange", handleFullscreenChange);

  context.imageSmoothingEnabled = false;

  // Scale is a canvas transform around the renderable's anchor, applied
  // before its type-specific drawing runs below — everything drawn under
  // it (fills, strokes, images, even font size) comes out scaled without
  // each renderable type needing its own size math, and a CIRCLE drawn
  // under a non-uniform scale comes out an ellipse for free.
  const applyScale = (renderable: Renderable) => {
    const { x: scaleX, y: scaleY } = renderable.scale ?? { x: 1, y: 1 };

    if (scaleX === 1 && scaleY === 1) {
      return;
    }

    const anchor = anchorOf(renderable);
    context.translate(anchor.x, anchor.y);
    context.scale(scaleX, scaleY);
    context.translate(-anchor.x, -anchor.y);
  };

  // Reused across every tinted SPRITE draw this run, instead of allocating
  // a fresh offscreen canvas per sprite per frame — see tintedSpriteFrame.
  const tintBuffer = window.document.createElement("canvas");
  const tintBufferContext = tintBuffer.getContext("2d");

  // Renders one frame of a spritesheet, tinted by `modulate`, onto the
  // shared offscreen buffer and returns it ready to draw — multiply-
  // blending a filled rectangle over the frame would also color its
  // fully-transparent pixels, so this clips that back down to the
  // frame's own shape afterward with `destination-in`.
  //
  // This has to happen on an *isolated* buffer rather than directly on
  // the main canvas: destination-in isn't scoped to this draw call's own
  // area, it's a whole-buffer operation that erases anything the new
  // draw doesn't cover. Doing it on the main canvas would erase whatever
  // was already drawn underneath the sprite's transparent pixels (e.g.
  // terrain showing through the gaps in a character) instead of leaving
  // it alone. The buffer starts out empty, so there's nothing under it
  // to lose — only the finished, correctly-masked result ever reaches
  // the main canvas, via a normal (source-over) drawImage.
  const tintedSpriteFrame = (
    image: CanvasImageSource,
    source: { x: number; y: number; width: number; height: number },
    modulate: string
  ): CanvasImageSource => {
    if (tintBufferContext === null) {
      return image;
    }

    tintBuffer.width = source.width;
    tintBuffer.height = source.height;

    tintBufferContext.drawImage(
      image,
      source.x,
      source.y,
      source.width,
      source.height,
      0,
      0,
      source.width,
      source.height
    );

    tintBufferContext.globalCompositeOperation = "multiply";
    tintBufferContext.fillStyle = modulate;
    tintBufferContext.fillRect(0, 0, source.width, source.height);

    tintBufferContext.globalCompositeOperation = "destination-in";
    tintBufferContext.drawImage(
      image,
      source.x,
      source.y,
      source.width,
      source.height,
      0,
      0,
      source.width,
      source.height
    );
    tintBufferContext.globalCompositeOperation = "source-over";

    return tintBuffer;
  };

  // Palette-swapped frames, keyed by resourceId + frame + the exact swap
  // list — unlike tintedSpriteFrame's cheap multiply-blend (redone fresh
  // every draw off one shared buffer), a swap needs real pixel work
  // (getImageData over the whole frame), so each unique combination is
  // computed once here and reused on every later draw instead. Grows for
  // as long as new combinations keep showing up — fine for a fixed small
  // set of recolors (e.g. team A/B/C), a bad fit for one that varies
  // continuously (e.g. a randomized hue per instance), which would cache-
  // miss every time and just accumulate.
  const swappedFrameCache = new Map<string, HTMLCanvasElement>();

  const swappedSpriteFrame = (
    resourceId: string,
    frame: number,
    image: CanvasImageSource,
    source: { x: number; y: number; width: number; height: number },
    swapColors: { from: string; to: string }[]
  ): CanvasImageSource => {
    const cacheKey = `${resourceId}:${frame}:${swapColors.map(({ from, to }) => `${from}>${to}`).join(",")}`;
    const cached = swappedFrameCache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const canvas = window.document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;

    const swapContext = canvas.getContext("2d");

    // No 2d context to work with (shouldn't happen in a real browser) —
    // draw the untouched frame rather than crash.
    if (swapContext === null) {
      return image;
    }

    swapContext.drawImage(
      image,
      source.x,
      source.y,
      source.width,
      source.height,
      0,
      0,
      source.width,
      source.height
    );

    // Resolved once per unique `from`/`to` pair (resolveColor caches by
    // string), not per pixel — the pixel loop below only ever compares
    // against these already-resolved bytes.
    const resolvedSwaps = swapColors.map(({ from, to }) => ({
      from: resolveColor(from),
      to: resolveColor(to),
    }));

    const imageData = swapContext.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      for (const { from, to } of resolvedSwaps) {
        if (pixels[i] === from[0] && pixels[i + 1] === from[1] && pixels[i + 2] === from[2] && pixels[i + 3] === from[3]) {
          pixels[i] = to[0];
          pixels[i + 1] = to[1];
          pixels[i + 2] = to[2];
          pixels[i + 3] = to[3];
          break;
        }
      }
    }

    swapContext.putImageData(imageData, 0, 0);
    swappedFrameCache.set(cacheKey, canvas);
    return canvas;
  };

  const intervalId = setInterval(() => {
    const now = Date.now();
    const rawDelta = now - lastFrame;

    // Skipped rather than delayed (see RunEngineProps.maxFps) — returning
    // before anything else runs leaves `events`, keyboard/mouse state and
    // lastFrame all untouched, so whatever happened in the meantime is
    // still delivered by the next tick that does run, and its TIME delta
    // covers this skipped one too.
    const maxFps = props.maxFps?.(state);
    if (maxFps !== undefined && maxFps > 0) {
      if (now < nextTickAt) {
        return;
      }

      // Scheduled from the previous target rather than from `now`: the
      // interval only fires every ~4ms, so "at least 1000/maxFps since
      // the last tick" would always round late (a 60 cap landing on
      // 20ms ticks, i.e. 50 FPS), while this lets the early and late
      // ticks average out to the cap itself. Falling more than a whole
      // interval behind (a hitch, a backgrounded tab, the cap having
      // just been turned on) restarts the schedule from now instead of
      // bursting through every missed tick to catch up.
      const interval = 1000 / maxFps;
      nextTickAt = now - nextTickAt > interval ? now + interval : nextTickAt + interval;
    }

    // Read from state as this tick starts (i.e. still last tick's own
    // result) — resolveAnimatedSprite (below, during this same tick's
    // render pass) reads this same currentTimeScale rather than calling
    // props.timeScale itself, so a single value governs both the TIME
    // event about to fire and every animation's playback consistently.
    currentTimeScale = props.timeScale?.(state) ?? 1;
    const delta = rawDelta * currentTimeScale;

    events.push({ tag: "TIME", delta: delta });

    for (const event of events) {
      const keyboard = iterateRecord(
        previousState.keyboardState,
        ({ key, value: previouslyPressed }) => {
          const isPressed = currentState.keyboardState[key];

          return {
            isPressed,
            isJustPressed: isPressed && !previouslyPressed,
            isJustReleased: !isPressed && previouslyPressed,
          };
        }
      );

      const mouseButton = {
        isPressed: currentMouseButtonState.isPressed,
        isJustPressed: currentMouseButtonState.isPressed && !previousMouseButtonState.isPressed,
        isJustReleased: !currentMouseButtonState.isPressed && previousMouseButtonState.isPressed,
      };

      const rightMouseButton = {
        isPressed: currentRightMouseButtonState.isPressed,
        isJustPressed: currentRightMouseButtonState.isPressed && !previousRightMouseButtonState.isPressed,
        isJustReleased: !currentRightMouseButtonState.isPressed && previousRightMouseButtonState.isPressed,
      };

      for (const nextState of nextStateFns) {
        const result = nextState({
          state,
          event,
          keyboard,
          mouseButton,
          rightMouseButton,
          playSound,
          setSoundVolume,
          playMusic,
          pauseMusic,
          resumeMusic,
          restartMusic,
          setMusicVolume,
          setMusicPitch,
        });

        // STOP stops the rest of the list from running for this event,
        // instead of every later mechanic needing to repeat the same
        // guard. undefined just means this mechanic made no change, so
        // the rest of the list still runs.
        if (result === STOP) {
          break;
        }

        if (result !== undefined) {
          updateState(() => result);
        }
      }
    }

    events.splice(0, events.length);

    context.clearRect(0, 0, logicalWidth, logicalHeight);

    const { cursor, renderables } = renderState(state);

    canvas.style.cursor = cursor ?? "default";

    for (const renderable of renderables) {
      context.save();
      applyScale(renderable);

      if (renderable.type === "RECTANGLE") {
        context.fillStyle =
          renderable.modulate === undefined ? renderable.color : modulateColor(renderable.color, renderable.modulate);

        context.fillRect(
          renderable.position.x,
          renderable.position.y,
          renderable.size.width,
          renderable.size.height
        );

        context.restore();
        continue;
      }

      if (renderable.type === "CIRCLE") {
        context.fillStyle =
          renderable.modulate === undefined ? renderable.color : modulateColor(renderable.color, renderable.modulate);

        context.beginPath();
        context.arc(
          renderable.position.x,
          renderable.position.y,
          renderable.radius,
          0,
          2 * Math.PI
        );
        context.fill();

        context.restore();
        continue;
      }

      if (renderable.type === "TEXT") {
        const {
          color,
          position: { x, y },
          text,
          align,
          fontSize,
          fontFamily,
          modulate,
        } = renderable;
        context.fillStyle = modulate === undefined ? color : modulateColor(color, modulate);

        context.font = textFont(fontSize ?? DEFAULT_TEXT_FONT_SIZE, fontFamily);
        context.textAlign = align?.x ?? "left";
        context.textBaseline = align?.y ?? "top";
        context.fillText(text, x, y);

        context.restore();
        continue;
      }

      if (renderable.type === "SPRITE") {
        const { opacity = 1, flipX = false, frame: frameIndex = 0, modulate, swapColors } = renderable;
        const resource = resourceById[renderable.resourceId];

        const frame = {
          x: frameIndex % resource.slices.horizontal,
          y: Math.floor(frameIndex / resource.slices.horizontal) % resource.slices.vertical,
        };

        const source = {
          x: frame.x * resource.size.width,
          y: frame.y * resource.size.height,
          width: resource.size.width,
          height: resource.size.height,
        };

        const destWidth = resource.size.width;
        const destHeight = resource.size.height;

        // Swapping and tinting each swap in an already-processed offscreen
        // copy of this frame as the image to draw from then on —
        // everything past this point (flipX, positioning) treats it
        // exactly like the untinted spritesheet, just drawn starting at
        // (0, 0) instead of cropped from a sheet. Swap runs first (it's
        // the sprite's "real" recolored identity), tint runs on top of
        // that (e.g. a damage flash still applies over swapped colors).
        let image: CanvasImageSource = resource.image;
        let imageSource = source;

        if (swapColors !== undefined && swapColors.length > 0) {
          image = swappedSpriteFrame(renderable.resourceId, frameIndex, image, imageSource, swapColors);
          imageSource = { x: 0, y: 0, width: source.width, height: source.height };
        }

        if (modulate !== undefined) {
          image = tintedSpriteFrame(image, imageSource, modulate);
          imageSource = { x: 0, y: 0, width: source.width, height: source.height };
        }

        context.globalAlpha = opacity;

        const drawSprite = (destX: number, destY: number) => {
          context.drawImage(
            image,
            imageSource.x,
            imageSource.y,
            imageSource.width,
            imageSource.height,
            destX,
            destY,
            destWidth,
            destHeight
          );
        };

        if (flipX) {
          context.save();
          context.translate(renderable.position.x + destWidth, renderable.position.y);
          context.scale(-1, 1);

          drawSprite(0, 0);

          context.restore();
        } else {
          drawSprite(renderable.position.x, renderable.position.y);
        }

        context.globalAlpha = 1;

        context.restore();
        continue;
      }

      if (renderable.type === "LINE") {
        context.strokeStyle =
          renderable.modulate === undefined ? renderable.color : modulateColor(renderable.color, renderable.modulate);
        context.lineWidth = renderable.width ?? 2;

        context.beginPath();
        context.moveTo(renderable.from.x, renderable.from.y);
        context.lineTo(renderable.to.x, renderable.to.y);
        context.stroke();

        context.restore();
        continue;
      }

      if (renderable.type === "GROUP") {
        // Draws nothing itself — it only exists to give its children
        // (already peeled off into their own entries by flattenRenderables)
        // something to be positioned/scaled/tinted relative to.
        context.restore();
        continue;
      }

      if (renderable.type === "ANIMATED_SPRITE") {
        // Unreachable — flattenRenderable always resolves ANIMATED_SPRITE
        // to a plain SPRITE before it gets here. A real error (not a
        // silent skip) if it's somehow still one, since that would mean
        // an actual engine bug rather than anything a game author did.
        throw new Error("ANIMATED_SPRITE reached the draw loop unresolved — this is an engine bug");
      }

      exhaust(renderable);
    }

    lastFrame = now;
    previousState.keyboardState = { ...currentState.keyboardState };
    previousMouseButtonState = { ...currentMouseButtonState };
    previousRightMouseButtonState = { ...currentRightMouseButtonState };
  }, 0);

  resetCanvas = () => {
    clearInterval(intervalId);

    // Otherwise a track started by this run keeps playing underneath
    // whatever the next runEngine() call starts — currentMusic is a
    // per-run element, not something the next run has any way to reach.
    currentMusic?.pause();
    currentMusic = null;

    removeFonts();

    // The canvas element itself is only thrown away between runs if the
    // caller replaces it — in the playground it's the same persistent
    // <canvas id="yuuna"> across every example switch and every
    // Auto-Reload keystroke, so its listeners have to be removed
    // explicitly here too, or each run stacks its own click/mousemove/
    // keyboard handlers on top of every previous run's. Those old
    // handlers still fire (each still does its own hit-testing and
    // renderState() call against its own now-frozen state) even though
    // their interval is long since cleared, quietly costing more CPU per
    // click/mousemove the more times a run's been replaced — and on a
    // slow enough device or long enough playground session, that pile-up
    // is what "clicks stop working" actually looks like.
    canvas.removeEventListener("click", handleClick);
    canvas.removeEventListener("contextmenu", handleContextMenu);
    canvas.removeEventListener("keydown", handleKeyDown);
    canvas.removeEventListener("keyup", handleKeyUp);
    canvas.removeEventListener("mousedown", handleMouseDown);
    canvas.removeEventListener("mousemove", handleMouseMoveHover);
    canvas.removeEventListener("mousemove", handleMouseMoveTracking);
    canvas.removeEventListener("mouseleave", handleMouseLeave);
    canvas.removeEventListener("touchstart", handleTouchStart);
    canvas.removeEventListener("touchmove", handleTouchMove);
    canvas.removeEventListener("touchend", handleTouchEnd);
    canvas.removeEventListener("touchcancel", handleTouchCancel);
    // On window, not the canvas — see where it's added above for why.
    window.removeEventListener("mouseup", handleMouseUp);

    // This one's on `document`, not the canvas — same reasoning as above,
    // just doubly true since `document` isn't even scoped to this canvas.
    window.document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.document.removeEventListener("fullscreenchange", handleFullscreenChange);

    // Same pile-up risk as the canvas listeners above, but on `window`.
    window.removeEventListener("resize", applyResize);
  };

  return { sendEvent, requestFullscreen, exitFullscreen, addResource };
};
