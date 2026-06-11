import {
  getBrowserTimers,
  getDocumentMaybe,
  getTools,
  getWindowMaybe,
  readRuntimeScalarOrDefaultFromApp,
  setDoorsOpen,
  holdOpenForEdit,
  releaseEditHold,
  closeAllLocal,
  closeDrawerById,
  refreshBuilderAfterDoorOps,
  resetAllEditModesViaService,
  reportErrorViaPlatform,
  patchViaActions,
  setHardCloseForMs,
  setHardCloseUntil,
  setModePrimary,
  readConfigLooseScalarFromApp,
} from '../services/api.js';

import type {
  ActionMetaLike,
  ModeActionOptsLike,
  ModeTransitionOptsLike,
  UnknownRecord,
} from '../../../types';

import {
  type AppLike,
  asActiveElement,
  asBody,
  asDocumentWithScroll,
  asWindowScroll,
  getModesMap,
  getPrimaryModeValue,
  getScrollRoot,
  modesReportNonFatal,
  safeUpdateEditToast,
} from './modes_shared.js';
import { applyModeOptsImpl } from './modes_mode_opts.js';

function getGlobalClickMode(App: AppLike): boolean {
  try {
    return !!readRuntimeScalarOrDefaultFromApp(App, 'globalClickMode', true);
  } catch (_e) {
    return true;
  }
}

function setDoorHardCloseUntil(App: AppLike, hard: boolean): void {
  try {
    const delayMs = Number(readConfigLooseScalarFromApp(App, 'DOOR_DELAY_MS', 600));
    if (hard) setHardCloseForMs(App, Number.isFinite(delayMs) ? delayMs : 600, 50);
    else setHardCloseUntil(App, 0);
  } catch (err) {
    modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:setDoorHardCloseUntil', err);
  }
}

function applyDoorPolicy(App: AppLike, opts: ModeTransitionOptsLike): void {
  const gc = getGlobalClickMode(App);

  if (opts.openDoors === true) {
    if (gc) setDoorsOpen(App, true, { touch: true });
    else holdOpenForEdit(App);
    return;
  }

  if (opts.closeDoors === true) {
    const hard = !!(opts.hardCloseDoors === true || opts.hardClose === true);
    setDoorHardCloseUntil(App, hard);

    if (!gc) releaseEditHold(App, { restore: true });

    if (gc) setDoorsOpen(App, false, { touch: true, hardCloseDoors: hard });
    else {
      closeAllLocal(App);
      setDoorsOpen(App, false, { touch: false, hardCloseDoors: hard });
    }
  }
}

function safeBodyCursor(App: AppLike, cursor: string): void {
  try {
    const body = asBody(asDocumentWithScroll(getDocumentMaybe(App))?.body);
    if (!body || !body.style) return;
    body.style.cursor = cursor;
  } catch (_e) {
    // ignore
  }
}

function safeGetScrollTop(App: AppLike): number {
  try {
    const el = getScrollRoot(getDocumentMaybe(App));
    const v = el && typeof el.scrollTop === 'number' ? el.scrollTop : 0;
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  } catch (_e) {
    return 0;
  }
}

function safeRestoreScrollTop(App: AppLike, scrollPos: number): void {
  try {
    const pos = typeof scrollPos === 'number' && Number.isFinite(scrollPos) ? scrollPos : 0;
    const win = asWindowScroll(getWindowMaybe(App));
    if (win && typeof win.scrollTo === 'function') win.scrollTo(0, pos);
    const el = getScrollRoot(getDocumentMaybe(App));
    if (el && typeof el.scrollTop === 'number') el.scrollTop = pos;
  } catch (_e) {
    // ignore
  }
}

function safeBlurActiveElement(App: AppLike): void {
  try {
    const ae = asActiveElement(asDocumentWithScroll(getDocumentMaybe(App))?.activeElement);
    if (ae && typeof ae.blur === 'function') ae.blur();
  } catch (_e) {
    // ignore
  }
}

