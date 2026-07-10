import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../../../types';

import {
  patchUiLightingState as patchUiLightingStateApi,
  setUiLastSelectedWallColor as setUiLastSelectedWallColorApi,
  setUiLightScalar as setUiLightScalarApi,
} from '../../../services/api.js';
import {
  asBoolean,
  asNumberOrNull,
  asStringOrNull,
  asStringValue,
  emptyRecord,
  getUiNamespace,
  readRecord,
} from './store_actions_state.js';
import { patchUi, patchUiSoft, setUiScalarSoft } from './store_actions_ui_writes.js';
import { formatIdentityValue, readIdentityValue } from '../../../../shared/identity_value_shared.js';
import { readFiniteNumber, readNumericInput } from '../../../../shared/numeric_value_shared.js';

function setUiLastSelectedWallColor(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  void setUiLastSelectedWallColorApi(app, value, meta);
}

function setUiLightScalar(
  app: AppContainer,
  key: 'lightingControl' | 'lastLightPreset' | 'lightAmb' | 'lightDir' | 'lightX' | 'lightY' | 'lightZ',
  value: unknown,
  meta?: ActionMetaLike
): void {
  void setUiLightScalarApi(app, key, value, meta);
}

function patchUiLightingState(app: AppContainer, patch: unknown, meta?: ActionMetaLike): void {
  void patchUiLightingStateApi(app, patch, meta);
}

function setUiSketchModeMirror(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'sketchMode', !!on, meta);
}

function setUiNotesEnabled(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setNotesEnabled === 'function') {
    uiNs.setNotesEnabled(asBoolean(on), meta);
    return;
  }
  setUiScalarSoft(app, 'notesEnabled', !!on, meta);
}

function setUiGlobalClickUi(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setGlobalClickUi === 'function') {
    uiNs.setGlobalClickUi(asBoolean(on), meta);
    return;
  }
  setUiScalarSoft(app, 'globalClickMode', !!on, meta);
}

function setUiDarkMode(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setDarkMode === 'function') {
    uiNs.setDarkMode(asBoolean(on), meta);
    return;
  }
  setUiScalarSoft(app, 'darkMode', !!on, meta);
}

function setUiShowContents(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setShowContents === 'function') {
    uiNs.setShowContents(asBoolean(on), meta);
    return;
  }
  const next = !!on;
  patchUi(app, { showContents: next, showHanger: next ? false : true }, meta);
}

function setUiShowHanger(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setShowHanger === 'function') {
    uiNs.setShowHanger(asBoolean(on), meta);
    return;
  }
  const next = !!on;
  patchUi(app, next ? { showHanger: true, showContents: false } : { showHanger: false }, meta);
}

function setUiCurrentFloorType(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setCurrentFloorType === 'function') {
    uiNs.setCurrentFloorType(asStringValue(value), meta);
    return;
  }
  setUiScalarSoft(app, 'currentFloorType', asStringValue(value), meta);
}

function setUiCurrentLayoutType(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setCurrentLayoutType === 'function') {
    uiNs.setCurrentLayoutType(asStringValue(value), meta);
    return;
  }
  setUiScalarSoft(app, 'currentLayoutType', asStringValue(value), meta);
}

function setUiGridDivisionsState(
  app: AppContainer,
  divisions: unknown,
  perCellGridMap: unknown,
  activeGridCellId: unknown,
  meta?: ActionMetaLike
): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setGridDivisionsState === 'function') {
    uiNs.setGridDivisionsState(
      asNumberOrNull(divisions),
      readRecord(perCellGridMap) || emptyRecord(),
      formatIdentityValue(readIdentityValue(activeGridCellId)) || null,
      meta
    );
    return;
  }
  const divsNum = readFiniteNumber(readNumericInput(divisions));
  const divs = Number.isFinite(divsNum) ? divsNum : 4;
  const patch: UnknownRecord = { currentGridDivisions: divs };
  if (perCellGridMap && typeof perCellGridMap === 'object' && !Array.isArray(perCellGridMap)) {
    patch.perCellGridMap = perCellGridMap;
  }
  if (typeof activeGridCellId !== 'undefined') {
    patch.activeGridCellId = formatIdentityValue(readIdentityValue(activeGridCellId)) || null;
  }
  patchUiSoft(app, patch, meta);
}

function setUiGridShelfVariantState(app: AppContainer, variant: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setGridShelfVariantState === 'function') {
    uiNs.setGridShelfVariantState(asStringOrNull(variant), meta);
    return;
  }
  const raw = asStringValue(variant);
  const normalized = raw.trim().toLowerCase();
  const next =
    normalized === 'regular' || normalized === 'double' || normalized === 'glass' || normalized === 'brace'
      ? normalized
      : 'regular';
  setUiScalarSoft(app, 'currentGridShelfVariant', next, meta);
}

function setUiExtDrawerSelection(
  app: AppContainer,
  drawerType: unknown,
  count: unknown,
  meta?: ActionMetaLike
): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setExtDrawerSelection === 'function') {
    uiNs.setExtDrawerSelection(asStringOrNull(drawerType), asNumberOrNull(count), meta);
    return;
  }
  const typeValue = asStringValue(drawerType);
  const countNum = readFiniteNumber(readNumericInput(count));
  const nextCount = Number.isFinite(countNum) ? countNum : 2;
  patchUiSoft(app, { currentExtDrawerType: typeValue, currentExtDrawerCount: nextCount }, meta);
}

export {
  patchUiLightingState,
  setUiCurrentFloorType,
  setUiCurrentLayoutType,
  setUiDarkMode,
  setUiExtDrawerSelection,
  setUiGlobalClickUi,
  setUiGridDivisionsState,
  setUiGridShelfVariantState,
  setUiLastSelectedWallColor,
  setUiLightScalar,
  setUiNotesEnabled,
  setUiShowContents,
  setUiShowHanger,
  setUiSketchModeMirror,
};
