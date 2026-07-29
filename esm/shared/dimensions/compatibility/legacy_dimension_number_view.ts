export type LegacyDimensionNumberView<T> = T extends number
  ? number
  : T extends object
    ? { readonly [Key in keyof T]: LegacyDimensionNumberView<T[Key]> }
    : T;

export function legacyDimensionNumberView<T>(value: T): LegacyDimensionNumberView<T> {
  return value as LegacyDimensionNumberView<T>;
}
