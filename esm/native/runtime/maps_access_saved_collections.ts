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

export async function writeSavedColors(
  App: unknown,
  colors: SavedColorsList,
  meta?: ActionMetaLike
): Promise<boolean> {
  const maps = readMapsBagOrNull(App);
  if (!maps) return false;
  try {
    const fn = maps.setSavedColors;
    if (typeof fn === 'function') {
      const result = await fn.call(maps, normalizeSavedColorsList(colors), meta);
      return result !== undefined && result !== false;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeSavedColors.ownerRejected', err, App);
  }
  return false;
}

export async function writeSavedColorsOrThrow(
  App: unknown,
  colors: SavedColorsList,
  meta?: ActionMetaLike
): Promise<unknown> {
  const maps = readMapsBagOrNull(App);
  const writer = maps?.setSavedColors;
  if (!maps || typeof writer !== 'function') {
    throw new Error('[WardrobePro] Saved collections write requires canonical App.maps.setSavedColors.');
  }
  const result = await writer.call(maps, normalizeSavedColorsList(colors), meta);
  if (result === false || typeof result === 'undefined') {
    throw new Error('[WardrobePro] Canonical App.maps.setSavedColors did not confirm the write.');
  }
  return result;
}

export async function writeColorSwatchesOrder(
  App: unknown,
  order: ColorSwatchesOrderList,
  meta?: ActionMetaLike
): Promise<boolean> {
  const maps = readMapsBagOrNull(App);
  if (!maps) return false;
  try {
    const fn = maps.setColorSwatchesOrder;
    if (typeof fn === 'function') {
      const result = await fn.call(maps, normalizeColorSwatchesOrder(order), meta);
      return result !== undefined && result !== false;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeColorSwatchesOrder.ownerRejected', err, App);
  }
  return false;
}

export async function writeColorSwatchesOrderOrThrow(
  App: unknown,
  order: ColorSwatchesOrderList,
  meta?: ActionMetaLike
): Promise<unknown> {
  const maps = readMapsBagOrNull(App);
  const writer = maps?.setColorSwatchesOrder;
  if (!maps || typeof writer !== 'function') {
    throw new Error(
      '[WardrobePro] Saved collections write requires canonical App.maps.setColorSwatchesOrder.'
    );
  }
  const result = await writer.call(maps, normalizeColorSwatchesOrder(order), meta);
  if (result === false || typeof result === 'undefined') {
    throw new Error('[WardrobePro] Canonical App.maps.setColorSwatchesOrder did not confirm the write.');
  }
  return result;
}
