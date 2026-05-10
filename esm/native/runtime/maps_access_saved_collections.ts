import type { ActionMetaLike, SavedColorLike } from '../../../types';

import {
  mapsAccessReportNonFatal,
  normalizeColorSwatchesOrder,
  normalizeSavedColorsList,
} from './maps_access_shared.js';
import type { ColorSwatchesOrderList, SavedColorsList } from './maps_access_shared.js';
import { normalizeSavedColorsSnapshot } from './maps_access_normalizers.js';
import { readMapsBagOrNull } from './maps_access_runtime.js';

export function readSavedColors(App: unknown): Array<SavedColorLike | string> | null {
  const maps = readMapsBagOrNull(App);
  if (!maps) return null;
  try {
    const fn = maps.getSavedColors;
    if (typeof fn === 'function') return normalizeSavedColorsSnapshot(fn.call(maps));
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.readSavedColors.ownerRejected', err, App);
  }
  return null;
}

export function writeSavedColors(App: unknown, colors: SavedColorsList, meta?: ActionMetaLike): boolean {
  const maps = readMapsBagOrNull(App);
  if (!maps) return false;
  try {
    const fn = maps.setSavedColors;
    if (typeof fn === 'function') {
      fn.call(maps, normalizeSavedColorsList(colors), meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeSavedColors.ownerRejected', err, App);
  }
  return false;
}

export function writeColorSwatchesOrder(
  App: unknown,
  order: ColorSwatchesOrderList,
  meta?: ActionMetaLike
): boolean {
  const maps = readMapsBagOrNull(App);
  if (!maps) return false;
  try {
    const fn = maps.setColorSwatchesOrder;
    if (typeof fn === 'function') {
      fn.call(maps, normalizeColorSwatchesOrder(order), meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeColorSwatchesOrder.ownerRejected', err, App);
  }
  return false;
}
