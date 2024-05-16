import { unsafe } from "../utils/unsafe";

export const createRecord = <Key extends string, T>(
  keys: readonly Key[],
  fn: (key: Key) => T
): Record<Key, T> => {
  const mapped = unsafe<{}, Record<Key, T>>({});

  keys.forEach((key) => {
    mapped[key] = fn(key);
  });

  return mapped;
};
