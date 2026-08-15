import type { ActionMetaLike, UnknownRecord } from '../../../../../types';

import { formatIdentityValue, readIdentityValue } from '../../../../shared/identity_value_shared.js';
import { readFiniteNumber, readNumericInput } from '../../../../shared/numeric_value_shared.js';
import type { StoreUiActionRuntime, StoreUiLightScalarKey } from './store_actions_ui_contracts.js';
import {
  asBoolean,
  asNumberOrNull,
  asStringOrNull,
  asStringValue,
  emptyRecord,
  readRecord,
} from './store_actions_value_shared.js';
import { patchUi, patchUiSoft, setUiScalarSoft } from './store_actions_ui_writes.js';

function setUiLastSelectedWallColor(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  runtime.setLastSelectedWallColor(value, meta);
}

function setUiLightScalar(
  runtime: StoreUiActionRuntime,
  key: StoreUiLightScalarKey,
  value: unknown,
  meta?: ActionMetaLike
): void {
  runtime.setLightScalar(key, value, meta);
}

function patchUiLightingState(runtime: StoreUiActionRuntime, patch: unknown, meta?: ActionMetaLike): void {
  runtime.patchLightingState(patch, meta);
}

function setUiSketchModeMirror(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'sketchMode', !!on, meta);
}

function setUiNotesEnabled(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setNotesEnabled === 'function') {
    uiNs.setNotesEnabled(asBoolean(on), meta);
    return;
  }
  setUiScalarSoft(runtime, 'notesEnabled', !!on, meta);
}

function setUiGlobalClickUi(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setGlobalClickUi === 'function') {
    uiNs.setGlobalClickUi(asBoolean(on), meta);
    return;
  }
  setUiScalarSoft(runtime, 'globalClickMode', !!on, meta);
}

function setUiDarkMode(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setDarkMode === 'function') {
    uiNs.setDarkMode(asBoolean(on), meta);
    return;
  }
  setUiScalarSoft(runtime, 'darkMode', !!on, meta);
}

function setUiShowContents(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setShowContents === 'function') {
    uiNs.setShowContents(asBoolean(on), meta);
    return;
  }
  const next = !!on;
  patchUi(runtime, { showContents: next, showHanger: next ? false : true }, meta);
}

function setUiShowHanger(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setShowHanger === 'function') {
    uiNs.setShowHanger(asBoolean(on), meta);
    return;
  }
  const next = !!on;
  patchUi(runtime, next ? { showHanger: true, showContents: false } : { showHanger: false }, meta);
}

function setUiCurrentFloorType(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setCurrentFloorType === 'function') {
    uiNs.setCurrentFloorType(asStringValue(value), meta);
    return;
  }
  setUiScalarSoft(runtime, 'currentFloorType', asStringValue(value), meta);
}

function setUiCurrentLayoutType(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setCurrentLayoutType === 'function') {
    uiNs.setCurrentLayoutType(asStringValue(value), meta);
    return;
  }
  setUiScalarSoft(runtime, 'currentLayoutType', asStringValue(value), meta);
}

function setUiGridDivisionsState(
  runtime: StoreUiActionRuntime,
  divisions: unknown,
  perCellGridMap: unknown,
  activeGridCellId: unknown,
  meta?: ActionMetaLike
): void {
  const uiNs = runtime.readUiActions();
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
  patchUiSoft(runtime, patch, meta);
}

function setUiGridShelfVariantState(
  runtime: StoreUiActionRuntime,
  variant: unknown,
  meta?: ActionMetaLike
): void {
  const uiNs = runtime.readUiActions();
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
  setUiScalarSoft(runtime, 'currentGridShelfVariant', next, meta);
}

function setUiExtDrawerSelection(
  runtime: StoreUiActionRuntime,
  drawerType: unknown,
  count: unknown,
  meta?: ActionMetaLike
): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setExtDrawerSelection === 'function') {
    uiNs.setExtDrawerSelection(asStringOrNull(drawerType), asNumberOrNull(count), meta);
    return;
  }
  const typeValue = asStringValue(drawerType);
  const countNum = readFiniteNumber(readNumericInput(count));
  const nextCount = Number.isFinite(countNum) ? countNum : 2;
  patchUiSoft(runtime, { currentExtDrawerType: typeValue, currentExtDrawerCount: nextCount }, meta);
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
