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

export function readUiRawNumberFromStore(store: unknown, key: UiRawScalarKey, fallback: number): number {
  const v = readUiRawScalarFromStore(store, key);
  const n = coerceFiniteNumber(v);
  return typeof n === 'number' ? n : fallback;
}

export function readUiRawIntFromStore(store: unknown, key: UiRawScalarKey, fallback: number): number {
  const v = readUiRawScalarFromStore(store, key);
  const n = coerceFiniteInt(v);
  return typeof n === 'number' ? n : fallback;
}

// Convenience: read from store.ui snapshot (not just ui.raw)
export function readUiRawNumberFromStoreUi(store: unknown, key: UiRawScalarKey, fallback: number): number {
  const ui = readUiStateFromStore(store);
  return readUiRawNumberFromSnapshot(ui, key, fallback);
}

export function readUiRawIntFromStoreUi(store: unknown, key: UiRawScalarKey, fallback: number): number {
  const ui = readUiStateFromStore(store);
  return readUiRawIntFromSnapshot(ui, key, fallback);
}

export function readCanonicalUiRawDimsCmFromStore(store: unknown) {
  const ui = readUiStateFromStore(store);
  return readCanonicalUiRawDimsCmFromSnapshot(ui);
}

export function readUiRawDimsCmFromStore(store: unknown) {
  const ui = readUiStateFromStore(store);
  return readUiRawDimsCmFromSnapshot(ui);
}
