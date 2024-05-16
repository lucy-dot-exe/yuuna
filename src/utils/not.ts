function not<T>(fn: (value: T) => boolean): (value: T) => boolean {
  return (value) => !fn(value);
}
