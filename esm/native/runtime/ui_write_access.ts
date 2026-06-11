// UI write access helpers (Canonical-first, Store-backed)
//
// Goal:
// - Centralize the UI write seams in one place.
// - Prefer App.actions.ui.* surfaces when installed.
// - Keep a small store-backed fallback for lightweight harnesses/tools.
// - Delete-pass: avoid bouncing through generic root actions.patch when a UI seam exists.
//
// Notes:
// - UI layer must consume this through services/api.js (public surface), not by importing runtime/* directly.

import type { ActionMetaLike, UiActionsNamespaceLike, UiSlicePatch } from '../../../types';
import type { UiRawScalarKey, UiRawScalarValueMap } from '../../../types/ui_raw';
import { buildUiRawScalarPatch } from '../../../types/ui_raw.js';
import { metaUiOnly } from './meta_profiles_access.js';
import { readUiStateFromApp } from './root_state_access.js';
import { asRecord, getSliceNamespace, patchSliceWithStoreFallback } from './slice_write_access.js';

function asUiPatch(v: unknown): UiSlicePatch {
  const rec = asRecord(v);
  return rec ? { ...rec } : {};
}

function hasOwnKeys(v: unknown): boolean {
  const rec = asRecord(v);
  return !!rec && Object.keys(rec).length > 0;
}

