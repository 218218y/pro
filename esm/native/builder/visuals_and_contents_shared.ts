// Native Builder Visuals + Contents Shared Helpers (ESM)
//
// Keeps installer/runtime access helpers separate from the heavy door-visual implementation.

import { assertApp } from '../runtime/api.js';
import { trackMirrorSurface } from '../runtime/render_access.js';
import {
  ensureBuilderService,
  getBuilderAddOutlines,
  resolveBuilderMirrorMaterial,
} from '../runtime/builder_service_access.js';
import { assertThreeViaDeps } from '../runtime/three_access.js';

import type {
  AppContainer,
  BuilderOutlineFn,
  UnknownRecord,
  BuilderContentsSurfaceLike,
  BuilderModulesSurfaceLike,
  ThreeLike,
  Object3DLike,
} from '../../../types/index.js';

type CanvasLike = {
  getContext: (kind: '2d') => CanvasRenderingContext2D | null;
};

type ShapeRuntimeLike = {
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  closePath: () => void;
  holes?: ShapeRuntimeLike[];
};
type BufferAttributeRuntimeLike = {
  count: number;
  getX: (index: number) => number;
  setZ: (index: number, value: number) => void;
};
type GeometryRuntimeLike = {
  computeVertexNormals?: () => void;
  translate?: (x: number, y: number, z: number) => unknown;
  attributes?: { position?: BufferAttributeRuntimeLike | null };
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function __asBufferAttribute(value: unknown): BufferAttributeRuntimeLike | null {
  const rec = readRecord(value);
  const getX = rec?.getX;
  const setZ = rec?.setZ;
  if (!rec || typeof rec.count !== 'number' || typeof getX !== 'function' || typeof setZ !== 'function') {
    return null;
  }
  return {
    count: rec.count,
    getX: (index: number) => Number(Reflect.apply(getX, value, [index])),
    setZ: (index: number, nextValue: number) => {
      Reflect.apply(setZ, value, [index, nextValue]);
    },
  };
}

function __isCanvasLike(value: unknown): value is CanvasLike {
  const rec = readRecord(value);
  return !!rec && typeof rec.getContext === 'function';
}

function __asCanvas(value: unknown): CanvasLike | null {
  return __isCanvasLike(value) ? value : null;
}

function __getMirrorMaterialFromServices(App: AppContainer, THREE: ThreeLike): unknown {
  return resolveBuilderMirrorMaterial(
    App,
    THREE,
    () => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.01 })
  );
}

function __markMirrorTracked(App: AppContainer, mirrorMesh: Object3DLike): void {
  trackMirrorSurface(App, mirrorMesh);
}

function __bindWithApp<Args extends unknown[], Result>(
  App: AppContainer,
  fn: (App: AppContainer, ...args: Args) => Result
): (...args: Args) => Result {
  return (...args: Args) => fn(App, ...args);
}

function __ensureApp(passed: unknown): AppContainer {
  const A = assertApp(passed, 'native/builder/visuals_and_contents.app');
  const B = ensureBuilderService(A, 'native/builder/visuals_and_contents');
  B.modules = _asObject(B.modules) || {};
  B.contents = _asObject(B.contents) || {};
  return A;
}

function __ensureTHREE(passedApp: unknown): ThreeLike {
  const A = __ensureApp(passedApp);
  return assertThreeViaDeps(A, 'native/builder/visuals_and_contents.THREE');
}

function _asObject(x: unknown): UnknownRecord | null {
  return readRecord(x);
}
function __wp_resolveFn<TArgs extends unknown[], TResult>(
  primary: unknown,
  fallback: unknown
): ((...args: TArgs) => TResult) | null {
  const fn = typeof primary === 'function' ? primary : typeof fallback === 'function' ? fallback : null;
  if (!fn) return null;
  return (...args: TArgs): TResult => Reflect.apply(fn, null, args);
}

function __wp_getAddOutlines(passedApp: unknown): BuilderOutlineFn | null {
  try {
    const A = _asObject(passedApp) ? __ensureApp(passedApp) : null;
    return A ? getBuilderAddOutlines(A) : null;
  } catch (_) {
    return null;
  }
}

function __addOutlines(mesh: unknown, passedApp: unknown) {
  const fn = __wp_getAddOutlines(passedApp);
  if (fn) return fn(mesh);
}

function __ensureBuilderModulesSlot(builder: UnknownRecord): BuilderModulesSurfaceLike & UnknownRecord {
  const current = _asObject(builder.modules);
  if (current) return current;
  const next: BuilderModulesSurfaceLike & UnknownRecord = {};
  builder.modules = next;
  return next;
}

function __ensureBuilderContentsSlot(builder: UnknownRecord): BuilderContentsSurfaceLike & UnknownRecord {
  const current = _asObject(builder.contents);
  if (current) return current;
  const next: BuilderContentsSurfaceLike & UnknownRecord = {};
  builder.contents = next;
  return next;
}

// NOTE: module-structure calculator is now a direct import (pure ESM).
// In pure-ESM builds we do not provide legacy window.* globals.

export {
  __asBufferAttribute,
  __asCanvas,
  __ensureApp,
  __ensureTHREE,
  __addOutlines,
  __getMirrorMaterialFromServices,
  __markMirrorTracked,
  __bindWithApp,
  __ensureBuilderModulesSlot,
  __ensureBuilderContentsSlot,
  _asObject,
  __wp_resolveFn,
};

export type { CanvasLike, ShapeRuntimeLike, BufferAttributeRuntimeLike, GeometryRuntimeLike };
