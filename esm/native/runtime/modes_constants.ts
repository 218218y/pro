// Canonical mode ids (Pure ESM)
//
// Single source of truth for primary mode string IDs.
// Post-migration policy: callers should not read mode IDs from removed surfaces.

export type ModeMap = Record<string, string>;

export const MODES: ModeMap = Object.freeze({
  NONE: 'none',
  HANDLE: 'handle',
  HINGE: 'hinge',
  SPLIT: 'split',
  GROOVE: 'groove',
  DIVIDER: 'divider',
  REMOVE_DOOR: 'remove_door',
  PAINT: 'paint',
  LAYOUT: 'layout',
  MANUAL_LAYOUT: 'manual_layout',
  BRACE_SHELVES: 'brace_shelves',
  CELL_DIMS: 'cell_dims',
  MEASURE: 'measure',
  EXT_DRAWER: 'ext_drawer',
  SCREEN_NOTE: 'screen_note',
  DOOR_TRIM: 'door_trim',
});

function isModeKey(key: string): key is keyof typeof MODES {
  return Object.prototype.hasOwnProperty.call(MODES, key);
}

/** Return the canonical mode id for a given mode key. */
export function getModeId(key: string): string | undefined {
  const k = String(key || '').trim();
  if (!k) return undefined;
  return isModeKey(k) ? MODES[k] : undefined;
}

/** Return the canonical modes map. */
export function getModes(): ModeMap {
  return MODES;
}
