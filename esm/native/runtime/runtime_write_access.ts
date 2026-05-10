// Runtime write access helpers (Canonical-first, Store-backed)
//
// Goal:
// - Centralize runtime write seams.
// - Prefer App.actions.runtime.* surfaces when installed.
// - Keep store-backed compatibility routes for minimal harnesses.
// - Delete-pass: avoid generic root actions.patch routing for runtime updates.

import type { ActionMetaLike, RuntimeActionsNamespaceLike, RuntimeSlicePatch } from '../../../types';
import type { RuntimeScalarKey, RuntimeScalarValue } from '../../../types/runtime_scalar';
import { metaTransient } from './meta_profiles_access.js';
import { asRecord, getSliceNamespace, patchSliceCanonical } from './slice_write_access.js';

function isRuntimeSlicePatch(value: unknown): value is RuntimeSlicePatch {
  return !!asRecord(value);
}

function asRuntimePatch(v: unknown): RuntimeSlicePatch {
  return isRuntimeSlicePatch(v) ? v : {};
}

function isRuntimeActionsNamespaceLike(value: unknown): value is RuntimeActionsNamespaceLike {
  return !!asRecord(value);
}

function getRuntimeNamespace(App: unknown): RuntimeActionsNamespaceLike | null {
  const namespace = getSliceNamespace(App, 'runtime');
  return isRuntimeActionsNamespaceLike(namespace) ? namespace : null;
}

export function patchRuntime(App: unknown, patch: unknown, meta?: ActionMetaLike): unknown {
  const rtPatch = asRuntimePatch(patch);
  const m = metaTransient(App, meta, 'runtime:patch');
  return patchSliceCanonical(App, 'runtime', rtPatch, m, {
    storeWriter: 'setRuntime',
    allowRootStorePatch: true,
  });
}

type SetRuntimeScalar = {
  <K extends RuntimeScalarKey>(
    App: unknown,
    key: K,
    value: RuntimeScalarValue<K>,
    meta?: ActionMetaLike
  ): unknown;
  (App: unknown, key: string, value: unknown, meta?: ActionMetaLike): unknown;
};

// NOTE: We intentionally avoid TS function overload declarations here because ESLint's
// core `no-redeclare` rule flags overload signatures. Using a typed const preserves
// the call-site typing without triggering lint.
export const setRuntimeScalar: SetRuntimeScalar = (
  App: unknown,
  key: unknown,
  value: unknown,
  meta?: ActionMetaLike
): unknown => {
  const k = key == null ? '' : String(key);
  if (!k) return undefined;
  if (typeof value === 'function') return undefined;

  const m = metaTransient(App, meta, 'runtime:setScalar');
  const rtNs = getRuntimeNamespace(App);

  if (typeof rtNs?.setScalar === 'function') {
    return rtNs.setScalar(k, value, m);
  }

  return patchRuntime(App, { [k]: value }, m);
};

export function setRuntimeSketchMode(App: unknown, on: unknown, meta?: ActionMetaLike): unknown {
  return setRuntimeScalar(App, 'sketchMode', !!on, meta);
}

export function setRuntimeGlobalClickMode(App: unknown, on: unknown, meta?: ActionMetaLike): unknown {
  return setRuntimeScalar(App, 'globalClickMode', !!on, meta);
}

export function setRuntimeRestoring(App: unknown, on: unknown, meta?: ActionMetaLike): unknown {
  return setRuntimeScalar(App, 'restoring', !!on, meta);
}

export function setRuntimeSystemReady(App: unknown, on: unknown, meta?: ActionMetaLike): unknown {
  return setRuntimeScalar(App, 'systemReady', !!on, meta);
}
