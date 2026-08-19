import {
  AnimatedSpriteRenderable,
  CircleRenderable,
  GroupRenderable,
  LineRenderable,
  RectangleRenderable,
  SpriteRenderable,
  TextRenderable,
} from "./types";

// One factory per Renderable variant — literally just `{ type: "X",
// ...props }`, so `sprite({...})` (or `Yuuna.sprite({...})` in the
// browser bundle/playground) reads the same as writing the object
// literal by hand, minus needing to get `type` right yourself.
// Deliberately not a place defaults live: besides SpriteRenderable.frame
// (optional at the type level, see types.ts — the engine itself defaults
// it to 0), each factory still requires whatever its Renderable type
// still requires.

export const rectangle = (props: Omit<RectangleRenderable, "type">): RectangleRenderable => ({
  type: "RECTANGLE",
  ...props,
});

export const circle = (props: Omit<CircleRenderable, "type">): CircleRenderable => ({
  type: "CIRCLE",
  ...props,
});

export const text = (props: Omit<TextRenderable, "type">): TextRenderable => ({
  type: "TEXT",
  ...props,
});

export const sprite = (props: Omit<SpriteRenderable, "type">): SpriteRenderable => ({
  type: "SPRITE",
  ...props,
});

export const animatedSprite = (props: Omit<AnimatedSpriteRenderable, "type">): AnimatedSpriteRenderable => ({
  type: "ANIMATED_SPRITE",
  ...props,
});

export const line = (props: Omit<LineRenderable, "type">): LineRenderable => ({
  type: "LINE",
  ...props,
});

export const group = (props: Omit<GroupRenderable, "type">): GroupRenderable => ({
  type: "GROUP",
  ...props,
});
