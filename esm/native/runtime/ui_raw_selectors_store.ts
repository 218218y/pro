// ui.raw store adapters (ESM)
//
// Keeps store/root-state access separate from pure snapshot/canonical readers.

import type { UiRawScalarKey } from '../../../types/index.js';
import { readUiRawScalarFromStore, readUiStateFromStore } from './root_state_access.js';
import { coerceFiniteInt, coerceFiniteNumber } from './ui_raw_selectors_shared.js';
import { readCanonicalUiRawDimsCmFromSnapshot } from './ui_raw_selectors_canonical.js';
import {
  readUiRawDimsCmFromSnapshot,
  readUiRawIntFromSnapshot,
  readUiRawNumberFromSnapshot,
} from './ui_raw_selectors_snapshot.js';

export function readUiRawNumberFromStore(store: unknown, key: UiRawScalarKey, defaultValue: number): number {
  const v = readUiRawScalarFromStore(store, key);
  const n = coerceFiniteNumber(v);
  return typeof n === 'number' ? n : defaultValue;
}

export function readUiRawIntFromStore(store: unknown, key: UiRawScalarKey, defaultValue: number): number {
  const v = readUiRawScalarFromStore(store, key);
  const n = coerceFiniteInt(v);
  return typeof n === 'number' ? n : defaultValue;
}

// Convenience: read from store.ui snapshot (not just ui.raw)
export function readUiRawNumberFromStoreUi(
  store: unknown,
  key: UiRawScalarKey,
  defaultValue: number
): number {
  const ui = readUiStateFromStore(store);
  return readUiRawNumberFromSnapshot(ui, key, defaultValue);
}

export function readUiRawIntFromStoreUi(store: unknown, key: UiRawScalarKey, defaultValue: number): number {
  const ui = readUiStateFromStore(store);
  return readUiRawIntFromSnapshot(ui, key, defaultValue);
}

export function readCanonicalUiRawDimsCmFromStore(store: unknown) {
  const ui = readUiStateFromStore(store);
  return readCanonicalUiRawDimsCmFromSnapshot(ui);
}

export function readUiRawDimsCmFromStore(store: unknown) {
  const ui = readUiStateFromStore(store);
  return readUiRawDimsCmFromSnapshot(ui);
}
