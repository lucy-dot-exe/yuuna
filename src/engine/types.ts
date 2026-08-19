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
  // Palette swap — replaces every pixel exactly matching `from` with
  // `to` (both any valid CSS color string), for recoloring a sprite
  // (e.g. a team/faction color, a skin/outfit variant) without a
  // separate art asset per color. Unlike `modulate`'s multiply-blend,
  // this can change hue outright (e.g. red to blue), but only matches
  // pixels *exactly* equal to `from` — the right tool for flat-color
  // pixel art, not for anti-aliased/gradient art where few pixels are
  // an exact match. Applied before `modulate`, so a modulate tint (e.g.
  // a damage flash) still layers on top of the swapped colors.
  swapColors?: { from: string; to: string }[];
};

export type LineRenderable = BaseRenderable & {
  type: "LINE";

  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  width?: number;
};

// Like SPRITE, but you say which named animation (from that resource's
// `animations`, see RunEngineProps.resources) to play instead of a frame
// number — the engine tracks playback and picks the frame itself.
export type AnimatedSpriteRenderable = BaseRenderable & {
  type: "ANIMATED_SPRITE";

  position: { x: number; y: number };
  resourceId: string;
  animation: string;
  // Multiplies playback speed — 2 plays twice as fast, 0.5 half speed.
  // Defaults to 1.
  timeScale?: number;
  // Freezes on the current frame — its clock stops rather than keeps
  // running unseen, so unpausing resumes from the same frame instead of
  // skipping ahead by however long it was paused. Defaults to false.
  paused?: boolean;
  opacity?: number;
  flipX?: boolean;
  // See SpriteRenderable.swapColors — same thing, applied to whichever
  // frame the animation is currently showing.
  swapColors?: { from: string; to: string }[];

  // Required — unlike every other renderable's optional id. render()
  // returns brand-new objects every frame, so the engine has no way to
  // recognize "this is the same sprite as last frame" (and therefore
  // when its current animation actually started) except by id. Reusing
  // one id across two different logical entities makes their animation
  // timers bleed into each other.
  id: string;
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
  | GroupRenderable
  | AnimatedSpriteRenderable;

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

// Fires when the mouse leaves the canvas entirely — mouse/worldMouse are
// the position it left from (still meaningful, even though it's now
// outside the canvas, e.g. to tell which edge it exited through). Also
// implies a HOVER_OUT for whatever was hovered, if anything was, since a
// mousemove inside the canvas — what HOVER_OUT normally rides along
// with — can no longer happen once the mouse isn't over it.
export type MouseLeaveEvent = {
  tag: "MOUSE_LEAVE";
  mouse: { x: number; y: number };
  worldMouse: { x: number; y: number };
};

// Fires when the browser tab the game is running in is switched away from
// (backgrounded, minimized, another tab focused, ...) — driven by the
// page's visibilitychange, not window focus, so it fires for actual tab/
// window switches without false-firing on things like a devtools panel
// stealing focus.
export type TabBlurEvent = { tag: "TAB_BLUR" };

// Fires when the tab becomes the active one again after a TabBlurEvent —
// the natural place to resumeMusic() or unpause whatever TAB_BLUR paused.
export type TabFocusEvent = { tag: "TAB_FOCUS" };

// Fires when a music track (started with playMusic) reaches its end —
// only for a track configured with loop: false in RunEngineProps.music,
// since a looping track restarts instead of ever "ending".
export type MusicEndEvent = { tag: "MUSIC_END"; id: string };

export type GameEvent =
  | TimeEvent
  | ClickEvent
  | HoverInEvent
  | HoverOutEvent
  | MouseMoveEvent
  | MouseLeaveEvent
  | TabBlurEvent
  | TabFocusEvent
  | MusicEndEvent;

// Wraps whatever type you pass as RunEngineProps's Custom type parameter
// — its shape is entirely up to you, unlike the built-in GameEvent
// variants above. Sent with the sendEvent() function runEngine() resolves
// with, from anywhere (not just inside a NextStateFunction) — e.g. a
// fetch().then() callback once an async request completes, which is the
// point of custom events: reporting the result of something that
// happened outside the normal render-loop-driven flow of TIME/CLICK/etc.
export type CustomGameEvent<Custom> = { tag: "CUSTOM"; event: Custom };

export type NextStateProps<State, Custom = never> = {
  state: State;
  event: GameEvent | CustomGameEvent<Custom>;
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
  // Resumes whichever track was paused by pauseMusic(), from where it
  // left off — the same effect as calling playMusic() with that track's
  // id again, but without needing to still have the id on hand. A no-op
  // if nothing has played yet.
  resumeMusic: () => void;
  // Sets the volume (0 to 1) of whichever track is current, and of
  // whatever plays next — unlike pauseMusic's position, volume isn't
  // per-track, so switching tracks with playMusic keeps the same volume
  // instead of resetting to full. Values outside 0-1 are clamped.
  setMusicVolume: (volume: number) => void;
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
export type NextStateFunction<State, Custom = never> = (
  props: NextStateProps<State, Custom>
) => State | typeof STOP | undefined;

export type RunEngineProps<State, Custom = never> = {
  initialState: State;
  render: (state: State) => {
    // "none" hides the OS cursor over the canvas entirely — for a game
    // that draws its own cursor stand-in (e.g. a ship that follows the
    // mouse), so the two don't render on top of each other.
    cursor?: "default" | "pointer" | "none";
    renderables: Renderable[];
  };
  // A single function, or a list of (state) => state mechanics run in
  // order for each event — the output of one feeds into the next, so you
  // can break a game down into small, independent functions instead of
  // one large nextState.
  nextState: NextStateFunction<State, Custom> | NextStateFunction<State, Custom>[];
  resources?: Record<
    string,
    {
      src: string;
      size: { width: number; height: number };
      slices: { vertical: number; horizontal: number };
      // Named animations for this spritesheet — reference one by name
      // from an ANIMATED_SPRITE renderable's `animation` field.
      animations?: Record<
        string,
        {
          // Which frames (in the same numbering SPRITE's `frame` uses)
          // to play, in order. Can repeat/skip/reorder frames.
          frames: number[];
          // Milliseconds each frame is shown, before timeScale.
          frameDuration: number;
          // false holds on the last frame once played through, instead
          // of restarting — required rather than defaulted, since
          // getting this wrong silently (e.g. an explosion looping
          // forever) is an easy, confusing mistake.
          loop: boolean;
        }
      >;
    }
  >;
  // Sound effects, keyed by an id you pick — play one from a
  // NextStateFunction with the `playSound(id)` prop it receives.
  sounds?: Record<string, { src: string }>;
  // Background music tracks, keyed by an id you pick — start/pause one
  // from a NextStateFunction with the `playMusic(id)` / `pauseMusic()`
  // props it receives.
  music?: Record<
    string,
    {
      src: string;
      // Whether the track restarts on end. Defaults to true. Set false
      // to get a MusicEndEvent instead — a looping track never reaches
      // "ended", so that event only ever fires for a track with loop:
      // false.
      loop?: boolean;
    }
  >;
  canvas?: {
    width?: number;
    height?: number;
    backgroundColor?: string;
    // How the on-screen display size tracks the browser window,
    // independent of the fixed logical resolution above (width/height) —
    // every renderable's position stays in that logical space no matter
    // what this is set to, so existing game code never has to account for
    // it. Defaults to "none": today's behavior, CSS size matches the
    // buffer size 1:1.
    //  - "fit": scales uniformly to the largest size that stays within
    //    the window, preserving aspect ratio (letterboxed).
    //  - "stretch": fills the window on both axes independently, which
    //    can distort art if the window's aspect ratio doesn't match the
    //    canvas's.
    // Left as a caller choice rather than an engine default since it's a
    // real visual trade-off specific to each game.
    resize?: "none" | "fit" | "stretch";
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

export type RunEngineFunction = <State, Custom = never>(
  props: RunEngineProps<State, Custom>
) => Promise<{
  // Dispatches a custom event, delivered to nextState as a
  // CustomGameEvent on a later tick — the way to report something that
  // happened outside the render loop (e.g. an async fetch resolving)
  // back into it. Call from anywhere, not just from within nextState.
  sendEvent: (event: Custom) => void;
}>;

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
