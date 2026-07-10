import type { ActionMetaLike, AppContainer } from '../../../../../types';

import {
  setCfgBoardMaterial as setCfgBoardMaterialApi,
  setCfgDoorMountMode as setCfgDoorMountModeApi,
  setCfgColorSwatchesOrder as setCfgColorSwatchesOrderApi,
  setCfgGlobalHandleType as setCfgGlobalHandleTypeApi,
  setCfgLibraryMode as setCfgLibraryModeApi,
  setCfgMultiColorMode as setCfgMultiColorModeApi,
  setCfgMirrorReflectorEnabled as setCfgMirrorReflectorEnabledApi,
  setCfgSavedColors as setCfgSavedColorsApi,
  setCfgShowDimensions as setCfgShowDimensionsApi,
} from '../../../services/api.js';
import {
  asBoolean,
  getColorsNamespace,
  getHistoryNamespace,
  readColorSwatchesOrder,
  readSavedColorsList,
} from './store_actions_state.js';

function runHistoryBatch(app: AppContainer, fn: () => void, meta?: ActionMetaLike): void {
  const historyNs = getHistoryNamespace(app);
  if (typeof historyNs.batch === 'function') {
    historyNs.batch(fn, meta);
    return;
  }
  fn();
}

function setCfgBoardMaterial(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  void setCfgBoardMaterialApi(app, value, meta);
}

function setCfgDoorMountMode(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  void setCfgDoorMountModeApi(app, value, meta);
}

function setCfgGlobalHandleType(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  void setCfgGlobalHandleTypeApi(app, value, meta);
}

function setCfgSavedColors(app: AppContainer, next: unknown, meta?: ActionMetaLike): void {
  const normalized = readSavedColorsList(next);
  const colorsNs = getColorsNamespace(app);
  if (typeof colorsNs.setSavedColors === 'function') {
    colorsNs.setSavedColors(normalized, meta);
    return;
  }
  void setCfgSavedColorsApi(app, normalized, meta);
}

function setCfgColorSwatchesOrder(app: AppContainer, next: unknown, meta?: ActionMetaLike): void {
  const normalized = readColorSwatchesOrder(next);
  const colorsNs = getColorsNamespace(app);
  if (typeof colorsNs.setColorSwatchesOrder === 'function') {
    colorsNs.setColorSwatchesOrder(normalized, meta);
    return;
  }
  void setCfgColorSwatchesOrderApi(app, normalized, meta);
}

function setCfgShowDimensions(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  void setCfgShowDimensionsApi(app, asBoolean(on), meta);
}

function setCfgMirrorReflectorEnabled(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  void setCfgMirrorReflectorEnabledApi(app, asBoolean(on), meta);
}

function setCfgLibraryMode(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  void setCfgLibraryModeApi(app, asBoolean(on), meta);
}

function setCfgMultiColorMode(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  void setCfgMultiColorModeApi(app, asBoolean(on), meta);
}

export {
  runHistoryBatch,
  setCfgBoardMaterial,
  setCfgDoorMountMode,
  setCfgColorSwatchesOrder,
  setCfgGlobalHandleType,
  setCfgLibraryMode,
  setCfgMultiColorMode,
  setCfgMirrorReflectorEnabled,
  setCfgSavedColors,
  setCfgShowDimensions,
};
