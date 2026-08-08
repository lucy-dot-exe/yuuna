// Shared by every Renderable variant below
type BaseRenderable = {
  // Higher values render later, i.e. in front of lower ones. Renderables
  // with the same layer (the default, 0) keep the order render() listed
  // them in.
  layer?: number;
  // Multiplies this renderable's size along each axis, anchored at its
  // position (or LINE's `from`). Defaults to { x: 1, y: 1 }. A CIRCLE
  // scaled unevenly draws as an ellipse.
  scale?: { x: number; y: number };
  // Multiplies this renderable's color channel-by-channel, the same way
  // Godot's `modulate` works — e.g. "#808080" halves brightness, "#ff0000"
  // keeps only the red channel. Accepts any valid CSS color string.
  modulate?: string;
  // Nested renderables, positioned relative to this one — like Godot's
  // parent/child nodes. A child's position is added to its parent's
  // (scaled by the parent's own scale), and scale/modulate/layer all
  // compose down the tree: a child's effective scale is the parent's
  // times its own, modulate multiplies the same way, and layer adds (so
  // it's relative to the parent's, matching Godot's default behavior —
  // a deeply-nested child can still end up drawn in front of an
  // unrelated top-level renderable if its accumulated layer says so).
  children?: Renderable[];
  // If true, this renderable (and its whole subtree) ignores the camera
  // and stays fixed to the screen — for UI/HUD elements that shouldn't
  // pan or zoom with the game world. Defaults to false (world-space).
  // Only matters if RunEngineProps.camera is set; otherwise there's no
  // camera transform to opt out of.
  screenSpace?: boolean;

  id?: string;
  isClickable?: boolean;
  isHoverable?: boolean;
  trackMouseMovement?: boolean;
};

export type RectangleRenderable = BaseRenderable & {
  type: "RECTANGLE";

  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
};

export type CircleRenderable = BaseRenderable & {
  type: "CIRCLE";

  position: { x: number; y: number };
  radius: number;
  color: string;
};

export type TextRenderable = BaseRenderable & {
  type: "TEXT";

  text: string;
  color: string;
  position: { x: number; y: number };
  align?: { x: "left" | "center" | "right"; y: "bottom" | "middle" | "top" };
  // Defaults to 30 (pixels) if unset
  fontSize?: number;
};

export type SpriteRenderable = BaseRenderable & {
  type: "SPRITE";

  position: { x: number; y: number };
  resourceId: string;
  frame: number;
  opacity?: number;
  flipX?: boolean;
};

export type LineRenderable = BaseRenderable & {
  type: "LINE";

  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  width?: number;
};

// Draws nothing itself — just a position (plus the usual scale/modulate/
// layer) for `children` to be relative to, for grouping renderables that
// should move/scale/tint together without needing a visible shape of its
// own to hang them off of. Never interactable — it has no shape to hit-test.
export type GroupRenderable = BaseRenderable & {
  type: "GROUP";

  position: { x: number; y: number };
};

export type Renderable =
  | RectangleRenderable
  | CircleRenderable
  | SpriteRenderable
  | TextRenderable
  | LineRenderable
  | GroupRenderable;

export type TimeEvent = { tag: "TIME"; delta: number };

// mouse is raw canvas pixels, unaffected by the camera — use it for
// screenSpace/UI renderables. worldMouse is that same position run
// through the camera's inverse transform, so it's where the cursor is
// in the game world — use it to place/locate world-space things (e.g.
// a turret built where the player clicked). With no RunEngineProps.camera
// set, worldMouse is always equal to mouse.
export type ClickEvent = {
  tag: "CLICK";
  id?: string;
  mouse: { x: number; y: number };
  worldMouse: { x: number; y: number };
};

export type HoverInEvent = {
  tag: "HOVER_IN";
  id?: string;
  mouse: { x: number; y: number };
  worldMouse: { x: number; y: number };
};

export type HoverOutEvent = {
  tag: "HOVER_OUT";
  id?: string;
  mouse: { x: number; y: number };
  worldMouse: { x: number; y: number };
};

export type MouseMoveEvent = {
  tag: "MOUSE_MOVE";
  id?: string;
  mouse: { x: number; y: number };
  worldMouse: { x: number; y: number };
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
  // Plays a sound effect (by its id in RunEngineProps.sounds) as a
  // side effect of this call — call it from within a NextStateFunction,
  // e.g. `playSound("collect")` when a cookie is clicked. Playing the
  // same id again while it's still playing starts an overlapping copy
  // instead of cutting the first one off.
  playSound: (id: string) => void;
  // Starts background music (by its id in RunEngineProps.music), looping
  // it until paused. Unlike playSound, only one track plays at a time and
  // it keeps running in the background across frames/state changes
  // instead of firing once — calling playMusic again with the same id
  // after pauseMusic() resumes it from where it left off; calling it with
  // a different id switches tracks.
  playMusic: (id: string) => void;
  // Pauses whichever track playMusic last started, leaving its position
  // where it left off so a later playMusic() call resumes it.
  pauseMusic: () => void;
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
  // Sound effects, keyed by an id you pick — play one from a
  // NextStateFunction with the `playSound(id)` prop it receives.
  sounds?: Record<string, { src: string }>;
  // Background music tracks, keyed by an id you pick — start/pause one
  // from a NextStateFunction with the `playMusic(id)` / `pauseMusic()`
  // props it receives.
  music?: Record<string, { src: string }>;
  canvas?: {
    width?: number;
    height?: number;
    backgroundColor?: string;
  };
  // Pans/zooms every world-space renderable (anything without
  // screenSpace: true) as a group — { x, y } is the world position that
  // maps to canvas (0, 0), and zoom scales everything around that same
  // point (so it's the corner that stays put as zoom changes, the same
  // anchor convention scale/GROUP already use elsewhere). A function of
  // state, so the camera can follow something or react to a zoom level
  // you're tracking yourself. Affects rendering and hit-testing, but not
  // the raw `mouse` on click/hover events — see worldMouse for that.
  camera?: (state: State) => { x: number; y: number; zoom: number };
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
