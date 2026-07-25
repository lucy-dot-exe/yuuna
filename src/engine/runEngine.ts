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
  keyboardKeys,
} from "./types";

let resetCanvas: (() => void) | null = null;

export const runEngine: RunEngineFunction = async <State>(
  props: RunEngineProps<State>
) => {
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

  context.imageSmoothingEnabled = false;

  function getFocusedElement(position: Position, r: Renderable): boolean {
    const isNonInteractable =
      r.type === "TEXT" ||
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

    exhaust(r);
  }

  const updateState = (updateFn: (state: State) => State) => {
    state = updateFn(state);
  };

  let lastFrame: number = Date.now();
  let hoveredId: string | null = null;

  const events: GameEvent[] = [];

  canvas.addEventListener("click", (ev) => {
    const mouse: Position = { x: ev.offsetX, y: ev.offsetY };

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
    const mouse = { x: ev.offsetX, y: ev.offsetY };

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
    const mouse = { x: ev.offsetX, y: ev.offsetY };

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
      updateState((state) =>
        props.nextState({
          state,
          event,
          keyboard: iterateRecord(
            previousState.keyboardState,
            ({ key, value: previouslyPressed }) => {
              const isPressed = currentState.keyboardState[key];

              return {
                isPressed,
                isJustPressed: isPressed && !previouslyPressed,
                isJustReleased: !isPressed && previouslyPressed,
              };
            }
          ),
        })
      );
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
        } = renderable;
        context.fillStyle = color;

        context.font = "30px Arial";
        context.textAlign = align?.x ?? "left";
        context.textBaseline = align?.y ?? "top";
        context.fillText(text, x, y);

        continue;
      }

      if (renderable.type === "SPRITE") {
        const { scale = 1, opacity = 1 } = renderable;
        const resource = resourceById[renderable.resourceId];

        const frame = {
          x: renderable.frame % resource.slices.horizontal,
          y:
            Math.floor(renderable.frame / resource.slices.horizontal) %
            resource.slices.vertical,
        };

        context.globalAlpha = opacity;

        context.drawImage(
          resource.image,
          frame.x * resource.size.width,
          frame.y * resource.size.height,
          resource.size.width,
          resource.size.height,
          renderable.position.x,
          renderable.position.y,
          resource.size.width * scale,
          resource.size.height * scale
        );

        context.globalAlpha = 1;

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
