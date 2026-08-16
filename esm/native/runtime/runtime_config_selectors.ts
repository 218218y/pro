import type {
  RuntimeConfigBooleanKey,
  RuntimeConfigKey,
  RuntimeConfigNumberKey,
  RuntimeConfigValueMap,
  WardrobeProRuntimeConfig,
} from '../../../types/index.js';

import { getRuntimeConfigRootMaybe } from './app_roots_access.js';

function isMissingRuntimeConfigValue(value: unknown): boolean {
  return typeof value === 'undefined' || value === null || value === '';
}

/** Read the canonical runtime/boot config surface (`App.config`) only. */
export function readRuntimeConfigStateFromApp(App: unknown): WardrobeProRuntimeConfig {
  return getRuntimeConfigRootMaybe<WardrobeProRuntimeConfig>(App) ?? Object.create(null);
}

/**
 * Read a named runtime/boot config value.
 *
 * This selector never consults the persistent product-config slice; runtime
 * configuration and product state intentionally have separate ownership.
 */
export function readRuntimeConfigValueFromApp<K extends RuntimeConfigKey>(
  App: unknown,
  key: K
): RuntimeConfigValueMap[K] | undefined {
  const value = readRuntimeConfigStateFromApp(App)[key];
  return isMissingRuntimeConfigValue(value) ? undefined : (value as RuntimeConfigValueMap[K]);
}

/** Read a finite numeric runtime/boot config value with an explicit default. */
export function readRuntimeConfigNumberFromApp<K extends RuntimeConfigNumberKey>(
  App: unknown,
  key: K,
  defaultValue: number
): number {
  const value = readRuntimeConfigValueFromApp(App, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

/** Read a boolean runtime/boot config value with an explicit default. */
export function readRuntimeConfigBooleanFromApp<K extends RuntimeConfigBooleanKey>(
  App: unknown,
  key: K,
  defaultValue: boolean
): boolean {
  const value = readRuntimeConfigValueFromApp(App, key);
  return typeof value === 'boolean' ? value : defaultValue;
}
