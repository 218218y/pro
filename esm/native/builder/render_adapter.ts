// Native Builder Render Adapter (ESM)
//
// Converted from `js/builder/pro_builder_render_adapter.js` into a real ES module.
//
// Responsibilities:
// - Owns minimal Three.js scene-graph wiring that BuilderCore should not do directly.
// - Keeps side-effects explicit via an installer (no implicit globals / IIFE).
//
// Design:
// - No side-effects on import.
// - Canonical API lives on `App.services.builder.renderAdapter`.
// - Idempotent via `__esm_v1` marker.

import type {
  AppContainer,
  BuilderServiceLike,
  Object3DLike,
  RenderNamespaceLike,
  ThreeLike,
} from '../../../types/index.js';

import { assertApp } from '../runtime/api.js';
import { ensureRenderNamespace } from '../runtime/render_access.js';
import { ensureBuilderService, getBuilderService } from '../runtime/builder_service_access.js';

type AnyObj = Record<string, unknown>;

type BuilderServiceRecord = BuilderServiceLike & {
  renderAdapter?: unknown;
};

type RenderAdapterLike = AnyObj & {
  __esm_v1?: boolean;
  ensureWardrobeGroup?: (THREE: ThreeLike | null | undefined) => Object3DLike | null;
};

function _isObject(x: unknown): x is AnyObj {
  return !!x && typeof x === 'object';
}

function _readObject(x: unknown): AnyObj | null {
  return _isObject(x) ? x : null;
}

function _isObject3DLike(x: unknown): x is Object3DLike {
  const obj = _readObject(x);
  return !!(
    obj &&
    Array.isArray(obj.children) &&
    _isObject(obj.userData) &&
    _isObject(obj.position) &&
    _isObject(obj.rotation) &&
    _isObject(obj.scale) &&
    typeof obj.add === 'function' &&
    typeof obj.remove === 'function'
  );
}

function _readObject3D(x: unknown): Object3DLike | null {
  return _isObject3DLike(x) ? x : null;
}

function _isRenderNamespaceLike(value: unknown): value is RenderNamespaceLike {
  const obj = _readObject(value);
  if (!obj) return false;
  return (
    Object.prototype.hasOwnProperty.call(obj, 'wardrobeGroup') &&
    Object.prototype.hasOwnProperty.call(obj, 'scene')
  );
}

function _readRenderNamespace(x: unknown): RenderNamespaceLike | null {
  return _isRenderNamespaceLike(x) ? x : null;
}

function _readRenderAdapter(value: unknown): RenderAdapterLike | null {
  const obj = _readObject(value);
  return obj ? obj : null;
}

function _ensureRenderAdapterSlot(builder: BuilderServiceRecord): RenderAdapterLike {
  const current = _readRenderAdapter(builder.renderAdapter);
  if (current) return current;
  const next: RenderAdapterLike = {};
  builder.renderAdapter = next;
  return next;
}

function _getRenderAdapter(App: AppContainer): RenderAdapterLike | null {
  const builder = getBuilderService(App);
  return _readRenderAdapter(builder?.renderAdapter);
}

export function ensureWardrobeGroup(
  App: AppContainer,
  THREE: ThreeLike | null | undefined
): Object3DLike | null {
  const A = assertApp(App, 'native/builder/render_adapter');
  try {
    const R = _readRenderNamespace(ensureRenderNamespace(A));
    if (!R) return null;

    // If THREE isn't ready, do the best we can: return the existing group.
    if (!THREE || typeof THREE.Group !== 'function') return _readObject3D(R.wardrobeGroup);

    let wardrobeGroup = _readObject3D(R.wardrobeGroup);
    if (!wardrobeGroup) {
      wardrobeGroup = new THREE.Group();
      R.wardrobeGroup = wardrobeGroup;
    }

    // Ensure the group is attached to the active scene (if available)
    try {
      const scene = _readObject3D(R.scene);
      if (scene && wardrobeGroup.parent !== scene) {
        scene.add(wardrobeGroup);
      }
    } catch {
      // ignore
    }

    return wardrobeGroup;
  } catch {
    return null;
  }
}

export function createBuilderRenderAdapter(App: AppContainer): RenderAdapterLike {
  const A = assertApp(App, 'native/builder/render_adapter');
  return {
    ensureWardrobeGroup(THREE: ThreeLike | null | undefined) {
      return ensureWardrobeGroup(A, THREE);
    },
  };
}

export function installBuilderRenderAdapter(App: AppContainer): RenderAdapterLike {
  const A = assertApp(App, 'native/builder/render_adapter');
  const B: BuilderServiceRecord = ensureBuilderService(A, 'native/builder/render_adapter.install');

  const ra = _ensureRenderAdapterSlot(B);

  if (ra.__esm_v1) return ra;

  const bound = createBuilderRenderAdapter(A);
  if (typeof ra.ensureWardrobeGroup === 'undefined') ra.ensureWardrobeGroup = bound.ensureWardrobeGroup;

  try {
    ra.__esm_v1 = true;
  } catch {
    // ignore
  }

  return ra;
}

export function getBuilderRenderAdapter(App: AppContainer): RenderAdapterLike | null {
  const A = assertApp(App, 'native/builder/render_adapter');
  installBuilderRenderAdapter(A);
  return _getRenderAdapter(A);
}

export const builderRenderAdapter = {
  ensureWardrobeGroup,
};
