import type {
  ActionMetaLike,
  AppContainer,
  UnknownRecord,
  UiRawScalarKey,
  UiRawScalarValueMap,
} from '../../../../../types';
import { buildUiRawScalarPatchFromRecord } from '../../../../../types/ui_raw.js';

import {
  patchUi as patchUiApi,
  patchUiSoft as patchUiSoftApi,
  setUiRawScalar as setUiRawScalarApi,
  setUiScalar as setUiScalarApi,
  setUiScalarSoft as setUiScalarSoftApi,
} from '../../../services/api.js';
import { asBoolean, emptyRecord, getUiNamespace, readRecord } from './store_actions_state.js';

type SetUiRawScalar = {
  <K extends UiRawScalarKey>(
    app: AppContainer,
    key: K,
    value: UiRawScalarValueMap[K],
    meta?: ActionMetaLike
  ): void;
  (app: AppContainer, key: string, value: unknown, meta?: ActionMetaLike): void;
};

const setUiRawScalar: SetUiRawScalar = (
  app: AppContainer,
  key: string,
  value: unknown,
  meta?: ActionMetaLike
): void => {
  void setUiRawScalarApi(app, key, value, meta);
};

function patchUi(app: AppContainer, patch: UnknownRecord | unknown, meta?: ActionMetaLike): void {
  void patchUiApi(app, readRecord(patch) || emptyRecord(), meta);
}

function patchUiSoft(app: AppContainer, patch: UnknownRecord | unknown, meta?: ActionMetaLike): void {
  void patchUiSoftApi(app, readRecord(patch) || emptyRecord(), meta);
}

function setUiScalar(app: AppContainer, key: string, value: unknown, meta?: ActionMetaLike): void {
  void setUiScalarApi(app, key, value, meta);
}

function setUiScalarSoft(app: AppContainer, key: string, value: unknown, meta?: ActionMetaLike): void {
  void setUiScalarSoftApi(app, key, value, meta);
}

function setUiFlag(app: AppContainer, key: string, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setFlag === 'function') {
    uiNs.setFlag(key, asBoolean(on), meta);
    return;
  }
  setUiScalar(app, key, !!on, meta);
}

function applyUiRawScalarPatch(app: AppContainer, patch: unknown, meta?: ActionMetaLike): void {
  const rec = buildUiRawScalarPatchFromRecord(patch);
  const keys = Object.keys(rec);
  if (!keys.length) return;
  if (keys.length === 1) {
    const key = keys[0];
    setUiRawScalar(app, key, rec[key], meta);
    return;
  }
  patchUiSoft(app, { raw: rec }, meta);
}

function applyUiSoftScalarPatch(app: AppContainer, patch: unknown, meta?: ActionMetaLike): void {
  const rec = readRecord(patch) || emptyRecord();
  const keys = Object.keys(rec);
  if (!keys.length) return;
  if (keys.length === 1) {
    const key = keys[0];
    setUiScalarSoft(app, key, rec[key], meta);
    return;
  }
  patchUiSoft(app, rec, meta);
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
