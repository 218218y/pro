// Native ESM implementation of config defaults.

import type { UnknownRecord } from '../../../types';

import { ensureConfigRoot, getConfigRootMaybe } from '../runtime/app_roots_access.js';
// Used by the ESM route to avoid relying on legacy IIFEs.

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function readRecord(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

function cloneConfigDefaults(): UnknownRecord {
  return { ...CONFIG_DEFAULTS };
}

export const CONFIG_DEFAULTS = Object.freeze({
  DOOR_DELAY_MS: 600,
  ACTIVE_STATE_MS: 4000,
  NOTES_THROTTLE_MS: 33,
  PIXEL_RATIO_MAX: 1.5,
  MIRROR_CUBE_SIZE: 256,
  RENDER_ANTIALIAS: true,
  RENDER_SHADOWS_ENABLED: true,
  AUTOSAVE_DEBOUNCE_MS: 2500,
  RESIZE_DEBOUNCE_MS: 80,
});

// Apply config defaults onto the canonical config root without overwriting existing keys.
export function applyConfigDefaults(App: unknown, defaults: unknown = CONFIG_DEFAULTS) {
  const defaultRec = readRecord(defaults) || cloneConfigDefaults();
  try {
    if (!App || typeof App !== 'object') return defaultRec;

    const configRec =
      readRecord(getConfigRootMaybe(App)) || ensureConfigRoot<UnknownRecord>(App, cloneConfigDefaults);
    for (const k in defaultRec) {
      if (!Object.prototype.hasOwnProperty.call(configRec, k)) {
        configRec[k] = defaultRec[k];
      }
    }

    return configRec;
  } catch (_) {
    return readRecord(getConfigRootMaybe(App)) || defaultRec;
  }
}
