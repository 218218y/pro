// Canonical mode ids (Pure ESM)
//
// Single source of truth for primary mode string IDs.
// Post-migration policy: callers should NOT read mode IDs from legacy surfaces.

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
  EXT_DRAWER: 'ext_drawer',
  INT_DRAWER: 'int_drawer',
  SCREEN_NOTE: 'screen_note',
  DOOR_TRIM: 'door_trim',
});

function isModeKey(key: string): key is keyof typeof MODES {
  return Object.prototype.hasOwnProperty.call(MODES, key);
}

/**
 * Return the canonical mode id for a given mode key.
 *
 * The `App` parameter is kept for backwards compatibility, but is intentionally ignored.
 */
export function getModeId(_App: unknown, key: string): string | undefined {
  const k = String(key || '').trim();
  if (!k) return undefined;
  return isModeKey(k) ? MODES[k] : undefined;
}

/**
 * Return the canonical modes map.
 *
 * NOTE: The `App` parameter is kept for backwards compatibility with older call sites,
 * but is intentionally ignored (no legacy fallback).
 */
export function getModes(_App: unknown): ModeMap {
  return MODES;
}
