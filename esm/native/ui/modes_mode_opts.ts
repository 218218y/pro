import { getTools, patchUiSoft, snapDrawersToTargets, getDrawersArray } from '../services/api.js';

import type { ModeActionOptsLike } from '../../../types';

import {
  type AppLike,
  getModesMap,
  getNullableStringProp,
  getStringProp,
  getNumberProp,
  isRecord,
  modesReportNonFatal,
} from './modes_shared.js';

function applyHandleModeOpts(App: AppLike, opts: ModeActionOptsLike): void {
  const handleType = getNullableStringProp(opts, 'handleType');
  const tools = getTools(App);
  if (handleType != null && typeof tools.setHandlesType === 'function') {
    tools.setHandlesType(handleType, { source: 'modes:handleType' });
  }
}

function applyLayoutModeOpts(App: AppLike, opts: ModeActionOptsLike): void {
  const layoutType = getStringProp(opts, 'layoutType');
  if (!layoutType) return;
  try {
    patchUiSoft(App, { currentLayoutType: layoutType }, { source: 'modes:layoutType' });
  } catch (err) {
    modesReportNonFatal(App, 'esm/native/ui/modes_mode_opts.ts:layoutType', err);
  }
}

function applySketchManualToolSnap(App: AppLike): void {
  try {
    snapDrawersToTargets(App);
  } catch (_e1) {
    const arr = getDrawersArray(App);
    if (!arr) return;
    for (const d of arr) {
      if (!d || !d.group || !d.closed) continue;
      const ud = d.group && d.group.userData ? d.group.userData : null;
      const isExt = !!(ud && ud.__wpType === 'extDrawer');
      if (isExt) continue;
      try {
        d.isOpen = false;
      } catch (_e2) {
        // ignore
      }
      try {
        if (d.group.position && typeof d.group.position.copy === 'function') d.group.position.copy(d.closed);
      } catch (_e3) {
        // ignore
      }
    }
  }
}

function applyManualLayoutModeOpts(App: AppLike, opts: ModeActionOptsLike): void {
  const manualTool = getNullableStringProp(opts, 'manualTool');
  const tools = getTools(App);
  if (manualTool != null && typeof tools.setInteriorManualTool === 'function') {
    tools.setInteriorManualTool(manualTool);
  }

  try {
    const mt = typeof manualTool === 'string' ? String(manualTool) : '';
    if (!mt.startsWith('sketch_')) return;
    try {
      if (tools && typeof tools.setDrawersOpenId === 'function') tools.setDrawersOpenId(null);
    } catch (_e0) {
      // ignore
    }
    applySketchManualToolSnap(App);
  } catch (err) {
    modesReportNonFatal(App, 'esm/native/ui/modes_mode_opts.ts:sketchSnap', err);
  }
}

function applyExtDrawerModeOpts(App: AppLike, opts: ModeActionOptsLike): void {
  try {
    const patch: Record<string, unknown> = {};
    const extDrawerType = opts['extDrawerType'];
    if (extDrawerType != null) patch.currentExtDrawerType = extDrawerType;

    const extDrawerCount = getNumberProp(opts, 'extDrawerCount');
    if (typeof extDrawerCount === 'number') patch.currentExtDrawerCount = extDrawerCount;

    if (Object.keys(patch).length) patchUiSoft(App, patch, { source: 'modes:extDrawerOpts' });
  } catch (err) {
    modesReportNonFatal(App, 'esm/native/ui/modes_mode_opts.ts:extDrawerOpts', err);
  }
}

export function applyModeOptsImpl(App: AppLike, mode: string, opts?: ModeActionOptsLike): void {
  if (!App || typeof App !== 'object') return;
  const modes = getModesMap();
  const cleanOpts: ModeActionOptsLike = isRecord(opts) ? { ...opts } : {};

  try {
    if (mode === modes.HANDLE) applyHandleModeOpts(App, cleanOpts);
    if (mode === modes.LAYOUT) applyLayoutModeOpts(App, cleanOpts);
    if (mode === modes.MANUAL_LAYOUT) applyManualLayoutModeOpts(App, cleanOpts);
    if (mode === modes.EXT_DRAWER) applyExtDrawerModeOpts(App, cleanOpts);
  } catch (err) {
    modesReportNonFatal(App, 'esm/native/ui/modes_mode_opts.ts:apply', err);
  }
}