function applyEnterExitChrome(App: AppLike, opts: ModeTransitionOptsLike): void {
  try {
    if (typeof opts.cursor === 'string' && opts.cursor) safeBodyCursor(App, opts.cursor);
  } catch (err) {
    modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:cursor', err);
  }
  try {
    if (typeof opts.toast === 'string') safeUpdateEditToast(App, opts.toast, true);
  } catch (err) {
    modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:toast', err);
  }
}

function readTransitionUiPatch(opts: ModeTransitionOptsLike): UnknownRecord | null {
  const patch = opts.uiPatch;
  return patch && typeof patch === 'object' && !Array.isArray(patch) ? (patch as UnknownRecord) : null;
}

function readTransitionMeta(opts: ModeTransitionOptsLike, fallbackSource: string): ActionMetaLike {
  const source = typeof opts.source === 'string' && opts.source ? opts.source : fallbackSource;
  const meta: ActionMetaLike = {
    source,
    noBuild: true,
    noHistory: true,
    noAutosave: true,
    noPersist: true,
    noCapture: true,
  };
  if (typeof opts.immediate === 'boolean') meta.immediate = opts.immediate;
  return meta;
}

function commitPrimaryModeTransition(
  App: AppLike,
  nextMode: string,
  modeOpts: ModeActionOptsLike,
  opts: ModeTransitionOptsLike,
  fallbackSource: string
): void {
  const uiPatch = readTransitionUiPatch(opts);
  const meta = readTransitionMeta(opts, fallbackSource);
  if (!uiPatch) {
    setModePrimary(App, nextMode, modeOpts, meta);
    return;
  }

  const applied = patchViaActions(App, { ui: uiPatch, mode: { primary: nextMode, opts: modeOpts } }, meta);
  if (!applied) {
    throw new Error('[WardrobePro] Atomic UI + mode transition requires canonical actions.patch.');
  }
}

function shouldDefaultCloseDoorsOnExit(App: AppLike, currentMode: string): boolean {
  if (!getGlobalClickMode(App)) return false;
  const modes = getModesMap();
  return (
    currentMode === (modes.LAYOUT || 'layout') ||
    currentMode === (modes.MANUAL_LAYOUT || 'manual_layout') ||
    currentMode === (modes.BRACE_SHELVES || 'brace_shelves') ||
    currentMode === (modes.INT_DRAWER || 'int_drawer')
  );
}

function readDividerDrawerOpenId(App: AppLike, currentMode: string): string | null {
  try {
    const modes = getModesMap();
    if (currentMode !== (modes.DIVIDER || 'divider')) return null;
    const tools = getTools(App);
    const id = typeof tools.getDrawersOpenId === 'function' ? tools.getDrawersOpenId() : null;
    return id == null ? null : String(id);
  } catch (err) {
    modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:dividerDrawerId', err);
    return null;
  }
}

function clearDividerDrawerOpenId(App: AppLike, prevDrawerOpenId: string | null): void {
  if (!prevDrawerOpenId) return;
  try {
    if (!getGlobalClickMode(App)) closeDrawerById(App, prevDrawerOpenId);
    const tools = getTools(App);
    if (typeof tools.setDrawersOpenId === 'function') tools.setDrawersOpenId(null);
  } catch (err) {
    modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:clearDividerDrawer', err);
  }
}

function scheduleRemoveDoorRefresh(App: AppLike, nextMode: string): void {
  try {
    const removeDoorModeId = getModesMap().REMOVE_DOOR || 'remove_door';
    if (nextMode !== removeDoorModeId) return;
    getBrowserTimers(App).setTimeout(() => {
      refreshBuilderAfterDoorOps(App, {
        source: 'ui.enterPrimaryMode:removeDoor',
        immediate: true,
        force: true,
        purgeRemovedDoors: true,
        updateShadows: true,
      });
    }, 0);
  } catch (err) {
    modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:removeDoorRefresh', err);
  }
}

