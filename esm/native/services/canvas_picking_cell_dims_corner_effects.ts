import type { AppContainer, UnknownRecord } from '../../../types';

import { getUiFeedback } from '../runtime/service_access.js';
import { getModulesActions } from '../runtime/actions_access.js';
import { patchUiSoft } from '../runtime/ui_write_access.js';
import { __wp_commitHistoryTouch } from './canvas_picking_core_helpers.js';
import { requestCanvasPickingCommitStructuralRefresh } from './canvas_picking_structural_refresh.js';
import { createCanvasPickingCellDimsRefreshGatedMeta } from './canvas_picking_cell_dims_meta.js';
import {
  sanitizeCornerCellListForPatch,
  sanitizeLowerCornerCellListForPatch,
} from '../features/modules_configuration/corner_cells_api.js';
import type { CornerConfigShape } from './canvas_picking_cell_dims_corner_contracts.js';
import { asRecord, reportCornerDimsIssue } from './canvas_picking_cell_dims_corner_context.js';

type FeedbackShape = { updateEditStateToast?: (message: string, sticky?: boolean) => unknown };

function readFeedbackShape(value: unknown): FeedbackShape | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const fn = rec.updateEditStateToast;
  return {
    updateEditStateToast:
      typeof fn === 'function'
        ? (message: string, sticky?: boolean) => Reflect.apply(fn, rec, [message, sticky])
        : undefined,
  };
}

export function readToastFn(App: AppContainer): ((message: string, sticky?: boolean) => unknown) | null {
  const fn = readFeedbackShape(getUiFeedback(App))?.updateEditStateToast ?? null;
  return typeof fn === 'function' ? (message, sticky) => fn(message, sticky) : null;
}

export function patchCornerConfig(
  App: AppContainer,
  nextCornerCfg: CornerConfigShape,
  source: string,
  op: string
): void {
  patchCornerConfigForStack(App, nextCornerCfg, source, op, 'top');
}

export function patchCornerConfigForStack(
  App: AppContainer,
  nextCornerCfg: CornerConfigShape,
  source: string,
  op: string,
  stackKey: 'top' | 'bottom' = 'top'
): void {
  try {
    const meta = createCanvasPickingCellDimsRefreshGatedMeta(App, source);
    const modulesActions = getModulesActions(App);
    const patchForStack = modulesActions?.patchForStack;
    if (typeof patchForStack !== 'function') {
      throw new Error('[WardrobePro][canvas_picking_cell_dims] actions.modules.patchForStack is required.');
    }
    patchForStack(stackKey, 'corner', nextCornerCfg, meta);
  } catch (_e) {
    reportCornerDimsIssue(App, _e, op);
  }
}

export function syncCornerUi(App: AppContainer, uiPatch: UnknownRecord, source: string, op: string): void {
  try {
    if (Object.keys(uiPatch).length === 0) return;
    const uiMeta = createCanvasPickingCellDimsRefreshGatedMeta(App, source);
    patchUiSoft(App, uiPatch, uiMeta);
  } catch (_e) {
    reportCornerDimsIssue(App, _e, op);
  }
}

export function commitCornerHistory(source: string, App: AppContainer): void {
  __wp_commitHistoryTouch(App, source);
}

export function refreshCornerStructure(App: AppContainer, source: string, op: string): void {
  try {
    requestCanvasPickingCommitStructuralRefresh(App, source);
  } catch (_e) {
    reportCornerDimsIssue(App, _e, op);
  }
}

export function showCornerToast(App: AppContainer, message: string, op: string): void {
  try {
    const fn = readToastFn(App);
    if (typeof fn === 'function') fn(message, true);
  } catch (_e) {
    reportCornerDimsIssue(App, _e, op);
  }
}

export function buildCornerCellToastMessage(name: string, parts: string[], suffix = ''): string {
  let msgCore = '';
  if (parts.length === 1) {
    const p0 = parts[0] || '';
    msgCore = p0.startsWith('עודכן') ? `${p0} ${name}` : `${p0} ל-${name}`;
  } else {
    msgCore = `${parts.join(' + ')} ל-${name}`;
  }
  return suffix ? `${msgCore} ${suffix}` : msgCore;
}

export function sanitizeCornerModulesForPatch(
  nextCornerCfg: CornerConfigShape,
  modsNext: UnknownRecord[],
  modsPrev: UnknownRecord[],
  stackKey: 'top' | 'bottom' = 'top'
): void {
  nextCornerCfg.modulesConfiguration =
    stackKey === 'bottom'
      ? sanitizeLowerCornerCellListForPatch(modsNext, modsPrev)
      : sanitizeCornerCellListForPatch(modsNext, modsPrev);
}
