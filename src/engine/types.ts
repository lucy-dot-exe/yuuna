export type RectangleRenderable = {
  type: "RECTANGLE";

  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;

  id?: string;
  isClickable?: boolean;
  isHoverable?: boolean;
  trackMouseMovement?: boolean;
};

export type CircleRenderable = {
  type: "CIRCLE";

  position: { x: number; y: number };
  radius: number;
  color: string;

  id?: string;
  isClickable?: boolean;
  isHoverable?: boolean;
  trackMouseMovement?: boolean;
};

export type TextRenderable = {
  type: "TEXT";

  text: string;
  color: string;
  position: { x: number; y: number };
  align?: { x: "left" | "center" | "right"; y: "bottom" | "middle" | "top" };

  id?: string;
  isClickable?: boolean;
  isHoverable?: boolean;
  trackMouseMovement?: boolean;
};

export type SpriteRenderable = {
  type: "SPRITE";

  position: { x: number; y: number };
  resourceId: string;
  frame: number;
  scale?: number;
  opacity?: number;
  flipX?: boolean;

  id?: string;
  isClickable?: boolean;
  isHoverable?: boolean;
  trackMouseMovement?: boolean;
};

export type LineRenderable = {
  type: "LINE";

  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  width?: number;

  id?: string;
  isClickable?: boolean;
  isHoverable?: boolean;
  trackMouseMovement?: boolean;
};

export type Renderable =
  | RectangleRenderable
  | CircleRenderable
  | SpriteRenderable
  | TextRenderable
  | LineRenderable;

export type TimeEvent = { tag: "TIME"; delta: number };

export type ClickEvent = {
  tag: "CLICK";
  id?: string;
  mouse: { x: number; y: number };
};

export type HoverInEvent = {
  tag: "HOVER_IN";
  id?: string;
  mouse: { x: number; y: number };
};

export type HoverOutEvent = {
  tag: "HOVER_OUT";
  id?: string;
  mouse: { x: number; y: number };
};

export type MouseMoveEvent = {
  tag: "MOUSE_MOVE";
  id?: string;
  mouse: { x: number; y: number };
};

export type GameEvent =
  | TimeEvent
  | ClickEvent
  | HoverInEvent
  | HoverOutEvent
  | MouseMoveEvent;

export type NextStateProps<State> = {
  state: State;
  event: GameEvent;
  keyboard: Record<
    KeyboardKeys,
    {
      isPressed: boolean;
      isJustPressed: boolean;
      isJustReleased: boolean;
    }
  >;
};

// Return this from a NextStateFunction to stop the rest of a nextState
// list from running for this event, instead of every mechanic after it
// needing to repeat the same guard (only meaningful when nextState is an
// array — see RunEngineProps.nextState below).
export const STOP = "Yuuna.STOP" as const;

// A NextStateFunction can return three things instead of just a new state:
//  - a new State to update to
//  - undefined (or no return at all) to make no change, but let the rest
//    of the list keep running — lets a mechanic guard itself with a plain
//    `if (...) return;` instead of `if (...) return state;`
//  - STOP to make no change AND stop the rest of the list from running
//    for this event
export type NextStateFunction<State> = (
  props: NextStateProps<State>
) => State | typeof STOP | undefined;

export type RunEngineProps<State> = {
  initialState: State;
  render: (state: State) => {
    cursor?: "default" | "pointer";
    renderables: Renderable[];
  };
  // A single function, or a list of (state) => state mechanics run in
  // order for each event — the output of one feeds into the next, so you
  // can break a game down into small, independent functions instead of
  // one large nextState.
  nextState: NextStateFunction<State> | NextStateFunction<State>[];
  resources?: Record<
    string,
    {
      src: string;
      size: { width: number; height: number };
      slices: { vertical: number; horizontal: number };
    }
  >;
  canvas?: {
    width?: number;
    height?: number;
    backgroundColor?: string;
  };
};

export type RunEngineFunction = <State>(
  props: RunEngineProps<State>
) => Promise<void>;

export const keyboardKeys = [
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "CapsLock",

  "End",
  "Delete",
  "Tab",
  "Space",
  "Enter",

  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",

  "Numpad0",
  "Numpad1",
  "Numpad2",
  "Numpad3",
  "Numpad4",
  "Numpad5",
  "Numpad6",
  "Numpad7",
  "Numpad8",
  "Numpad9",

  "Digit0",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",

  "KeyA",
  "KeyB",
  "KeyC",
  "KeyD",
  "KeyE",
  "KeyF",
  "KeyG",
  "KeyH",
  "KeyI",
  "KeyJ",
  "KeyK",
  "KeyL",
  "KeyM",
  "KeyN",
  "KeyO",
  "KeyP",
  "KeyQ",
  "KeyR",
  "KeyS",
  "KeyT",
  "KeyU",
  "KeyV",
  "KeyW",
  "KeyX",
  "KeyY",
  "KeyZ",
] as const;

export type KeyboardKeys = (typeof keyboardKeys)[number];
export type KeyboardState = Record<KeyboardKeys, boolean>;

export declare var Yuuna: {
  runEngine: RunEngineFunction;
  STOP: typeof STOP;
};
