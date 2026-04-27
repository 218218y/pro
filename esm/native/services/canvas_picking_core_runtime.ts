// Runtime/config helpers for canvas picking.
//
// This module owns mode/ui/config access, map-derived policy, feedback/render
// bridges, and runtime scratch access. Low-level coercion/reporting helpers live
// in canvas_picking_core_support.ts.

import type { AppContainer, UnknownRecord } from '../../../types';
import { getUiFeedback } from '../runtime/service_access.js';
import { runPlatformRenderFollowThrough } from '../runtime/platform_access.js';
import { ensureCanvasPickingRuntime } from '../runtime/canvas_picking_runtime_slot.js';
import {
  readMapOrEmpty,
  isSplitBottomEnabledInMap,
  isSplitEnabledInMap,
  isSplitExplicitInMap,
} from '../runtime/maps_access.js';
import { getCfg, getMode, getUi } from '../kernel/api.js';
import { getModeId } from '../runtime/api_browser_surface.js';
import {
  __wp_asRecord,
  __wp_readRecordString,
  __wp_reportPickingIssue,
} from './canvas_picking_core_support.js';

function __wp_primaryMode(App: AppContainer): string {
  const NONE = getModeId(App, 'NONE') || 'none';
  try {
    const md = __wp_asRecord(getMode(App));
    const p = __wp_readRecordString(md, 'primary');
    return p || NONE;
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking.utils', op: 'primaryMode', throttleMs: 2000 });
  }
  return NONE;
}

function __wp_ui(App: AppContainer): UnknownRecord {
  try {
    return getUi(App) || {};
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking.utils', op: 'ui', throttleMs: 2000 });
    return {};
  }
}

function __wp_cfg(App: AppContainer): UnknownRecord {
  try {
    return getCfg(App) || {};
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking.utils', op: 'cfg', throttleMs: 2000 });
    return {};
  }
}

function __wp_map(App: AppContainer, mapName: string): UnknownRecord {
  mapName = String(mapName || '');
  try {
    return readMapOrEmpty(App, mapName);
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking.utils',
      op: `map.read:${mapName}`,
      throttleMs: 2000,
    });
    return {};
  }
}

function __wp_isSplitBottom(App: AppContainer, doorBaseKey: string): boolean {
  const m = __wp_map(App, 'splitDoorsBottomMap');
  return isSplitBottomEnabledInMap(m, doorBaseKey);
}

function __wp_isSplit(App: AppContainer, doorBaseKey: string): boolean {
  const m = __wp_map(App, 'splitDoorsMap');
  return isSplitEnabledInMap(m, doorBaseKey, true);
}

function __wp_isSplitExplicit(App: AppContainer, doorBaseKey: string): boolean {
  const m = __wp_map(App, 'splitDoorsMap');
  return isSplitExplicitInMap(m, doorBaseKey);
}

function __wp_isMultiMode(App: AppContainer): boolean {
  try {
    const cfg = __wp_cfg(App);
    return !!(cfg && cfg.isMultiColorMode);
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking.utils', op: 'isMultiMode', throttleMs: 2000 });
    return false;
  }
}

function __wp_triggerRender(App: AppContainer, updateShadows?: boolean): void {
  runPlatformRenderFollowThrough(App, { updateShadows, ensureRenderLoop: false });
}

function __wp_toast(App: AppContainer, message: string, type?: string): unknown {
  try {
    const fb = getUiFeedback(App);
    const fn = fb && (fb.toast || fb.showToast);
    if (typeof fn === 'function') return fn(message, type);
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking.ui', op: 'toast.feedback', throttleMs: 1000 });
  }
  return undefined;
}

function __wp_getCanvasPickingRuntime(App: AppContainer): UnknownRecord {
  return ensureCanvasPickingRuntime(App);
}

export {
  __wp_primaryMode,
  __wp_ui,
  __wp_cfg,
  __wp_map,
  __wp_isSplitBottom,
  __wp_isSplit,
  __wp_isSplitExplicit,
  __wp_isMultiMode,
  __wp_triggerRender,
  __wp_toast,
  __wp_getCanvasPickingRuntime,
};
