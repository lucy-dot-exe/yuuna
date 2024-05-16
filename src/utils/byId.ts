export function byId<T extends { id: string }>(
  id: string
): (value: T) => boolean {
  return (value) => value.id === id;
}
