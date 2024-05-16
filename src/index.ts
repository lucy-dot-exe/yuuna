import { CONSTANTS } from "./utils/constants";
import { Position } from "./utils/Position";
import { SpriteRenderable } from "./engine/renderable";
import { runEngine } from "./engine/runEngine";

window.onload = () =>
  runEngine<
    {
      counter: number;
      isHovering: boolean;
      objects: { position: Position }[];
      mouse: Position | null;
    },
    "food"
  >({
    initialState: {
      counter: 0,
      isHovering: false,
      objects: [],
      mouse: null,
    },
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
          id: "background",
          type: "RECTANGLE",
          position: {
            x: 0,
            y: 0,
          },

          color: "rgba(0,0,0,0)",

          size: {
            width: CONSTANTS.WINDOW.WIDTH,
            height: CONSTANTS.WINDOW.HEIGHT,
          },

          onClick: (state, { mouse }) => ({
            ...state,
            objects: [...state.objects, { position: mouse }],
          }),

          onMove: (state, { mouse }) => ({ ...state, mouse }),
          onHoverOut: (state) => ({ ...state, mouse: null }),
        },

        ...state.objects.map(
          (obj, index): SpriteRenderable<any, any> => ({
            id: `food-${index}`,
            type: "SPRITE",
            position: {
              x: obj.position.x - 8 * 4,
              y: obj.position.y - 8 * 4,
            },
            resourceId: "food",
            frame: index % (8 * 8),
            scale: 4,
          })
        ),

        {
          id: "preview",
          type: "SPRITE",
          position:
            state.mouse !== null
              ? { x: state.mouse.x - 8 * 4, y: state.mouse.y - 8 * 4 }
              : {
                  x: 0,
                  y: 0,
                },
          resourceId: "food",
          scale: 4,
          frame: state.objects.length,
          opacity: state.mouse !== null ? 1 : 0,
        },

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
