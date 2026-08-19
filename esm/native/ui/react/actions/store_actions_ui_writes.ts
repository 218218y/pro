import type { ActionMetaLike, UiRawScalarKey, UiRawScalarValueMap } from '../../../../../types';
import { buildUiRawScalarPatchFromRecord, UI_RAW_SCALAR_KEYS } from '../../../../../types/ui_raw.js';

import type { StoreUiActionRuntime } from './store_actions_ui_contracts.js';
import { asBoolean, emptyRecord, readRecord } from './store_actions_value_shared.js';

type SetUiRawScalar = {
  <K extends UiRawScalarKey>(
    runtime: StoreUiActionRuntime,
    key: K,
    value: UiRawScalarValueMap[K],
    meta?: ActionMetaLike
  ): void;
  (runtime: StoreUiActionRuntime, key: string, value: unknown, meta?: ActionMetaLike): void;
};

const setUiRawScalar: SetUiRawScalar = (
  runtime: StoreUiActionRuntime,
  key: string,
  value: unknown,
  meta?: ActionMetaLike
): void => {
  runtime.setRawScalar(key, value, meta);
};

function patchUi(runtime: StoreUiActionRuntime, patch: unknown, meta?: ActionMetaLike): void {
  runtime.patch(readRecord(patch) || emptyRecord(), meta);
}

function patchUiSoft(runtime: StoreUiActionRuntime, patch: unknown, meta?: ActionMetaLike): void {
  runtime.patchSoft(readRecord(patch) || emptyRecord(), meta);
}

function setUiScalar(
  runtime: StoreUiActionRuntime,
  key: string,
  value: unknown,
  meta?: ActionMetaLike
): void {
  runtime.setScalar(key, value, meta);
}

function setUiScalarSoft(
  runtime: StoreUiActionRuntime,
  key: string,
  value: unknown,
  meta?: ActionMetaLike
): void {
  runtime.setScalarSoft(key, value, meta);
}

function setUiFlag(runtime: StoreUiActionRuntime, key: string, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setFlag === 'function') {
    uiNs.setFlag(key, asBoolean(on), meta);
    return;
  }
  setUiScalar(runtime, key, !!on, meta);
}

function applyUiRawScalarPatch(runtime: StoreUiActionRuntime, patch: unknown, meta?: ActionMetaLike): void {
  const rec = buildUiRawScalarPatchFromRecord(patch);
  const keys = UI_RAW_SCALAR_KEYS.filter(key => Object.prototype.hasOwnProperty.call(rec, key));
  if (!keys.length) return;
  if (keys.length === 1) {
    const key = keys[0];
    if (!key) return;
    setUiRawScalar(runtime, key, rec[key], meta);
    return;
  }
  patchUiSoft(runtime, { raw: rec }, meta);
}

function applyUiSoftScalarPatch(runtime: StoreUiActionRuntime, patch: unknown, meta?: ActionMetaLike): void {
  const rec = readRecord(patch) || emptyRecord();
  const keys = Object.keys(rec);
  if (!keys.length) return;
  if (keys.length === 1) {
    const key = keys[0];
    if (!key) return;
    setUiScalarSoft(runtime, key, rec[key], meta);
    return;
  }
  patchUiSoft(runtime, rec, meta);
}

export {
  applyUiRawScalarPatch,
  applyUiSoftScalarPatch,
  patchUi,
  patchUiSoft,
  setUiFlag,
  setUiRawScalar,
  setUiScalar,
  setUiScalarSoft,
};