function isUiActionsNamespaceLike(value: unknown): value is UiActionsNamespaceLike {
  return !!asRecord(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!asRecord(value) && !Array.isArray(value);
}

function areUiPatchValuesEquivalent(current: unknown, next: unknown): boolean {
  if (Object.is(current, next)) return true;

  if (Array.isArray(current) && Array.isArray(next)) {
    if (current.length !== next.length) return false;
    for (let i = 0; i < current.length; i += 1) {
      if (!Object.is(current[i], next[i])) return false;
    }
    return true;
  }

  if (isPlainRecord(current) && isPlainRecord(next)) {
    const currentKeys = Object.keys(current);
    const nextKeys = Object.keys(next);
    if (currentKeys.length !== nextKeys.length) return false;
    for (const key of nextKeys) {
      if (!Object.prototype.hasOwnProperty.call(current, key)) return false;
      if (!Object.is(current[key], next[key])) return false;
    }
    return true;
  }

  return false;
}

function filterRawUiPatch(rawPatch: unknown, currentUi: unknown): Record<string, unknown> | null {
  const nextRaw = asRecord(rawPatch);
  if (!nextRaw) return null;

  const currentRaw = asRecord(asRecord(currentUi)?.raw) ?? {};
  const filtered: Record<string, unknown> = {};

  for (const key of Object.keys(nextRaw)) {
    const nextValue = nextRaw[key];
    if (areUiPatchValuesEquivalent(currentRaw[key], nextValue)) continue;
    filtered[key] = nextValue;
  }

  return Object.keys(filtered).length ? filtered : null;
}

function filterUiPatchAgainstCurrentState(App: unknown, patch: UiSlicePatch): UiSlicePatch {
  if (!hasOwnKeys(patch)) return {};

  const currentUi = readUiStateFromApp(App);
  const currentUiRecord = asRecord(currentUi) ?? {};
  const filtered: UiSlicePatch = {};

  for (const key of Object.keys(patch)) {
    const nextValue = patch[key];
    if (key === 'raw') {
      const nextRaw = filterRawUiPatch(nextValue, currentUi);
      if (nextRaw) filtered.raw = nextRaw;
      continue;
    }
    if (areUiPatchValuesEquivalent(currentUiRecord[key], nextValue)) continue;
    filtered[key] = nextValue;
  }

  return filtered;
}

function readCurrentUiValue(App: unknown, key: string): unknown {
  const currentUi = readUiStateFromApp(App);
  return (asRecord(currentUi) ?? {})[key];
}

function readCurrentUiRawValue(App: unknown, key: string): unknown {
  const currentUi = readUiStateFromApp(App);
  const raw = asRecord((asRecord(currentUi) ?? {}).raw) ?? {};
  return raw[key];
}

function getUiNamespace(App: unknown): UiActionsNamespaceLike | null {
  const ns = getSliceNamespace(App, 'ui');
  return isUiActionsNamespaceLike(ns) ? ns : null;
}

/** Patch UI slice through the canonical actions surface (preferred). */
export function patchUi(App: unknown, patch: unknown, meta?: ActionMetaLike): unknown {
  const uiPatch = filterUiPatchAgainstCurrentState(App, asUiPatch(patch));
  if (!hasOwnKeys(uiPatch)) return undefined;
  return patchSliceWithStoreFallback(App, 'ui', uiPatch, meta, { storeWriter: 'setUi' });
}

/** Patch UI slice with UI-only semantics by default (when the surface supports it). */
export function patchUiSoft(App: unknown, patch: unknown, meta?: ActionMetaLike): unknown {
  const uiPatch = filterUiPatchAgainstCurrentState(App, asUiPatch(patch));
  if (!hasOwnKeys(uiPatch)) return undefined;

  const m = metaUiOnly(App, meta, 'ui:patchSoft');
  const uiNs = getUiNamespace(App);

  if (typeof uiNs?.patchSoft === 'function') {
    return uiNs.patchSoft(uiPatch, m);
  }

  // Fall back to plain UI patching while enforcing UI-only meta defaults.
  return patchUi(App, uiPatch, m);
}

type SetUiScalar = {
  (App: unknown, key: string, value: unknown, meta?: ActionMetaLike): unknown;
};

export const setUiScalar: SetUiScalar = (
  App: unknown,
  key: string,
  value: unknown,
  meta?: ActionMetaLike
): unknown => {
  const k = String(key == null ? '' : key).trim();
  if (!k) return undefined;
  if (typeof value === 'function') return undefined;
  if (areUiPatchValuesEquivalent(readCurrentUiValue(App, k), value)) return undefined;

  const uiNs = getUiNamespace(App);
  if (typeof uiNs?.setScalar === 'function') {
    return uiNs.setScalar(k, value, meta);
  }

  return patchUi(App, { [k]: value }, meta);
};

type SetUiScalarSoft = {
  (App: unknown, key: string, value: unknown, meta?: ActionMetaLike): unknown;
};

export const setUiScalarSoft: SetUiScalarSoft = (
  App: unknown,
  key: string,
  value: unknown,
  meta?: ActionMetaLike
): unknown => {
  const k = String(key == null ? '' : key).trim();
  if (!k) return undefined;
  if (typeof value === 'function') return undefined;
  if (areUiPatchValuesEquivalent(readCurrentUiValue(App, k), value)) return undefined;

  const m = metaUiOnly(App, meta, 'ui:setScalarSoft');
  const uiNs = getUiNamespace(App);

  if (typeof uiNs?.setScalarSoft === 'function') {
    return uiNs.setScalarSoft(k, value, m);
  }

  if (typeof uiNs?.setScalar === 'function') {
    return uiNs.setScalar(k, value, m);
  }

  return patchUiSoft(App, { [k]: value }, m);
};

/** Patch UI raw scalars via the installed UI surface when available. */
type SetUiRawScalar = {
  <K extends UiRawScalarKey>(
    App: unknown,
    key: K,
    value: UiRawScalarValueMap[K],
    meta?: ActionMetaLike
  ): unknown;
  (App: unknown, key: string, value: unknown, meta?: ActionMetaLike): unknown;
};

// NOTE: We intentionally avoid TS function overload declarations here because ESLint's
// core `no-redeclare` rule flags overload signatures. Using a typed const preserves
// the call-site typing without triggering lint.
export const setUiRawScalar: SetUiRawScalar = (
  App: unknown,
  key: unknown,
  value: unknown,
  meta?: ActionMetaLike
): unknown => {
  const k = String(key == null ? '' : key);
  if (!k) return undefined;
  if (typeof value === 'function') return undefined;
  if (areUiPatchValuesEquivalent(readCurrentUiRawValue(App, k), value)) return undefined;

  const m = metaUiOnly(App, meta, 'ui:setRawScalar');
  const uiNs = getUiNamespace(App);

  if (typeof uiNs?.setRawScalar === 'function') {
    return uiNs.setRawScalar(k, value, m);
  }

  // Fallback: patch raw object (UI-only by convention).
  return patchUiSoft(App, { raw: buildUiRawScalarPatch(k, value) }, m);
};

export function setUiLastSelectedWallColor(App: unknown, value: unknown, meta?: ActionMetaLike): unknown {
  const next = value == null ? '' : String(value).trim();
  if (!next) return undefined;
  return setUiScalarSoft(App, 'lastSelectedWallColor', next, meta);
}

type UiLightingScalarKey =
  | 'lightingControl'
  | 'lastLightPreset'
  | 'lightAmb'
  | 'lightDir'
  | 'lightX'
  | 'lightY'
  | 'lightZ';

type UiLightingTextKey = 'lightAmb' | 'lightDir' | 'lightX' | 'lightY' | 'lightZ';

function isUiLightingScalarKey(key: unknown): key is UiLightingScalarKey {
  return (
    key === 'lightingControl' ||
    key === 'lastLightPreset' ||
    key === 'lightAmb' ||
    key === 'lightDir' ||
    key === 'lightX' ||
    key === 'lightY' ||
    key === 'lightZ'
  );
}

function setUiLightingTextPatch(target: UiSlicePatch, key: UiLightingTextKey, value: string): void {
  if (key === 'lightAmb') target.lightAmb = value;
  else if (key === 'lightDir') target.lightDir = value;
  else if (key === 'lightX') target.lightX = value;
  else if (key === 'lightY') target.lightY = value;
  else target.lightZ = value;
}

export function setUiLightScalar(
  App: unknown,
  key: UiLightingScalarKey,
  value: unknown,
  meta?: ActionMetaLike
): unknown {
  if (!isUiLightingScalarKey(key)) return undefined;
  if (key === 'lightingControl') return setUiScalarSoft(App, key, !!value, meta);
  const next = value == null ? '' : String(value);
  if (!next) return undefined;
  return setUiScalarSoft(App, key, next, meta);
}

export function patchUiLightingState(App: unknown, patch: unknown, meta?: ActionMetaLike): unknown {
  const rec = asRecord(patch);
  if (!rec) return undefined;

  const next: UiSlicePatch = {};
  if (Object.prototype.hasOwnProperty.call(rec, 'lightingControl')) {
    next.lightingControl = !!rec.lightingControl;
  }
  if (Object.prototype.hasOwnProperty.call(rec, 'lastLightPreset')) {
    const value = rec.lastLightPreset;
    const clean = value == null ? '' : String(value);
    if (clean) next.lastLightPreset = clean;
  }

  const lightingKeys: ReadonlyArray<UiLightingTextKey> = [
    'lightAmb',
    'lightDir',
    'lightX',
    'lightY',
    'lightZ',
  ];
  for (const key of lightingKeys) {
    if (!Object.prototype.hasOwnProperty.call(rec, key)) continue;
    const value = rec[key];
    const clean = value == null ? '' : String(value);
    if (clean) setUiLightingTextPatch(next, key, clean);
  }

  if (Object.prototype.hasOwnProperty.call(rec, 'lastSelectedWallColor')) {
    const value = rec.lastSelectedWallColor;
    const clean = value == null ? '' : String(value).trim();
    if (clean) next.lastSelectedWallColor = clean;
  }

  return hasOwnKeys(next) ? patchUiSoft(App, next, meta) : undefined;
}
