export type BuildStringNormalizer = (value: unknown, defaultValue?: string) => string;

export function normalizeBuildStringDefault(value: unknown, defaultValue = ''): string {
  return typeof value === 'string' ? value : defaultValue;
}

export function createBuildStringNormalizer(): BuildStringNormalizer {
  return normalizeBuildStringDefault;
}
