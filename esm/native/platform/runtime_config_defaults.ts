// Native ESM implementation of runtime/boot config defaults.

import type { RuntimeConfigValueMap, UnknownRecord } from '../../../types';

import { ensureRuntimeConfigRoot, getRuntimeConfigRootMaybe } from '../runtime/app_roots_access.js';
// Used by the ESM route to keep runtime config defaults explicit during boot.

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function readRecord(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

function cloneConfigDefaults(): UnknownRecord {
  return { ...RUNTIME_CONFIG_DEFAULTS };
}

export const RUNTIME_CONFIG_DEFAULTS = Object.freeze({
  DOOR_DELAY_MS: 600,
  ACTIVE_STATE_MS: 4000,
  NOTES_THROTTLE_MS: 33,
  PIXEL_RATIO_MAX: 1.5,
  MIRROR_CUBE_SIZE: 256,
  RENDER_ANTIALIAS: true,
  RENDER_SHADOWS_ENABLED: true,
  AUTOSAVE_DEBOUNCE_MS: 2500,
  RESIZE_DEBOUNCE_MS: 80,
} satisfies Partial<RuntimeConfigValueMap>);

// Apply defaults onto the canonical runtime config root without overwriting injected keys.
export function applyRuntimeConfigDefaults(App: unknown, defaults: unknown = RUNTIME_CONFIG_DEFAULTS) {
  const defaultRec = readRecord(defaults) || cloneConfigDefaults();
  try {
    if (!App || typeof App !== 'object') return defaultRec;

    const configRec =
      readRecord(getRuntimeConfigRootMaybe(App)) ||
      ensureRuntimeConfigRoot<UnknownRecord>(App, cloneConfigDefaults);
    for (const k in defaultRec) {
      if (!Object.prototype.hasOwnProperty.call(configRec, k)) {
        configRec[k] = defaultRec[k];
      }
    }

    return configRec;
  } catch (_) {
    return readRecord(getRuntimeConfigRootMaybe(App)) || defaultRec;
  }
}
