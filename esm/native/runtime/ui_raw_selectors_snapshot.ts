// Tolerant ui.raw snapshot readers (ESM)
//
// These helpers intentionally allow legacy `ui.*` fallback. Canonical live/build
// paths must use the canonical owner instead.

import type { UiRawInputsLike, UiRawScalarKey, UiRawScalarValueMap } from '../../../types/index.js';
import {
  coerceFiniteInt,
  coerceFiniteNumber,
  ensureMutableRawInputs,
  getRawFromUiSnapshot,
  isUiSnapshot,
  readUiDirectScalar,
  readUiScalarValue,
  type EssentialUiDimKey,
} from './ui_raw_selectors_shared.js';
import {
  DEFAULT_CHEST_DRAWERS_COUNT,
  DEFAULT_HEIGHT,
  DEFAULT_HINGED_DOORS,
  DEFAULT_WIDTH,
  HINGED_DEFAULT_DEPTH,
} from '../../shared/wardrobe_dimension_tokens_shared.js';

/**
 * Read a raw scalar from a UI snapshot.
 *
 * Rules:
 * - Prefer ui.raw[key] when it exists (even if null).
 * - Otherwise fall back to ui[key].
 */
export function readUiRawScalarFromSnapshot<K extends UiRawScalarKey>(
  ui: unknown,
  key: K
): UiRawScalarValueMap[K] | undefined {
  try {
    if (!isUiSnapshot(ui)) return undefined;
    const raw = getRawFromUiSnapshot(ui);
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      return readUiScalarValue(key, raw[key]);
    }
    return readUiDirectScalar(ui, key);
  } catch {
    return undefined;
  }
}

export function hasEssentialUiDimsFromSnapshot(ui: unknown): boolean {
  try {
    const w = readUiRawScalarFromSnapshot(ui, 'width');
    const h = readUiRawScalarFromSnapshot(ui, 'height');
    const d = readUiRawScalarFromSnapshot(ui, 'depth');
    const doors = readUiRawScalarFromSnapshot(ui, 'doors');
    return !(w === undefined || h === undefined || d === undefined || doors === undefined);
  } catch {
    return false;
  }
}

export function ensureUiRawDimsFromSnapshot(ui: unknown): UiRawInputsLike {
  try {
    if (!isUiSnapshot(ui)) return {};
    const raw = ensureMutableRawInputs(ui);

    // Fill raw.* from ui.* if missing (legacy snapshots sometimes persisted only normalized fields).
    const keys: EssentialUiDimKey[] = ['doors', 'width', 'height', 'depth', 'chestDrawersCount'];
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(raw, key) || raw[key] === undefined) {
        const value = readUiDirectScalar(ui, key);
        if (typeof value !== 'undefined') {
          raw[key] = value;
        }
      }
    }
    return raw;
  } catch {
    return {};
  }
}

export function readUiRawNumberFromSnapshot(ui: unknown, key: UiRawScalarKey, fallback: number): number {
  const v = readUiRawScalarFromSnapshot(ui, key);
  const n = coerceFiniteNumber(v);
  return typeof n === 'number' ? n : fallback;
}

export function readUiRawIntFromSnapshot(ui: unknown, key: UiRawScalarKey, fallback: number): number {
  const v = readUiRawScalarFromSnapshot(ui, key);
  const n = coerceFiniteInt(v);
  return typeof n === 'number' ? n : fallback;
}

// Batch helper (handy for chest/door flows)
export function readUiRawDimsCmFromSnapshot(ui: unknown): {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  chestDrawersCount: number;
} {
  const widthCm = readUiRawNumberFromSnapshot(ui, 'width', DEFAULT_WIDTH);
  const heightCm = readUiRawNumberFromSnapshot(ui, 'height', DEFAULT_HEIGHT);
  const depthCm = readUiRawNumberFromSnapshot(ui, 'depth', HINGED_DEFAULT_DEPTH);
  const doorsCount = readUiRawIntFromSnapshot(ui, 'doors', DEFAULT_HINGED_DOORS);
  const chestDrawersCount = readUiRawIntFromSnapshot(ui, 'chestDrawersCount', DEFAULT_CHEST_DRAWERS_COUNT);
  return { widthCm, heightCm, depthCm, doorsCount, chestDrawersCount };
}
