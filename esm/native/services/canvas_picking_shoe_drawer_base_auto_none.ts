import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../types';
import {
  SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY,
  configHasShoeDrawers,
  getShoeDrawerBaseTypeLabel,
  normalizeShoeDrawerBaseType,
  type ShoeDrawerBaseType,
} from '../features/shoe_drawer_base_constraint.js';
import { patchViaActions } from '../runtime/actions_access_mutations.js';
import { readStoreStateMaybe } from '../runtime/store_surface_access.js';
import { __wp_toast } from './canvas_picking_core_helpers.js';

export const SHOE_DRAWER_BASE_AUTO_NONE_MESSAGE =
  'בגלל שנוספה מגירת נעליים, בסיס הארון השתנה אוטומטית ל"ללא" — בלי צוקל ובלי רגליים.';

export function getShoeDrawerBaseAutoRestoreMessage(baseType: unknown): string {
  return `מגירות הנעליים הוסרו, ולכן בסיס הארון חזר לבסיס שנבחר לפני מגירות הנעליים: ${getShoeDrawerBaseTypeLabel(baseType)}.`;
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readCurrentUi(App: AppContainer): UnknownRecord | null {
  const state = readStoreStateMaybe<UnknownRecord>(App);
  return asRecord(state?.ui);
}

function readCurrentConfig(App: AppContainer): UnknownRecord | null {
  const state = readStoreStateMaybe<UnknownRecord>(App);
  return asRecord(state?.config);
}

function readCurrentBaseType(App: AppContainer): ShoeDrawerBaseType {
  return normalizeShoeDrawerBaseType(readCurrentUi(App)?.baseType);
}

function readPreviousAutoBaseType(App: AppContainer): ShoeDrawerBaseType | null {
  const ui = readCurrentUi(App);
  const value = ui ? ui[SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY] : null;
  if (value == null || value === '') return null;
  const normalized = normalizeShoeDrawerBaseType(value);
  return normalized === 'none' ? null : normalized;
}

function createShoeDrawerBaseMeta(source: string): ActionMetaLike {
  return {
    source: String(source || 'extDrawers.shoe:autoBaseNone'),
    immediate: true,
  };
}

function patchUi(App: AppContainer, patch: UnknownRecord, meta: ActionMetaLike): boolean {
  return patchViaActions(App, { ui: patch }, meta);
}

function applyBaseTypeNone(
  App: AppContainer,
  previousBaseType: ShoeDrawerBaseType,
  meta: ActionMetaLike
): boolean {
  return patchUi(
    App,
    {
      baseType: 'none',
      [SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY]: previousBaseType,
    },
    meta
  );
}

function applyBaseTypeRestore(
  App: AppContainer,
  baseType: ShoeDrawerBaseType,
  meta: ActionMetaLike
): boolean {
  return patchUi(
    App,
    {
      baseType,
      [SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY]: null,
    },
    meta
  );
}

export function appHasShoeDrawers(App: AppContainer): boolean {
  return configHasShoeDrawers(readCurrentConfig(App));
}

export function applyShoeDrawerBaseAutoNoneIfNeeded(App: AppContainer, source: string): boolean {
  const currentBaseType = readCurrentBaseType(App);
  if (currentBaseType === 'none') return false;

  const changed = applyBaseTypeNone(App, currentBaseType, createShoeDrawerBaseMeta(source));
  if (!changed) return false;

  __wp_toast(App, SHOE_DRAWER_BASE_AUTO_NONE_MESSAGE, 'info');
  return true;
}

export function restoreShoeDrawerBaseIfNoShoeDrawersRemain(App: AppContainer, source: string): boolean {
  if (appHasShoeDrawers(App)) return false;

  const previousBaseType = readPreviousAutoBaseType(App);
  if (!previousBaseType) return false;
  if (readCurrentBaseType(App) !== 'none') {
    patchUi(
      App,
      { [SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY]: null },
      createShoeDrawerBaseMeta(`${source}:clearStalePreviousBase`)
    );
    return false;
  }

  const changed = applyBaseTypeRestore(
    App,
    previousBaseType,
    createShoeDrawerBaseMeta(source || 'extDrawers.shoe:autoBaseRestore')
  );
  if (!changed) return false;

  __wp_toast(App, getShoeDrawerBaseAutoRestoreMessage(previousBaseType), 'info');
  return true;
}
