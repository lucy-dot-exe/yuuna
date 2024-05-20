import { exhaust } from "../utils/exhaust";
import { Renderable } from "./renderable";
import { Position } from "../utils/Position";
import { CONSTANTS } from "../utils/constants";
import { byId } from "../utils/byId";
import { iterateRecord, iterateRecordAsync } from "../utils/iterateRecord";
import { createRecord } from "../utils/createRecord";
import { KeyboardKeys, keyboardKeys } from "./keyboardKeys";

type KeyboardState = Record<KeyboardKeys, boolean>;

let resetCanvas: (() => void) | null = null;

export async function runEngine<State, ResourceId extends string>(props: {
  resources: Record<
    ResourceId,
    {
      src: string;
      size: { width: number; height: number };
      slices: { vertical: number; horizontal: number };
    }
  >;
  initialState: State;
  nextFrame: (params: {
    state: State;
    delta: number;
    keyboard: Record<
      KeyboardKeys,
      { isPressed: boolean; isJustPressed: boolean; isJustReleased: boolean }
    >;
  }) => State;
  render: (state: State) => {
    cursor: "default" | "pointer";
    renderables: Renderable<State, ResourceId>[];
  };
}): Promise<void>;

export async function runEngine<State, ResourceId extends string>(props: {
  resources: Record<
    ResourceId,
    {
      src: string;
      size: { width: number; height: number };
      slices: { vertical: number; horizontal: number };
    }
  >;
  initialState: State;
  nextFrame: (params: {
    state: State;
    delta: number;
    keyboard: Record<
      KeyboardKeys,
      { isPressed: boolean; isJustPressed: boolean; isJustReleased: boolean }
    >;
  }) => State;
  render: (state: State) => {
    cursor: "default" | "pointer";
    renderables: Renderable<State, ResourceId>[];
  };
}): Promise<void> {
  resetCanvas?.();

  const canvas = window.document.getElementById("luna");

  if (canvas === null) {
    throw new Error('No HTML element found with id "luna"');
  }

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('No Canvas element found with id "luna"');
  }

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Failed to get context from canvas");
  }

  let state: State = props.initialState;

  const resourceById = await iterateRecordAsync(
    props.resources,
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

  function getIsHovered(
    position: Position,
    r: Renderable<State, ResourceId>
  ): boolean {
    const isNonHoverable =
      r.type === "TEXT" ||
      (r.onHoverIn === undefined &&
        r.onHoverOut === undefined &&
        r.onClick === undefined);

    if (isNonHoverable) {
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

  canvas.addEventListener("click", (ev) => {
    const mouse: Position = { x: ev.offsetX, y: ev.offsetY };

    const { renderables } = props.render(state);

    if (hoveredId !== null) {
      const hovered = renderables.find(byId(hoveredId));

      if (
        hovered !== undefined &&
        "onClick" in hovered &&
        hovered.onClick !== undefined
      ) {
        const onClick = hovered.onClick;
        updateState((state: State) => onClick(state, { mouse }));
      }
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

  document.addEventListener("keydown", (event) => {
    const pressedKey = keyboardKeys.find((key) => key === event.code);

    if (pressedKey !== undefined) {
      currentState.keyboardState[pressedKey] = true;
    }
  });

  document.addEventListener("keyup", (event) => {
    const releasedKey = keyboardKeys.find((key) => key === event.code);

    if (releasedKey !== undefined) {
      currentState.keyboardState[releasedKey] = false;
    }
  });

  canvas.addEventListener("mousemove", (ev) => {
    const position = { x: ev.offsetX, y: ev.offsetY };

    const { renderables } = props.render(state);

    const hovered = renderables
      .map((s) => s)
      .reverse()
      .find((r) => getIsHovered(position, r));

    if (
      hovered !== undefined &&
      "onHoverIn" in hovered &&
      hovered.id !== hoveredId &&
      hovered.onHoverIn !== undefined
    ) {
      updateState(hovered.onHoverIn);
    }

    if (hoveredId !== null) {
      const lastHovered = renderables.find(byId(hoveredId));

      if (
        lastHovered !== undefined &&
        lastHovered.id !== hovered?.id &&
        "onHoverOut" in lastHovered &&
        lastHovered.onHoverOut !== undefined
      ) {
        updateState(lastHovered.onHoverOut);
      }
    }

    hoveredId = hovered === undefined ? null : hovered.id;
  });

  canvas.addEventListener("mousemove", (ev) => {
    const mouse = { x: ev.offsetX, y: ev.offsetY };

    const { renderables } = props.render(state);

    if (hoveredId !== null) {
      const hovered = renderables.find(byId(hoveredId));

      if (
        hovered !== undefined &&
        "onMove" in hovered &&
        hovered.onMove !== undefined
      ) {
        const onMove = hovered.onMove;
        updateState((state) => onMove(state, { mouse }));
      }
    }
  });

  context.imageSmoothingEnabled = false;

  const intervalId = setInterval(() => {
    const now = Date.now();
    const delta = now - lastFrame;

    updateState((state) =>
      props.nextFrame({
        state,
        delta,
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

    context.clearRect(0, 0, CONSTANTS.WINDOW.WIDTH, CONSTANTS.WINDOW.HEIGHT);

    const { cursor, renderables } = props.render(state);

    canvas.style.cursor = cursor;

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
            Math.floor(renderable.frame / resource.slices.vertical) %
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
}
