type RectangleRenderable = {
  type: "RECTANGLE";
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
};
type CircleRenderable = {
  type: "CIRCLE";
  position: { x: number; y: number };
  radius: number;
  color: string;
};
type TextRenderable = {
  type: "TEXT";
  position: { x: number; y: number };
  color: string;
  text: string;
};
type Renderable = RectangleRenderable | CircleRenderable | TextRenderable;

function runEngine<State>(props: {
  initialState: State;
  nextFrame: (params: { state: State; delta: number }) => State;
  render: (state: State) => Renderable[];
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
        } = renderable;
        context.fillStyle = color;

        context.font = "30px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
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

    nextFrame: ({ state, delta }) => ({
      counter: state.counter + delta,
    }),

    render: (state) => [
      {
        type: "RECTANGLE",
        color: "red",
        position: { x: state.counter % CONSTANTS.WINDOW.WIDTH, y: 20 },
        size: { height: 50, width: 50 },
      },

      {
        type: "TEXT",
        color: "white",
        position: {
          x: 50,
          y:
            ((state.counter * 0.01) % CONSTANTS.WINDOW.WIDTH) %
            CONSTANTS.WINDOW.HEIGHT,
        },
        text: "Luna",
      },

      {
        type: "CIRCLE",
        color: "white",
        position: {
          x: CONSTANTS.WINDOW.WIDTH * 0.5 + Math.cos(state.counter * 0.01) * 50,
          y:
            CONSTANTS.WINDOW.HEIGHT * 0.5 + Math.sin(state.counter * 0.01) * 50,
        },
        radius: 25,
      },
    ],
  });
