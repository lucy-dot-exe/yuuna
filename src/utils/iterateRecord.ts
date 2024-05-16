import { getKeys } from "./getKeys";
import { unsafe } from "./unsafe";

export async function iterateRecord<Key extends string, T, Item>(
  record: Record<Key, T>,
  fn: (item: { key: Key; value: T }) => Item | Promise<Item>
): Promise<Record<Key, Item>> {
  const mapped: Record<Key, Item> = unsafe<{}, Record<Key, Item>>({});

  const $mappings = getKeys(record).map(async (key) => {
    mapped[key] = await fn({ key, value: record[key] });
  });

  await Promise.all($mappings);

  return mapped;
}
