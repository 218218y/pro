import type { AppContainer } from '../../../types';

import { exitNotesDrawModeViaService } from '../runtime/notes_access.js';
import { runPlatformRenderFollowThrough } from '../runtime/platform_access.js';
import {
  clearDrawerRebuildIntent,
  closeDrawerByIdViaService,
  releaseDoorsEditHoldViaService,
  setDoorsOpenViaService,
  suppressGlobalToggleForMs,
} from '../runtime/doors_access.js';
import { setModePrimary } from '../runtime/mode_write_access.js';
import { getUiFeedbackServiceMaybe } from '../runtime/service_access.js';
import { getDocumentMaybe, MODES } from '../runtime/api.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';

import {
  type AppLike,
  asApp,
  getEditStateTools,
  getModes,
  getNoneMode,
  readPreviousMode,
  readPreviousOpenDrawerId,
} from './edit_state_shared.js';
import {
  createEditStateOperationRejectedError,
  reportEditStateNonFatal,
} from './edit_state_observability.js';

export type EditStateResetResult = Readonly<{
  ok: boolean;
  failedOps: readonly string[];
}>;

type EditStateResetTracker = {
  failedOps: string[];
};

function recordResetFailure(
  app: AppContainer,
  tracker: EditStateResetTracker,
  op: string,
  error: unknown
): false {
  tracker.failedOps.push(op);
  reportEditStateNonFatal(app, `reset.${op}`, error);
  return false;
}

function runResetStep(
  app: AppContainer,
  tracker: EditStateResetTracker,
  op: string,
  step: () => unknown,
  opts?: { rejectFalse?: boolean }
): boolean {
  try {
    const result = step();
    if (opts?.rejectFalse === true && result === false) {
      return recordResetFailure(app, tracker, op, createEditStateOperationRejectedError(op));
    }
    return true;
  } catch (error) {
    return recordResetFailure(app, tracker, op, error);
  }
}

function readResetStep<T>(
  app: AppContainer,
  tracker: EditStateResetTracker,
  op: string,
  read: () => T,
  defaultValue: T
): T {
  try {
    return read();
  } catch (error) {
    recordResetFailure(app, tracker, op, error);
    return defaultValue;
  }
}

function exitNotesDrawMode(app: AppContainer, tracker: EditStateResetTracker): void {
  runResetStep(app, tracker, 'notes.exitDrawMode', () => exitNotesDrawModeViaService(app));
}

function resetPrimaryMode(app: AppContainer, noneMode: string, tracker: EditStateResetTracker): void {
  runResetStep(
    app,
    tracker,
    'mode.setPrimaryNone',
    () => setModePrimary(app, noneMode, {}, { source: 'services/edit_state:resetAllEditModes' }),
    { rejectFalse: true }
  );
}

function clearEditUiChrome(app: AppContainer, tracker: EditStateResetTracker): void {
  const feedback = readResetStep(
    app,
    tracker,
    'ui.readFeedbackService',
    () => getUiFeedbackServiceMaybe(app),
    null
  );
  if (typeof feedback?.updateEditStateToast === 'function') {
    runResetStep(app, tracker, 'ui.clearEditStateToast', () => feedback.updateEditStateToast?.(null, false), {
      rejectFalse: true,
    });
  }

  runResetStep(app, tracker, 'ui.resetCursor', () => {
    const doc = getDocumentMaybe(app);
    if (doc?.body?.style) doc.body.style.cursor = 'default';
  });
}

function clearPaintAndInteriorTools(
  app: AppContainer,
  prev: string,
  modes: ReturnType<typeof getModes>,
  tools: ReturnType<typeof getEditStateTools>,
  tracker: EditStateResetTracker
): void {
  if (String(prev) === String(modes.PAINT) && typeof tools?.setPaintColor === 'function') {
    runResetStep(app, tracker, 'tools.clearPaintColor', () => tools.setPaintColor?.(null), {
      rejectFalse: true,
    });
  }

  if (typeof tools?.setInteriorManualTool === 'function') {
    runResetStep(app, tracker, 'tools.clearInteriorManualTool', () => tools.setInteriorManualTool?.(null), {
      rejectFalse: true,
    });
  }
}

