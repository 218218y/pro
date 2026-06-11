// Side-effect free installer for the "dirty" meta flag.
//
// Stores-only policy:
// - No App.select surface (removed).
// - Expose only App.actions.meta.setDirty(isDirty, meta).
//
// Notes:
// The authoritative source is App.store.meta.dirty when available.
// A per-app in-memory fallback is used for extremely early boot writes.

import type { ActionMetaLike, UnknownRecord } from '../../../types';

import { ensureMetaActions } from '../runtime/actions_access_domains.js';
import { isActionStubFn } from '../runtime/actions_access_shared.js';
import { asRecord } from '../runtime/record.js';
import { metaUiOnly } from '../runtime/meta_profiles_access.js';
import { installStableSurfaceSlot } from '../runtime/stable_surface_slots.js';
import { getStoreSurfaceMaybe } from '../runtime/store_surface_access.js';

const DIRTY_SETTER_CANONICAL_KEY = '__wpCanonicalSetDirty';

function asObject(x: unknown): UnknownRecord | null {
  return asRecord(x);
}

type DirtySetter = (value: boolean, meta: ActionMetaLike) => unknown;
type DirtyMetaNamespace = UnknownRecord & {
  setDirty?: DirtySetter;
  [DIRTY_SETTER_CANONICAL_KEY]?: DirtySetter;
};

function readDirtyMetaNamespace(value: unknown): DirtyMetaNamespace | null {
  return asObject(value);
}

function readSetDirtyFn(obj: UnknownRecord | null): DirtySetter | null {
  const value = obj ? obj.setDirty : undefined;
  return typeof value === 'function' ? (next, meta) => Reflect.apply(value, obj, [next, meta]) : null;
}

function createCanonicalSetDirty(A: UnknownRecord): DirtySetter {
  return function setDirty(isDirty: boolean, meta: ActionMetaLike) {
    try {
      A.__dirtyFallback = !!isDirty;

      const mm = asObject(meta) || null;
      const src = mm && mm.source != null ? String(mm.source) : 'dirty';
      const merged = metaUiOnly(A, mm || meta, src);

      const setDirtyFn = readSetDirtyFn(asObject(getStoreSurfaceMaybe(A)));
      if (setDirtyFn) setDirtyFn(!!isDirty, merged);
    } catch (_) {}
  };
}

export function installDirtyFlag(app: unknown) {
  const A = asObject(app);
  if (!A) {
    throw new Error('[WardrobePro][ESM] installDirtyFlag(app) requires an app object');
  }

  const metaNs = readDirtyMetaNamespace(ensureMetaActions(A));
  if (!metaNs) return false;

  if (typeof A.__dirtyFallback !== 'boolean') {
    A.__dirtyFallback = false;
  }

  installStableSurfaceSlot<DirtySetter>(
    metaNs,
    'setDirty',
    DIRTY_SETTER_CANONICAL_KEY,
    (value): value is DirtySetter => typeof value === 'function' && !isActionStubFn(value, 'meta:setDirty'),
    () => createCanonicalSetDirty(A)
  );

  return true;
}
