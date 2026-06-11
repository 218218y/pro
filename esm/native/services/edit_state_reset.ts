import type { AppContainer } from '../../../types';

import { exitNotesDrawModeViaService } from '../runtime/notes_access.js';
import { runPlatformRenderFollowThrough } from '../runtime/platform_access.js';
import {
  closeDrawerByIdViaService,
  releaseDoorsEditHoldViaService,
  setDoorsOpenViaService,
  suppressGlobalToggleForMs,
} from '../runtime/doors_access.js';
import { setModePrimary } from '../runtime/mode_write_access.js';
import { getUiFeedbackServiceMaybe } from '../runtime/service_access.js';
import { getDocumentMaybe, MODES } from '../runtime/api.js';

import {
  type AppLike,
  asApp,
  getEditStateTools,
  getModes,
  getNoneMode,
  readPreviousMode,
  readPreviousOpenDrawerId,
} from './edit_state_shared.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';

function exitNotesDrawMode(App: AppLike): void {
  try {
    exitNotesDrawModeViaService(App);
  } catch {
    // ignore
  }
}

function resetPrimaryMode(app: AppContainer, noneMode: string): void {
  try {
    setModePrimary(app, noneMode, {}, { source: 'services/edit_state:resetAllEditModes' });
  } catch {
    // ignore
  }
}

function clearEditUiChrome(app: AppContainer): void {
  try {
    getUiFeedbackServiceMaybe(app)?.updateEditStateToast?.(null, false);
  } catch {
    // ignore
  }

  try {
    const doc = getDocumentMaybe(app);
    if (doc?.body?.style) doc.body.style.cursor = 'default';
  } catch {
    // ignore
  }
}

function clearPaintAndInteriorTools(
  prev: string,
  modes: ReturnType<typeof getModes>,
  tools: ReturnType<typeof getEditStateTools>
): void {
  try {
    if (String(prev) === String(modes.PAINT) && typeof tools?.setPaintColor === 'function') {
      tools.setPaintColor(null);
    }
  } catch {
    // ignore
  }

  try {
    if (typeof tools?.setInteriorManualTool === 'function') {
      tools.setInteriorManualTool(null);
    }
  } catch {
    // ignore
  }
}

function clearDrawerSelection(tools: ReturnType<typeof getEditStateTools>): void {
  try {
    if (typeof tools?.getDrawersOpenId === 'function' && typeof tools?.setDrawersOpenId === 'function') {
      const cur = tools.getDrawersOpenId();
      if (typeof cur !== 'undefined') tools.setDrawersOpenId(null);
    }
  } catch {
    // ignore
  }
}

function resetDoorsRuntime(
  app: AppContainer,
  prev: string,
  prevOpenDrawerId: string | number | null,
  modes: ReturnType<typeof getModes>,
  noneMode: string
): void {
  try {
    const globalClickMode = !!readRuntimeScalarOrDefaultFromApp(app, 'globalClickMode', true);

    if (globalClickMode && prev && prev !== noneMode) {
      try {
        suppressGlobalToggleForMs(app, 250);
      } catch {
        // ignore
      }
    }

    const isInteriorEditForDoorClose =
      prev === modes.LAYOUT ||
      prev === modes.MANUAL_LAYOUT ||
      prev === modes.BRACE_SHELVES ||
      prev === modes.INT_DRAWER;

    const isInteriorEditAny = isInteriorEditForDoorClose || prev === modes.DIVIDER;

    if (isInteriorEditAny) {
      if (prev === modes.DIVIDER && prevOpenDrawerId !== null) {
        closeDrawerByIdViaService(app, prevOpenDrawerId);
      }

      if (globalClickMode) {
        if (isInteriorEditForDoorClose) {
          setDoorsOpenViaService(app, false, { touch: true });
        }
      } else {
        releaseDoorsEditHoldViaService(app, { restore: true });
      }
    } else if (!globalClickMode) {
      releaseDoorsEditHoldViaService(app, { restore: true });
    }
  } catch {
    // ignore
  }
}

export function resetAllEditModes(App: AppLike): void {
  const app = asApp(App);
  if (!app) return;

  const modes = getModes(MODES);
  const tools = getEditStateTools(app);
  const noneMode = getNoneMode(modes);
  const prev = readPreviousMode(app, noneMode);
  const prevOpenDrawerId = readPreviousOpenDrawerId(tools);

  resetPrimaryMode(app, noneMode);
  clearEditUiChrome(app);
  clearPaintAndInteriorTools(prev, modes, tools);
  clearDrawerSelection(tools);

  runPlatformRenderFollowThrough(app, { updateShadows: true, ensureRenderLoop: false });

  exitNotesDrawMode(app);
  resetDoorsRuntime(app, prev, prevOpenDrawerId, modes, noneMode);
}
