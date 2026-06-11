import type {
  ActionMetaLike,
  AppContainer,
  ConfigScalarValueMap,
  SavedColorLike,
} from '../../../../../types';

import {
  setCfgBoardMaterial as setCfgBoardMaterialApi,
  setCfgColorSwatchesOrder as setCfgColorSwatchesOrderApi,
  setCfgGlobalHandleType as setCfgGlobalHandleTypeApi,
  setCfgLibraryMode as setCfgLibraryModeApi,
  setCfgMultiColorMode as setCfgMultiColorModeApi,
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

function setCfgBoardMaterial(
  app: AppContainer,
  value: ConfigScalarValueMap['boardMaterial'] | unknown,
  meta?: ActionMetaLike
): void {
  void setCfgBoardMaterialApi(app, value, meta);
}

function setCfgGlobalHandleType(
  app: AppContainer,
  value: ConfigScalarValueMap['globalHandleType'] | unknown,
  meta?: ActionMetaLike
): void {
  void setCfgGlobalHandleTypeApi(app, value, meta);
}

function setCfgSavedColors(
  app: AppContainer,
  next: Array<SavedColorLike | string> | unknown,
  meta?: ActionMetaLike
): void {
  const normalized = readSavedColorsList(next);
  const colorsNs = getColorsNamespace(app);
  if (typeof colorsNs.setSavedColors === 'function') {
    colorsNs.setSavedColors(normalized, meta);
    return;
  }
  void setCfgSavedColorsApi(app, normalized, meta);
}

function setCfgColorSwatchesOrder(
  app: AppContainer,
  next: Array<string | null | undefined> | unknown,
  meta?: ActionMetaLike
): void {
  const normalized = readColorSwatchesOrder(next);
  const colorsNs = getColorsNamespace(app);
  if (typeof colorsNs.setColorSwatchesOrder === 'function') {
    colorsNs.setColorSwatchesOrder(normalized, meta);
    return;
  }
  void setCfgColorSwatchesOrderApi(app, normalized, meta);
}

function setCfgShowDimensions(app: AppContainer, on: boolean | unknown, meta?: ActionMetaLike): void {
  void setCfgShowDimensionsApi(app, asBoolean(on), meta);
}

function setCfgLibraryMode(app: AppContainer, on: boolean | unknown, meta?: ActionMetaLike): void {
  void setCfgLibraryModeApi(app, asBoolean(on), meta);
}

function setCfgMultiColorMode(app: AppContainer, on: boolean | unknown, meta?: ActionMetaLike): void {
  void setCfgMultiColorModeApi(app, asBoolean(on), meta);
}

export {
  runHistoryBatch,
  setCfgBoardMaterial,
  setCfgColorSwatchesOrder,
  setCfgGlobalHandleType,
  setCfgLibraryMode,
  setCfgMultiColorMode,
  setCfgSavedColors,
  setCfgShowDimensions,
};
