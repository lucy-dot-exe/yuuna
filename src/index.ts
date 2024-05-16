type RectangleRenderable<State> = {
  type: "RECTANGLE";
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  onClick?: (state: State) => State;
  onHoverIn?: (state: State) => State;
  onHoverOut?: (state: State) => State;
};

type CircleRenderable<State> = {
  type: "CIRCLE";
  id: string;
  position: { x: number; y: number };
  radius: number;
  color: string;
  onClick?: (state: State) => State;
  onHoverIn?: (state: State) => State;
  onHoverOut?: (state: State) => State;
};

type TextRenderable = {
  type: "TEXT";
  id: string;
  position: { x: number; y: number };
  align?: { x: "left" | "center" | "right"; y: "bottom" | "middle" | "top" };
  color: string;
  text: string;
};

type SpriteRenderable<State, ResourceId> = {
  type: "SPRITE";

  id: string;
  position: { x: number; y: number };
  resourceId: ResourceId;
  frame: number;
  scale?: number;
  opacity?: number;

  onClick?: (state: State) => State;
  onHoverIn?: (state: State) => State;
  onHoverOut?: (state: State) => State;
};

type Renderable<State, ResourceId> =
  | RectangleRenderable<State>
  | CircleRenderable<State>
  | SpriteRenderable<State, ResourceId>
  | TextRenderable;

type Position = { x: number; y: number };

async function runEngine<State, ResourceId extends string>(props: {
  resources: Record<
    ResourceId,
    {
      src: string;
      size: { width: number; height: number };
      slices: { vertical: number; horizontal: number };
    }
  >;
  initialState: State;
  nextFrame: (params: { state: State; delta: number }) => State;
  render: (state: State) => {
    cursor: "default" | "pointer";
    renderables: Renderable<State, ResourceId>[];
  };
}) {
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

  const resourceById = await iterateRecord(
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

  canvas.addEventListener("click", () => {
    const { renderables } = props.render(state);

    if (hoveredId !== null) {
      const hovered = renderables.find(byId(hoveredId));

      if (
        hovered !== undefined &&
        "onClick" in hovered &&
        hovered.onClick !== undefined
      ) {
        updateState(hovered.onClick);
      }
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

  context.imageSmoothingEnabled = false;

  setInterval(() => {
    const now = Date.now();
    const delta = now - lastFrame;

    updateState((state) => props.nextFrame({ state, delta }));

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
  }, 0);
}

const CONSTANTS = {
  WINDOW: {
    WIDTH: 960,
    HEIGHT: 540,
  },
};

function exhaust(value: never): never {
  throw new Error(`${value} was expected to be never.`);
}

function not<T>(fn: (value: T) => boolean): (value: T) => boolean {
  return (value) => !fn(value);
}

function byId<T extends { id: string }>(id: string): (value: T) => boolean {
  return (value) => value.id === id;
}

async function iterateRecord<Key extends string, T, Item>(
  record: Record<Key, T>,
  fn: (item: { key: Key; value: T }) => Item | Promise<Item>
): Promise<Record<Key, Item>> {
  const mapped: Record<Key, Item> = unsafe<{}, Record<Key, Item>>({});

  const $mappings = getKeys(record).map(async (key) => {
    mapped[key] = await fn({ key, value: record[key] });
  });

  await Promise.all($mappings);

  return mapped;
}

function getKeys<Keys extends string>(object: Record<Keys, any>): Keys[] {
  return unsafe<string[], Keys[]>(Object.keys(object));
}

function unsafe<Input, Output>(input: Input): Output {
  //@ts-ignore
  return input;
}

window.onload = () =>
  runEngine<
    {
      counter: number;
      isHovering: boolean;
    },
    "food"
  >({
    initialState: { counter: 0, isHovering: false },
    resources: {
      food: {
        src: "resources/food.png",
        size: { width: 128, height: 128 },
        slices: { horizontal: 8, vertical: 8 },
      },
    },

    nextFrame: ({ state }) => state,

    render: (state) => ({
      cursor: state.isHovering ? "pointer" : "default",

      renderables: [
        {
          id: "cookie-counter-display",
          type: "TEXT",
          color: "white",
          position: {
            x: 100,
            y: 50,
          },
          text: `${state.counter} cookies`,
          align: {
            x: "left",
            y: "middle",
          },
        },

        {
          id: "food-sprite",
          type: "SPRITE",
          position: {
            x: 50 - 8 * 4,
            y: 50 - 8 * 4,
          },
          resourceId: "food",
          frame: state.counter % (8 * 8),
          scale: 4,
          opacity: state.isHovering ? 1 : 0.5,
          onClick: (state) => ({ ...state, counter: state.counter + 1 }),
          onHoverIn: (state) => ({ ...state, isHovering: true }),
          onHoverOut: (state) => ({ ...state, isHovering: false }),
        },
      ],
    }),
  });
