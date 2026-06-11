// Focused canvas-picking support owner for meta/history wrappers and app-string
// normalization. Error/reporting policy is delegated to the dedicated error seam.

import type { ActionMetaLike, UnknownRecord, AppContainer } from '../../../types';
import { appStr, historyBatch } from '../runtime/app_helpers.js';
import { metaNoBuild, metaUiOnly } from '../runtime/meta_profiles_access.js';

import { __wp_reportPickingIssue } from './canvas_picking_core_support_errors.js';
import { __wp_asRecord } from './canvas_picking_core_support_records.js';

export function __wp_metaUiOnly(
  App: AppContainer,
  source: string,
  meta?: ActionMetaLike | UnknownRecord
): ActionMetaLike {
  const src = source || 'meta:uiOnly';
  try {
    return __wp_asRecord(metaUiOnly(App, meta, src)) || Object.assign({ source: src }, meta || {});
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking.meta', op: 'uiOnly', throttleMs: 2000 });
  }
  return Object.assign({ source: src }, meta || {});
}

export function __wp_metaNoBuild(
  App: AppContainer,
  source: string,
  meta?: ActionMetaLike | UnknownRecord
): ActionMetaLike {
  const src = source || 'meta:noBuild';
  try {
    return __wp_asRecord(metaNoBuild(App, meta, src)) || Object.assign({ source: src }, meta || {});
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking.meta', op: 'noBuild', throttleMs: 2000 });
  }
  return Object.assign({ source: src }, meta || {});
}

export function __wp_historyBatch(App: AppContainer, meta: ActionMetaLike, fn: () => unknown): unknown {
  try {
    return historyBatch(App, meta, fn);
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking.history', op: 'batch', throttleMs: 2000 });
  }
  return fn();
}

export function __wp_str(App: AppContainer, v: unknown): string {
  try {
    return appStr(App, v);
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking.utils', op: 'str', throttleMs: 2000 });
  }
  return String(v ?? '');
}
