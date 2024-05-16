import { unsafe } from "./unsafe";

export function getKeys<Keys extends string>(
  object: Record<Keys, any>
): Keys[] {
  return unsafe<string[], Keys[]>(Object.keys(object));
}