function clearDrawerSelection(
  app: AppContainer,
  tools: ReturnType<typeof getEditStateTools>,
  tracker: EditStateResetTracker
): void {
  runResetStep(app, tracker, 'drawers.clearRebuildIntent', () => clearDrawerRebuildIntent(app));

  if (typeof tools?.getDrawersOpenId !== 'function' || typeof tools?.setDrawersOpenId !== 'function') return;

  runResetStep(
    app,
    tracker,
    'drawers.clearOpenSelection',
    () => {
      const current = tools.getDrawersOpenId?.();
      if (typeof current === 'undefined') return true;
      return tools.setDrawersOpenId?.(null);
    },
    { rejectFalse: true }
  );
}

function renderResetState(app: AppContainer, tracker: EditStateResetTracker): void {
  runResetStep(app, tracker, 'render.followThrough', () =>
    runPlatformRenderFollowThrough(app, { updateShadows: true, ensureRenderLoop: false })
  );
}

function resetDoorsRuntime(
  app: AppContainer,
  prev: string,
  prevOpenDrawerId: string | number | null,
  modes: ReturnType<typeof getModes>,
  noneMode: string,
  tracker: EditStateResetTracker
): void {
  const globalClickMode = readResetStep(
    app,
    tracker,
    'doors.readGlobalClickMode',
    () => !!readRuntimeScalarOrDefaultFromApp(app, 'globalClickMode', true),
    true
  );

  if (globalClickMode && prev && prev !== noneMode) {
    runResetStep(app, tracker, 'doors.suppressGlobalToggle', () => suppressGlobalToggleForMs(app, 250));
  }

  const isInteriorEditForDoorClose =
    prev === modes.LAYOUT || prev === modes.MANUAL_LAYOUT || prev === modes.BRACE_SHELVES;
  const isInteriorEditAny = isInteriorEditForDoorClose || prev === modes.DIVIDER;

  if (isInteriorEditAny) {
    if (prev === modes.DIVIDER && prevOpenDrawerId !== null) {
      runResetStep(
        app,
        tracker,
        'doors.closeActiveDrawer',
        () => closeDrawerByIdViaService(app, prevOpenDrawerId, { snap: false }),
        { rejectFalse: true }
      );
    }

    if (globalClickMode) {
      if (isInteriorEditForDoorClose) {
        runResetStep(
          app,
          tracker,
          'doors.closeGlobal',
          () => setDoorsOpenViaService(app, false, { touch: true }),
          { rejectFalse: true }
        );
      }
    } else {
      runResetStep(
        app,
        tracker,
        'doors.releaseEditHold',
        () => releaseDoorsEditHoldViaService(app, { restore: true }),
        { rejectFalse: true }
      );
    }
  } else if (!globalClickMode) {
    runResetStep(
      app,
      tracker,
      'doors.releaseEditHold',
      () => releaseDoorsEditHoldViaService(app, { restore: true }),
      { rejectFalse: true }
    );
  }
}

export function resetAllEditModesWithResult(App: AppLike): EditStateResetResult {
  const app = asApp(App);
  if (!app) return Object.freeze({ ok: false, failedOps: Object.freeze(['app.invalid']) });

  const tracker: EditStateResetTracker = { failedOps: [] };
  const modes = getModes(MODES);
  const tools = readResetStep(app, tracker, 'tools.readService', () => getEditStateTools(app), null);
  const noneMode = getNoneMode(modes);
  const prev = readPreviousMode(app, noneMode);
  const prevOpenDrawerId = readPreviousOpenDrawerId(app, tools);

  resetPrimaryMode(app, noneMode, tracker);
  clearEditUiChrome(app, tracker);
  clearPaintAndInteriorTools(app, prev, modes, tools, tracker);
  clearDrawerSelection(app, tools, tracker);
  renderResetState(app, tracker);
  exitNotesDrawMode(app, tracker);
  resetDoorsRuntime(app, prev, prevOpenDrawerId, modes, noneMode, tracker);

  const failedOps = Object.freeze([...tracker.failedOps]);
  return Object.freeze({ ok: failedOps.length === 0, failedOps });
}

export function resetAllEditModes(App: AppLike): void {
  void resetAllEditModesWithResult(App);
}
