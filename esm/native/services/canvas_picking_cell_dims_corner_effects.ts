import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../types';

import { getUiFeedback } from '../runtime/service_access.js';
import { requestBuilderStructuralRefresh } from '../runtime/builder_service_access.js';
import { setCfgCornerConfiguration } from '../runtime/cfg_access.js';
import { patchUiSoft } from '../runtime/ui_write_access.js';
import { __wp_commitHistoryTouch, __wp_metaNoBuild } from './canvas_picking_core_helpers.js';
import { sanitizeCornerCellListForPatch } from '../features/modules_configuration/corner_cells_api.js';
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

export function createHistoryableNoBuildMeta(App: AppContainer, source: string): ActionMetaLike {
  return __wp_metaNoBuild(App, source, { immediate: true });
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
  try {
    const meta = createHistoryableNoBuildMeta(App, source);
    setCfgCornerConfiguration(App, nextCornerCfg, meta);
  } catch (_e) {
    reportCornerDimsIssue(App, _e, op);
  }
}

export function syncCornerUi(App: AppContainer, uiPatch: UnknownRecord, source: string, op: string): void {
  try {
    if (Object.keys(uiPatch).length === 0) return;
    const uiMeta = createHistoryableNoBuildMeta(App, source);
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
    requestBuilderStructuralRefresh(App, {
      source,
      immediate: true,
      force: true,
      triggerRender: true,
      updateShadows: false,
    });
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
  modsPrev: UnknownRecord[]
): void {
  nextCornerCfg.modulesConfiguration = sanitizeCornerCellListForPatch(modsNext, modsPrev);
}
