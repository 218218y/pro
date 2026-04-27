// React UI actions: primary modes (store-first)
//
// Centralized here so React code stays on the canonical UI mode actions path.

import type { AppContainer, UnknownRecord } from '../../../../../types';

import {
  enterPrimaryMode as nativeEnterPrimaryMode,
  exitPrimaryMode as nativeExitPrimaryMode,
} from '../../modes.js';
import { resetAllEditModesViaService } from '../../../services/api.js';
import { readStoreStateMaybe } from '../../../services/api.js';

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

function resetAllEditModes(app: AppContainer): void {
  try {
    resetAllEditModesViaService(app);
  } catch {
    // ignore
  }
}

export function getPrimaryMode(app: AppContainer): string {
  try {
    const p = getModeRecord(app).primary;
    return String(p == null ? 'none' : p);
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

export function enterPrimaryMode(app: AppContainer, modeId: unknown, opts?: UnknownRecord): void {
  resetAllEditModes(app);

  try {
    getNativeModeApi().enter(app, String(modeId), opts || {});
  } catch {
    // ignore
  }
}

export function exitPrimaryMode(app: AppContainer, expectedMode?: unknown, opts?: UnknownRecord): void {
  try {
    getNativeModeApi().exit(app, expectedMode == null ? undefined : String(expectedMode), opts || {});
  } catch {
    // ignore
  }
}
