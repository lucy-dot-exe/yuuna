import { exhaust } from "../utils/exhaust";
import { Position } from "../utils/Position";
import { iterateRecord, iterateRecordAsync } from "../utils/iterateRecord";
import { createRecord } from "../utils/createRecord";
import {
  GameEvent,
  KeyboardState,
  Renderable,
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
const textFont = (fontSize: number) => `${fontSize}px Arial`;

// Renderables with the same layer keep render()'s order — Array#sort is
// stable — so `layer` only needs to move something relative to the rest,
// not say anything about where exactly it lands among equal layers.
const sortByLayer = (renderables: Renderable[]): Renderable[] =>
  [...renderables].sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0));

// A LINE has no `position`, just two endpoints — `from` anchors its scale
// the same way `position` anchors every other renderable's.
const anchorOf = (renderable: Renderable): Position =>
  renderable.type === "LINE" ? renderable.from : renderable.position;

export const runEngine: RunEngineFunction = async <State>(
  props: RunEngineProps<State>
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

  // Make the canvas focusable so keyboard input is scoped to it instead of
  // leaking to the rest of the page (e.g. arrow keys scrolling the window).
  canvas.tabIndex = 0;

  let state: State = props.initialState;

  const resources = props.resources ?? {};
  const resourceById = await iterateRecordAsync(
    resources,
    async ({ value }) =>
      new Promise<{
        image: HTMLImageElement;
        size: { width: number; height: number };
        slices: { horizontal: number; vertical: number };
      }>((resolve) => {
        const image = new Image();

        image.src = value.src;

        image.onload = function () {
          resolve({
            image,
            size: {
              width: value.size.width / value.slices.horizontal,
              height: value.size.height / value.slices.vertical,
            },
            slices: value.slices,
          });
        };
      })
  );

  const loadAudio = (src: string) =>
    new Promise<HTMLAudioElement>((resolve) => {
      const audio = new Audio(src);

      audio.oncanplaythrough = function () {
        resolve(audio);
      };
    });

  const sounds = props.sounds ?? {};
  const audioById = await iterateRecordAsync(sounds, ({ value }) => loadAudio(value.src));

  // Cloning the loaded element per play (instead of reusing it directly)
  // lets the same sound overlap itself — e.g. rapid clicks each get their
  // own playback instead of restarting/cutting off the previous one.
  const playSound = (id: string) => {
    const audio = audioById[id];

    if (audio === undefined) {
      return;
    }

    const instance = audio.cloneNode() as HTMLAudioElement;
    instance.play();
  };

  const music = props.music ?? {};
  const musicById = await iterateRecordAsync(music, ({ value }) => loadAudio(value.src));

  // Unlike sounds, music reuses the same element instead of cloning it —
  // there's only ever one track playing, and reusing it is what lets
  // pauseMusic()/playMusic() resume from where playback left off instead
  // of starting over.
  let currentMusic: HTMLAudioElement | null = null;

  const playMusic = (id: string) => {
    const audio = musicById[id];

    if (audio === undefined) {
      return;
    }

    if (currentMusic !== null && currentMusic !== audio) {
      currentMusic.pause();
    }

    audio.loop = true;
    audio.play();
    currentMusic = audio;
  };

  const pauseMusic = () => {
    currentMusic?.pause();
  };

  // A newer runEngine() call started while this one was still loading
  // resources (e.g. a spritesheet) — abandon this run instead of setting
  // up a second, orphaned render loop alongside the newer one.
  if (runId !== latestRunId) {
    return;
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

  // Turns a render() tree into the flat list the rest of the engine
  // already knows how to sort/draw/hit-test — each renderable's own
  // position/from/to/scale/modulate/layer replaced by the *effective*
  // (absolute, fully composed with its ancestors') values, and its
  // children peeled off into their own entries in the returned list
  // instead of staying nested. Nothing past this point needs to know
  // parent/child relationships existed at all.
  const flattenRenderable = (renderable: Renderable, parent: Transform): Renderable[] => {
    const localScale = renderable.scale ?? { x: 1, y: 1 };
    const scale = { x: parent.scale.x * localScale.x, y: parent.scale.y * localScale.y };
    const modulate = composeModulate(parent.modulate, renderable.modulate);
    const layer = parent.layer + (renderable.layer ?? 0);

    const effective: Renderable =
      renderable.type === "LINE"
        ? {
            ...renderable,
            from: transformPoint(parent, renderable.from),
            to: transformPoint(parent, renderable.to),
            scale,
            modulate,
            layer,
            children: undefined,
          }
        : {
            ...renderable,
            position: transformPoint(parent, renderable.position),
            scale,
            modulate,
            layer,
            children: undefined,
          };

    const childTransform: Transform = { anchor: anchorOf(effective), scale, modulate, layer };
    const children = (renderable.children ?? []).flatMap((child) => flattenRenderable(child, childTransform));

    return [effective, ...children];
  };

  const flattenRenderables = (renderables: Renderable[]): Renderable[] =>
    renderables.flatMap((renderable) => flattenRenderable(renderable, IDENTITY_TRANSFORM));

  const getFocusedElement = (position: Position, r: Renderable): boolean => {
    const isNonInteractable =
      r.type === "LINE" ||
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
      context.font = textFont(fontSize);
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

  // Every call site needs renderables flattened and in draw order — the
  // mousemove/click handlers below to find whichever's topmost under the
  // mouse, the draw loop to actually draw them that way — so both are
  // applied once here instead of separately wherever props.render() gets
  // called.
  const renderState = (state: State) => {
    const result = props.render(state);
    return { cursor: result.cursor, renderables: sortByLayer(flattenRenderables(result.renderables)) };
  };

  // ev.offsetX/offsetY are in CSS-rendered pixels, which differ from the
  // canvas's drawing-buffer resolution whenever it's displayed at a
  // different size (e.g. scaled down to fit its container). Renderable
  // positions are all in buffer coordinates, so mouse coordinates need
  // the same conversion to line up.
  const getCanvasPosition = (ev: MouseEvent): Position => {
    return {
      x: (ev.offsetX * canvas.width) / canvas.clientWidth,
      y: (ev.offsetY * canvas.height) / canvas.clientHeight,
    };
  };

  const updateState = (updateFn: (state: State) => State) => {
    state = updateFn(state);
  };

  const nextStateFns = Array.isArray(props.nextState) ? props.nextState : [props.nextState];

  let lastFrame: number = Date.now();
  let hoveredId: string | null = null;

  const events: GameEvent[] = [];

  canvas.addEventListener("click", (ev) => {
    const mouse: Position = getCanvasPosition(ev);

    if (hoveredId === null) return;

    const { renderables } = renderState(state);

    const hovered = renderables.find((e) => e.id === hoveredId);

    if (hovered !== undefined && hovered.isClickable) {
      events.push({ tag: "CLICK", id: hovered.id, mouse });
    }
  });

  const initialState: { keyboardState: KeyboardState } = {
    keyboardState: createRecord(keyboardKeys, () => false),
  };

  let previousState: { keyboardState: KeyboardState } = {
    keyboardState: { ...initialState.keyboardState },
  };

  const currentState: { keyboardState: KeyboardState } = {
    keyboardState: { ...initialState.keyboardState },
  };

  canvas.addEventListener("keydown", (event) => {
    const pressedKey = keyboardKeys.find((key) => key === event.code);

    if (pressedKey !== undefined) {
      // Stop tracked keys (arrows, space, ...) from also scrolling the
      // page or triggering other browser defaults while the canvas is
      // focused.
      event.preventDefault();
      currentState.keyboardState[pressedKey] = true;
    }
  });

  canvas.addEventListener("keyup", (event) => {
    const releasedKey = keyboardKeys.find((key) => key === event.code);

    if (releasedKey !== undefined) {
      event.preventDefault();
      currentState.keyboardState[releasedKey] = false;
    }
  });

  canvas.addEventListener("mousemove", (ev) => {
    const mouse = getCanvasPosition(ev);

    const { renderables } = renderState(state);

    const hovered = [...renderables]
      .reverse()
      .find((r) => getFocusedElement(mouse, r));

    if (hovered !== undefined && hovered.isHoverable) {
      events.push({ tag: "HOVER_IN", id: hovered.id, mouse });
    }

    if (hoveredId !== null) {
      const lastHovered = renderables.find((r) => r.id === hoveredId);

      if (lastHovered !== undefined && lastHovered.id !== hovered?.id) {
        events.push({ tag: "HOVER_OUT", id: lastHovered.id, mouse });
      }
    }

    hoveredId = hovered === undefined ? null : hovered.id ?? null;
  });

  canvas.addEventListener("mousemove", (ev) => {
    const mouse = getCanvasPosition(ev);

    if (hoveredId === null) {
      return;
    }

    const { renderables } = renderState(state);

    const hovered = renderables.find((r) => r.id === hoveredId);

    if (hovered !== undefined && hovered.trackMouseMovement) {
      events.push({ tag: "MOUSE_MOVE", mouse, id: hovered.id });
    }
  });

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

  // Tints a just-drawn SPRITE by `modulate`: multiply-blending a filled
  // rectangle over it would also color the fully-transparent parts of its
  // bounding box, so this clips that tint back down to the sprite's own
  // shape afterward by redrawing it (via `redraw`) with `destination-in`,
  // which keeps only where the two overlap.
  const tintSprite = (
    redraw: () => void,
    x: number,
    y: number,
    width: number,
    height: number,
    modulate: string
  ) => {
    context.globalCompositeOperation = "multiply";
    context.fillStyle = modulate;
    context.fillRect(x, y, width, height);

    context.globalCompositeOperation = "destination-in";
    redraw();

    context.globalCompositeOperation = "source-over";
  };

  const intervalId = setInterval(() => {
    const now = Date.now();
    const delta = now - lastFrame;

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

      for (const nextState of nextStateFns) {
        const result = nextState({ state, event, keyboard, playSound, playMusic, pauseMusic });

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

    context.clearRect(0, 0, canvas.width, canvas.height);

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
          modulate,
        } = renderable;
        context.fillStyle = modulate === undefined ? color : modulateColor(color, modulate);

        context.font = textFont(fontSize ?? DEFAULT_TEXT_FONT_SIZE);
        context.textAlign = align?.x ?? "left";
        context.textBaseline = align?.y ?? "top";
        context.fillText(text, x, y);

        context.restore();
        continue;
      }

      if (renderable.type === "SPRITE") {
        const { opacity = 1, flipX = false, modulate } = renderable;
        const resource = resourceById[renderable.resourceId];

        const frame = {
          x: renderable.frame % resource.slices.horizontal,
          y:
            Math.floor(renderable.frame / resource.slices.horizontal) %
            resource.slices.vertical,
        };

        const destWidth = resource.size.width;
        const destHeight = resource.size.height;

        context.globalAlpha = opacity;

        const drawSprite = (destX: number, destY: number) => {
          context.drawImage(
            resource.image,
            frame.x * resource.size.width,
            frame.y * resource.size.height,
            resource.size.width,
            resource.size.height,
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

          if (modulate !== undefined) {
            tintSprite(() => drawSprite(0, 0), 0, 0, destWidth, destHeight, modulate);
          }

          context.restore();
        } else {
          drawSprite(renderable.position.x, renderable.position.y);

          if (modulate !== undefined) {
            tintSprite(
              () => drawSprite(renderable.position.x, renderable.position.y),
              renderable.position.x,
              renderable.position.y,
              destWidth,
              destHeight,
              modulate
            );
          }
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

      exhaust(renderable);
    }

    lastFrame = now;
    previousState.keyboardState = { ...currentState.keyboardState };
  }, 0);

  resetCanvas = () => {
    clearInterval(intervalId);
  };
};
