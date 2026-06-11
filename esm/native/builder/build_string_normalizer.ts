import type { AppContainer } from '../../../types';

export type BuildStringNormalizer = (value: unknown, fallback?: string) => string;

export function normalizeBuildStringDefault(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  return String(value);
}

export function createBuildStringNormalizer(App: AppContainer | null | undefined): BuildStringNormalizer {
  const platformStringify = App?.util?.str;
  if (typeof platformStringify !== 'function') return normalizeBuildStringDefault;
  return (value: unknown, fallback = ''): string => platformStringify(value, fallback);
}