export function togglePrimaryModeImpl(App: AppLike, mode: string, opts: ModeActionOptsLike): void {
  if (!App || typeof App !== 'object') return;
  const NONE = getModesMap().NONE ?? 'none';
  const cur = getPrimaryModeValue(App);
  const next = cur === mode ? NONE : mode;

  try {
    setModePrimary(App, next, opts, { source: 'ui:modes:togglePrimaryMode' });
    applyModeOptsImpl(App, next, opts);
  } catch (err) {
    try {
      if (!reportErrorViaPlatform(App, err, 'ui.togglePrimaryMode')) console.error(err);
    } catch (reportErr) {
      modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:togglePrimaryMode', reportErr);
    }
  }
}

export function enterPrimaryModeImpl(
  App: AppLike,
  mode: string | undefined,
  opts: ModeTransitionOptsLike
): void {
  if (!App || typeof App !== 'object') return;

  const NONE = getModesMap().NONE ?? 'none';
  const nextMode = mode || NONE;
  const modeOpts = opts.modeOpts && typeof opts.modeOpts === 'object' ? opts.modeOpts : {};

  try {
    commitPrimaryModeTransition(App, nextMode, modeOpts, opts, 'ui:modes:enterPrimaryMode');
    applyModeOptsImpl(App, nextMode, modeOpts);
  } catch (err) {
    try {
      reportErrorViaPlatform(App, err, 'ui.enterPrimaryMode');
    } catch (reportErr) {
      modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:enterPrimaryMode', reportErr);
    }
  }

  try {
    if (!opts.preserveDoors) applyDoorPolicy(App, opts);
  } catch (err) {
    modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:enterDoorPolicy', err);
  }

  applyEnterExitChrome(App, opts);
  scheduleRemoveDoorRefresh(App, nextMode);
}

export function exitPrimaryModeImpl(
  App: AppLike,
  expectedMode: string | undefined,
  opts: ModeTransitionOptsLike,
  onPrimaryModeChanged: (App: AppLike, prev: string, next: string, opts?: ModeActionOptsLike) => void
): void {
  if (!App || typeof App !== 'object') return;

  const scrollPos = safeGetScrollTop(App);
  safeBlurActiveElement(App);

  const NONE = getModesMap().NONE ?? 'none';
  const currentMode = getPrimaryModeValue(App) || NONE;
  const shouldExit = !expectedMode || currentMode === expectedMode;
  const prevDrawerOpenId = readDividerDrawerOpenId(App, currentMode);

  try {
    if (shouldExit && shouldDefaultCloseDoorsOnExit(App, currentMode)) {
      opts.closeDoors = true;
      opts.openDoors = false;
    }
  } catch (err) {
    modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:defaultCloseDoors', err);
  }

  if (shouldExit) {
    try {
      try {
        commitPrimaryModeTransition(App, NONE, {}, opts, 'ui:modes:exitPrimaryMode');
      } catch (_err) {
        if (readTransitionUiPatch(opts)) throw _err;
        resetAllEditModesViaService(App);
      }
      onPrimaryModeChanged(App, currentMode, NONE, {});
    } catch (err) {
      modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:exitPrimaryMode', err);
    }
    try {
      safeUpdateEditToast(App, null, false);
    } catch (err) {
      modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:clearToast', err);
    }
    try {
      safeBodyCursor(App, 'default');
    } catch (err) {
      modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:clearCursor', err);
    }
  }

  try {
    if (
      shouldExit &&
      opts.openDoors !== true &&
      opts.closeDoors !== true &&
      shouldDefaultCloseDoorsOnExit(App, currentMode)
    ) {
      opts.closeDoors = true;
    }
  } catch (err) {
    modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:defaultCloseDoorsFallback', err);
  }

  try {
    applyDoorPolicy(App, opts);
  } catch (err) {
    modesReportNonFatal('esm/native/ui/modes_transition_policy.ts:applyDoorPolicy', err);
  }

  clearDividerDrawerOpenId(App, shouldExit ? prevDrawerOpenId : null);
  applyEnterExitChrome(App, opts);
  safeRestoreScrollTop(App, scrollPos);
}
