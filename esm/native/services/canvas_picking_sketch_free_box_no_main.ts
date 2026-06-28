import type { AppContainer, UnknownRecord } from '../../../types';
import { getCfg, getUi } from '../kernel/api.js';
import { asRecord, getProp } from '../runtime/record.js';

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readLooseRootState(App: AppContainer): UnknownRecord | null {
  try {
    const app = asRecord(App);
    const store = asRecord(getProp(app, 'store'));
    const getState = getProp(store, 'getState');
    if (typeof getState !== 'function') return null;
    return asRecord(getState.call(store));
  } catch {
    return null;
  }
}

function readUiRecord(App: AppContainer): UnknownRecord | null {
  try {
    return asRecord(getUi(App));
  } catch {
    return asRecord(getProp(readLooseRootState(App), 'ui'));
  }
}

function readConfigRecord(App: AppContainer): UnknownRecord | null {
  try {
    return asRecord(getCfg(App));
  } catch {
    return asRecord(getProp(readLooseRootState(App), 'config'));
  }
}

function readWardrobeType(App: AppContainer): string {
  const cfg = readConfigRecord(App);
  const ui = readUiRecord(App);
  const raw = asRecord(getProp(ui, 'raw'));
  const value = getProp(cfg, 'wardrobeType') ?? getProp(ui, 'wardrobeType') ?? getProp(raw, 'wardrobeType');
  return typeof value === 'string' ? value : '';
}

function readDoorsCount(App: AppContainer): number | null {
  const ui = readUiRecord(App);
  const raw = asRecord(getProp(ui, 'raw'));
  const doors = readFiniteNumber(getProp(raw, 'doors') ?? getProp(ui, 'doors'));
  return doors == null ? null : Math.round(doors);
}

export function isNoMainWardrobeSketchMode(App: AppContainer): boolean {
  try {
    const wardrobeType = readWardrobeType(App);
    const doors = readDoorsCount(App);
    return wardrobeType !== 'sliding' && doors === 0;
  } catch {
    return false;
  }
}
