export function exhaust(value: never): never {
  throw new Error(`${value} was expected to be never.`);
}
