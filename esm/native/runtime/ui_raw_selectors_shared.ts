// Shared canonical ui.raw selector contracts (ESM)

import type { UiRawInputsLike, UnknownRecord } from '../../../types/index.js';
import { cloneUiRawInputs } from '../../../types/ui_raw.js';
import { coerceFiniteInt, coerceFiniteNumber } from './num_coerce.js';
import { asRecord as asUnknownRecord } from './record.js';

export type MutableUiSnapshotLike = UnknownRecord & { raw?: unknown };

export function isObj(v: unknown): v is UnknownRecord {
  return !!asUnknownRecord(v);
}

export function isUiSnapshot(ui: unknown): ui is MutableUiSnapshotLike {
  return isObj(ui);
}

export function getRawFromUiSnapshot(ui: unknown): UiRawInputsLike {
  try {
    if (!isUiSnapshot(ui)) return {};
    return cloneUiRawInputs(ui.raw);
  } catch {
    return {};
  }
}

export { coerceFiniteNumber, coerceFiniteInt };
