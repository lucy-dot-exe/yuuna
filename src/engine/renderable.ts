import { Position } from "../utils/Position";

type RectangleRenderable<State> = {
  type: "RECTANGLE";
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  onClick?: (state: State, event: { mouse: Position }) => State;
  onMove?: (state: State, event: { mouse: Position }) => State;
  onHoverIn?: (state: State) => State;
  onHoverOut?: (state: State) => State;
};
type CircleRenderable<State> = {
  type: "CIRCLE";
  id: string;
  position: { x: number; y: number };
  radius: number;
  color: string;
  onClick?: (state: State, event: { mouse: Position }) => State;
  onMove?: (state: State, event: { mouse: Position }) => State;
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
export type SpriteRenderable<State, ResourceId> = {
  type: "SPRITE";

  id: string;
  position: { x: number; y: number };
  resourceId: ResourceId;
  frame: number;
  scale?: number;
  opacity?: number;

  onClick?: (state: State, event: { mouse: Position }) => State;
  onMove?: (state: State, event: { mouse: Position }) => State;
  onHoverIn?: (state: State) => State;
  onHoverOut?: (state: State) => State;
};

export type Renderable<State, ResourceId> =
  | RectangleRenderable<State>
  | CircleRenderable<State>
  | SpriteRenderable<State, ResourceId>
  | TextRenderable;
