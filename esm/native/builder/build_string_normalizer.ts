import type { AppContainer } from '../../../types';

export type BuildStringNormalizer = (value: unknown, defaultValue?: string) => string;

export function normalizeBuildStringDefault(value: unknown, defaultValue = ''): string {
  if (value == null) return defaultValue;
  return String(value);
}

export function createBuildStringNormalizer(App: AppContainer | null | undefined): BuildStringNormalizer {
  const platformStringify = App?.util?.str;
  if (typeof platformStringify !== 'function') return normalizeBuildStringDefault;
  return (value: unknown, defaultValue = ''): string => platformStringify(value, defaultValue);
}
