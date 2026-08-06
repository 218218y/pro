// React UI actions: primary modes (store-first)
//
// Centralized here so React code stays on the canonical UI mode actions path.

import type { AppContainer, UnknownRecord } from '../../../../../types';

import {
  enterPrimaryMode as nativeEnterPrimaryMode,
  exitPrimaryMode as nativeExitPrimaryMode,
} from '../../modes.js';
import { readStoreStateMaybe, reportError, resetAllEditModesViaService } from '../../../services/api.js';

type StoreStateLike = {
  mode?: unknown;
};

type NativeModeApi = {
  enter: (app: AppContainer, modeId: string, opts: UnknownRecord) => void;
  exit: (app: AppContainer, expectedMode?: string, opts?: UnknownRecord) => void;
};

function asRec(v: unknown): UnknownRecord {
  return v && typeof v === 'object' && !Array.isArray(v) ? { ...v } : {};
}

function readStoreState(app: AppContainer): StoreStateLike | null {
  try {
    return readStoreStateMaybe<StoreStateLike>(app);
  } catch {
    return null;
  }
}

function toNativeModeApp(app: AppContainer): Parameters<typeof nativeEnterPrimaryMode>[0] {
  const { render: _render, ...rest } = app;
  return {
    ...rest,
    render: {
      renderer: null,
      scene: null,
      camera: null,
      controls: null,
      wardrobeGroup: null,
      roomGroup: null,
      doorsArray: [],
      drawersArray: [],
      moduleHitBoxes: [],
      _partObjects: [],
    },
  };
}

function getModeRecord(app: AppContainer): UnknownRecord {
  const state = readStoreState(app);
  return asRec(state?.mode);
}

function getNativeModeApi(): NativeModeApi {
  return {
    enter(app, modeId, opts) {
      nativeEnterPrimaryMode(toNativeModeApp(app), modeId, opts);
    },
    exit(app, expectedMode, opts) {
      nativeExitPrimaryMode(toNativeModeApp(app), expectedMode, opts);
    },
  };
}

function reportModeActionFailure(app: AppContainer, op: string, error: unknown): void {
  reportError(
    app,
    error,
    { where: 'native/ui/react/actions/modes_actions', op, fatal: false },
    { consoleOutput: false }
  );
}

function resetAllEditModes(app: AppContainer): boolean {
  try {
    const reset = resetAllEditModesViaService(app);
    if (!reset) {
      reportModeActionFailure(app, 'resetAllEditModes.rejected', new Error('Edit-state reset was rejected'));
    }
    return reset;
  } catch (error) {
    reportModeActionFailure(app, 'resetAllEditModes.ownerRejected', error);
    return false;
  }
}

export function getPrimaryMode(app: AppContainer): string {
  try {
    const p = getModeRecord(app).primary;
    return typeof p === 'string' && p ? p : 'none';
  } catch {
    return 'none';
  }
}

export function getModeState(app: AppContainer): UnknownRecord {
  try {
    return getModeRecord(app);
  } catch {
    return {};
  }
}

export function enterPrimaryMode(app: AppContainer, modeId: string, opts?: UnknownRecord): void {
  if (!resetAllEditModes(app)) return;

  try {
    getNativeModeApi().enter(app, modeId, opts || {});
  } catch (error) {
    reportModeActionFailure(app, 'enterPrimaryMode.ownerRejected', error);
  }
}

export function exitPrimaryMode(app: AppContainer, expectedMode?: string, opts?: UnknownRecord): void {
  try {
    getNativeModeApi().exit(app, expectedMode, opts || {});
  } catch (error) {
    reportModeActionFailure(app, 'exitPrimaryMode.ownerRejected', error);
  }
}
