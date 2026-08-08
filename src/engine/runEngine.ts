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

  const getFocusedElement = (position: Position, r: Renderable): boolean => {
    const isNonInteractable =
      r.type === "LINE" ||
      ((r.isHoverable === undefined || !r.isHoverable) &&
        (r.isClickable === undefined || !r.isClickable));

    if (isNonInteractable) {
      return false;
    }

    if (r.type === "CIRCLE") {
      const delta = {
        x: Math.abs(position.x - r.position.x),
        y: Math.abs(position.y - r.position.y),
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

      const isInsideX = position.x > topLeft.x && position.x < bottomRight.x;
      const isInsideY = position.y > topLeft.y && position.y < bottomRight.y;

      const isHovered = isInsideX && isInsideY;
      return isHovered;
    }

    if (r.type === "SPRITE") {
      const topLeft = { x: r.position.x, y: r.position.y };
      const resource = resourceById[r.resourceId];
      const { scale = 1 } = r;

      const bottomRight = {
        x: r.position.x + resource.size.width * scale,
        y: r.position.y + resource.size.height * scale,
      };

      const isInsideX = position.x > topLeft.x && position.x < bottomRight.x;
      const isInsideY = position.y > topLeft.y && position.y < bottomRight.y;

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

      const isInsideX = position.x > left && position.x < left + width;
      const isInsideY = position.y > top && position.y < top + height;

      return isInsideX && isInsideY;
    }

    exhaust(r);
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

    const { renderables } = props.render(state);

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

    const { renderables } = props.render(state);

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

    const { renderables } = props.render(state);

    const hovered = renderables.find((r) => r.id === hoveredId);

    if (hovered !== undefined && hovered.trackMouseMovement) {
      events.push({ tag: "MOUSE_MOVE", mouse, id: hovered.id });
    }
  });

  context.imageSmoothingEnabled = false;

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

    const { cursor, renderables } = props.render(state);

    canvas.style.cursor = cursor ?? "default";

    for (const renderable of renderables) {
      if (renderable.type === "RECTANGLE") {
        context.fillStyle = renderable.color;

        context.fillRect(
          renderable.position.x,
          renderable.position.y,
          renderable.size.width,
          renderable.size.height
        );

        continue;
      }

      if (renderable.type === "CIRCLE") {
        context.fillStyle = renderable.color;

        context.beginPath();
        context.arc(
          renderable.position.x,
          renderable.position.y,
          renderable.radius,
          0,
          2 * Math.PI
        );
        context.fill();

        continue;
      }

      if (renderable.type === "TEXT") {
        const {
          color,
          position: { x, y },
          text,
          align,
          fontSize,
        } = renderable;
        context.fillStyle = color;

        context.font = textFont(fontSize ?? DEFAULT_TEXT_FONT_SIZE);
        context.textAlign = align?.x ?? "left";
        context.textBaseline = align?.y ?? "top";
        context.fillText(text, x, y);

        continue;
      }

      if (renderable.type === "SPRITE") {
        const { scale = 1, opacity = 1, flipX = false } = renderable;
        const resource = resourceById[renderable.resourceId];

        const frame = {
          x: renderable.frame % resource.slices.horizontal,
          y:
            Math.floor(renderable.frame / resource.slices.horizontal) %
            resource.slices.vertical,
        };

        const destWidth = resource.size.width * scale;
        const destHeight = resource.size.height * scale;

        context.globalAlpha = opacity;

        if (flipX) {
          context.save();
          context.translate(renderable.position.x + destWidth, renderable.position.y);
          context.scale(-1, 1);

          context.drawImage(
            resource.image,
            frame.x * resource.size.width,
            frame.y * resource.size.height,
            resource.size.width,
            resource.size.height,
            0,
            0,
            destWidth,
            destHeight
          );

          context.restore();
        } else {
          context.drawImage(
            resource.image,
            frame.x * resource.size.width,
            frame.y * resource.size.height,
            resource.size.width,
            resource.size.height,
            renderable.position.x,
            renderable.position.y,
            destWidth,
            destHeight
          );
        }

        context.globalAlpha = 1;

        continue;
      }

      if (renderable.type === "LINE") {
        context.strokeStyle = renderable.color;
        context.lineWidth = renderable.width ?? 2;

        context.beginPath();
        context.moveTo(renderable.from.x, renderable.from.y);
        context.lineTo(renderable.to.x, renderable.to.y);
        context.stroke();

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
