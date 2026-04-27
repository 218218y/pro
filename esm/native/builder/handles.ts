// Native Builder Handles V7 (ESM)
//
// Legacy source: `js/builder/pro_builder_handles.js`
//
// Goals:
// - Real ESM (no IIFE, no implicit side-effects on import)
// - No legacy `js/**` imports on the ESM path
// - Provide a canonical builder service surface (App.services.builder.handles)
// - Keep handle materials cached on the builder service (no global shims)

import { assertApp } from '../runtime/api.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';
import { asRecord } from '../runtime/record.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import { applyHandles } from './handles_apply.js';
import { createHandleMeshV7 } from './handles_mesh.js';
import { purgeHandlesForRemovedDoors } from './handles_purge.js';
import type { AppContainer } from '../../../types';
import type { HandlesApplyOptions, HandlesCacheLike, HandlesSurfaceLike } from './handles_shared.js';

export { createHandleMeshV7 } from './handles_mesh.js';
export { applyHandles } from './handles_apply.js';
export { purgeHandlesForRemovedDoors } from './handles_purge.js';
export type {
  EdgeHandleVariant,
  HandlesApplyOptions,
  HandlesCacheLike,
  HandlesSurfaceLike,
  NodeLike,
} from './handles_shared.js';

// NOTE: ESM builder code should not read DOM toggles directly; use UI/state instead.

const HANDLES_CREATE_CANONICAL_KEY = '__wpBuilderCreateHandleMeshV7';
const HANDLES_APPLY_CANONICAL_KEY = '__wpBuilderApplyHandles';
const HANDLES_PURGE_CANONICAL_KEY = '__wpBuilderPurgeHandlesForRemovedDoors';

export function installBuilderHandlesV7(App: unknown) {
  const A = assertApp(asRecord<AppContainer>(App), 'native/builder/handles.install');

  const B = ensureBuilderService(A, 'native/builder/handles.install');
  const h: HandlesSurfaceLike = (B.handles = asRecord<HandlesSurfaceLike>(B.handles) || {});
  h.cache = asRecord<HandlesCacheLike>(h.cache) || {};

  const handlesStable = h as HandlesSurfaceLike & Record<string, unknown>;
  if (h.__esm_builder_handles_v7_v1) {
    if (typeof handlesStable[HANDLES_CREATE_CANONICAL_KEY] !== 'function') delete h.createHandleMeshV7;
    if (typeof handlesStable[HANDLES_APPLY_CANONICAL_KEY] !== 'function') delete h.applyHandles;
    if (typeof handlesStable[HANDLES_PURGE_CANONICAL_KEY] !== 'function')
      delete h.purgeHandlesForRemovedDoors;
  }

  installStableSurfaceMethod(h, 'createHandleMeshV7', HANDLES_CREATE_CANONICAL_KEY, () => {
    return (type: unknown, w: number, hh: number, isLeftHinge: boolean, isDrawer: boolean) =>
      createHandleMeshV7(type, w, hh, isLeftHinge, isDrawer, { App: A });
  });
  installStableSurfaceMethod(h, 'applyHandles', HANDLES_APPLY_CANONICAL_KEY, () => {
    return (opts?: HandlesApplyOptions) => applyHandles({ App: A, ...(opts || {}) });
  });
  installStableSurfaceMethod(h, 'purgeHandlesForRemovedDoors', HANDLES_PURGE_CANONICAL_KEY, () => {
    return (forceEnabled: boolean) => purgeHandlesForRemovedDoors(forceEnabled, { App: A });
  });

  try {
    h.__esm_builder_handles_v7_v1 = true;
  } catch (_error) {}

  return h;
}
