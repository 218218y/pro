import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../types';
import { getUiActions } from '../runtime/actions_access_domains.js';
import { patchViaActions } from '../runtime/actions_access_mutations.js';
import { readStoreStateMaybe } from '../runtime/store_surface_access.js';
import { __wp_toast } from './canvas_picking_core_helpers.js';

export const SHOE_DRAWER_BASE_AUTO_NONE_MESSAGE =
  'בגלל שנוספה מגירת נעליים, בסיס הארון השתנה אוטומטית ל"ללא" — בלי צוקל ובלי רגליים.';

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readCurrentBaseType(App: AppContainer): string {
  const state = readStoreStateMaybe<UnknownRecord>(App);
  const ui = asRecord(state?.ui);
  return typeof ui?.baseType === 'string' ? ui.baseType : '';
}

function createAutoBaseNoneMeta(source: string): ActionMetaLike {
  return {
    source: String(source || 'extDrawers.shoe:autoBaseNone'),
    immediate: true,
  };
}

function applyBaseTypeNone(App: AppContainer, meta: ActionMetaLike): boolean {
  const uiActions = getUiActions(App);
  if (uiActions && typeof uiActions.setBaseType === 'function') {
    uiActions.setBaseType('none', meta);
    return true;
  }

  return patchViaActions(App, { ui: { baseType: 'none' } }, meta);
}

export function applyShoeDrawerBaseAutoNoneIfNeeded(App: AppContainer, source: string): boolean {
  if (readCurrentBaseType(App) === 'none') return false;

  const changed = applyBaseTypeNone(App, createAutoBaseNoneMeta(source));
  if (!changed) return false;

  __wp_toast(App, SHOE_DRAWER_BASE_AUTO_NONE_MESSAGE, 'info');
  return true;
}
