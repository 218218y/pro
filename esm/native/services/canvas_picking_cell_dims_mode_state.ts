import type { AppContainer, UnknownRecord } from '../../../types';
import { readModeStateFromApp } from '../runtime/root_state_access.js';

function asRecord(value: unknown): UnknownRecord | null {
  return !!value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

/**
 * Read the canonical per-cell door-count edit mode from the root mode state.
 * `null` means dimensions-only mode.
 */
export function readCellDimsDoorCountMode(App: AppContainer): 1 | 2 | null {
  const mode = asRecord(readModeStateFromApp(App));
  const opts = asRecord(mode?.opts);
  return opts?.cellDoorCount === 1 || opts?.cellDoorCount === 2 ? opts.cellDoorCount : null;
}
