// Runtime write access helpers (canonical actions only)
//
// Goal:
// - Centralize runtime write seams.
// - Require the installed App.actions.runtime.* surface.
// - Fail fast when boot/integration code provides an incomplete action contract.

import type { ActionMetaLike, RuntimeActionsNamespaceLike, RuntimeSlicePatch } from '../../../types';
import type { RuntimeScalarKey, RuntimeScalarValue } from '../../../types/runtime_scalar';
import { requireActionFn } from './actions_access_core.js';
import { metaTransient } from './meta_profiles_access.js';
import { asRecord } from './record.js';

function isRuntimeSlicePatch(value: unknown): value is RuntimeSlicePatch {
  return !!asRecord(value);
}

function asRuntimePatch(v: unknown): RuntimeSlicePatch {
  return isRuntimeSlicePatch(v) ? v : {};
}

type RuntimePatchAction = NonNullable<RuntimeActionsNamespaceLike['patch']>;
type RuntimeSetScalarAction = NonNullable<RuntimeActionsNamespaceLike['setScalar']>;

export function patchRuntime(App: unknown, patch: unknown, meta?: ActionMetaLike): unknown {
  const rtPatch = asRuntimePatch(patch);
  if (!Object.keys(rtPatch).length) return undefined;
  const m = metaTransient(App, meta, 'runtime:patch');
  return requireActionFn<RuntimePatchAction>(App, 'runtime.patch', 'runtime write access')(rtPatch, m);
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
  return requireActionFn<RuntimeSetScalarAction>(App, 'runtime.setScalar', 'runtime scalar write access')(
    k,
    value,
    m
  );
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
