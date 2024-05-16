type RectangleRenderable<State> = {
  type: "RECTANGLE";
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  onClick?: (state: State) => State;
};

type CircleRenderable<State> = {
  type: "CIRCLE";
  position: { x: number; y: number };
  radius: number;
  color: string;
  onClick?: (state: State) => State;
};

type TextRenderable = {
  type: "TEXT";
  position: { x: number; y: number };
  align?: { x: "left" | "center" | "right"; y: "bottom" | "middle" | "top" };
  color: string;
  text: string;
};

type Renderable<State> =
  | RectangleRenderable<State>
  | CircleRenderable<State>
  | TextRenderable;

function runEngine<State>(props: {
  initialState: State;
  nextFrame: (params: { state: State; delta: number }) => State;
  render: (state: State) => Renderable<State>[];
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
  let lastFrame: number = Date.now();

  canvas.addEventListener("click", (ev) => {
    const position = { x: ev.offsetX, y: ev.offsetY };

    const renderables = props.render(state);

    state = renderables
      .flatMap((r) => {
        if (r.type === "CIRCLE") {
          if (r.onClick === undefined) return [];

          const delta = {
            x: Math.abs(position.x - r.position.x),
            y: Math.abs(position.y - r.position.y),
          };

          const distance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);

          if (distance > r.radius) {
            return [];
          }

          return [{ onClick: r.onClick }];
        }

        if (r.type === "RECTANGLE") {
          if (r.onClick === undefined) return [];

          const topLeft = { x: r.position.x, y: r.position.y };
          const bottomRight = {
            x: r.position.x + r.size.width,
            y: r.position.y + r.size.height,
          };

          const isInsideX =
            position.x > topLeft.x && position.x < bottomRight.x;
          const isInsideY =
            position.y > topLeft.y && position.y < bottomRight.y;

          const isInside = isInsideX && isInsideY;

          if (!isInside) return [];

          return [{ onClick: r.onClick }];
        }

        if (r.type === "TEXT") {
          return [];
        }

        exhaust(r);
      })
      .reduce((acc, element) => element.onClick(acc), state);
  });

  setInterval(() => {
    const now = Date.now();
    const delta = now - lastFrame;

    state = props.nextFrame({ state, delta });

    context.clearRect(0, 0, CONSTANTS.WINDOW.WIDTH, CONSTANTS.WINDOW.HEIGHT);

    const renderables = props.render(state);
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

window.onload = () =>
  runEngine<{
    counter: number;
  }>({
    initialState: { counter: 0 },

    nextFrame: ({ state }) => ({
      counter: state.counter,
    }),

    render: (state) => [
      {
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
        type: "CIRCLE",
        color: "brown",
        position: {
          x: 50,
          y: 50,
        },
        radius: 25,
        onClick: ({ counter }) => ({ counter: counter + 1 }),
      },
    ],
  });
