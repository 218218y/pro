import type { AppContainer, ThreeLike, UnknownRecord } from '../../../types';
import { getThreeMaybe } from '../runtime/three_access.js';
import { getViewportSurface, readRenderCacheValue, writeRenderCacheValue } from '../runtime/render_access.js';
import { asRecord, getProp } from '../runtime/record.js';

type __FiniteVec3 = { x: number; y: number; z: number };
export type __WorldToLocalArg = __FiniteVec3 | { x: number; y: number; z: number };
type __BoundObjectMethod<TArgs extends unknown[]> = (...args: TArgs) => unknown;
export type __MutableNodeRecord = UnknownRecord & {
  parent?: unknown;
  geometry?: unknown;
  position?: unknown;
  userData?: unknown;
  visible?: boolean;
  isMesh?: boolean;
  isLine?: boolean;
  isLineSegments?: boolean;
  worldToLocal?: (value: __WorldToLocalArg) => unknown;
  traverse?: (visit: (node: unknown) => void) => unknown;
  updateWorldMatrix?: (updateParents: boolean, updateChildren: boolean) => unknown;
};
export type __ThreeBoxSupport = Pick<ThreeLike, 'Box3' | 'Vector3'>;

export type ViewportRoots = {
  renderer: UnknownRecord | null;
  camera: UnknownRecord | null;
  scene: UnknownRecord | null;
  wardrobeGroup: UnknownRecord | null;
};

const __SKETCH_HOVER_KEY = '__lastSketchHover';

export function __readFiniteNumberProp(obj: unknown, key: string): number | null {
  const value = getProp(obj, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function __readFiniteVec3(obj: unknown): __FiniteVec3 | null {
  const x = __readFiniteNumberProp(obj, 'x');
  const y = __readFiniteNumberProp(obj, 'y');
  const z = __readFiniteNumberProp(obj, 'z');
  return x != null && y != null && z != null ? { x, y, z } : null;
}

export function __isMutableNodeRecord(value: unknown): value is __MutableNodeRecord {
  return !!asRecord(value);
}

export function __readMutableNodeRecord(value: unknown): __MutableNodeRecord | null {
  return __isMutableNodeRecord(value) ? value : null;
}

export function __getThreeBoxSupport(App: AppContainer): __ThreeBoxSupport | null {
  const THREE = getThreeMaybe(App);
  return THREE && typeof THREE.Box3 === 'function' && typeof THREE.Vector3 === 'function' ? THREE : null;
}

function __bindNodeMethod<TArgs extends unknown[]>(
  obj: unknown,
  key: 'worldToLocal'
): __BoundObjectMethod<TArgs> | null {
  const owner = __readMutableNodeRecord(obj);
  if (!owner) return null;
  const fn = getProp(owner, key);
  if (typeof fn !== 'function') return null;
  return (...args: TArgs) => Reflect.apply(fn, owner, args);
}

export function __getWorldToLocalFn(obj: unknown): __BoundObjectMethod<[__WorldToLocalArg]> | null {
  // Three/Object3D methods such as worldToLocal depend on `this`.
  // Keep the method bound to its owner so local projection math cannot silently break
  // when helpers pass the function across hover/click/free-placement flows.
  return __bindNodeMethod<[__WorldToLocalArg]>(obj, 'worldToLocal');
}

export function __readBox3Bounds(
  box: { min?: unknown; max?: unknown } | null | undefined
): { min: __FiniteVec3; max: __FiniteVec3 } | null {
  const min = __readFiniteVec3(box && box.min);
  const max = __readFiniteVec3(box && box.max);
  return min && max ? { min, max } : null;
}

export function __wp_getViewportRoots(App: AppContainer): ViewportRoots {
  const surface = getViewportSurface(App);
  return {
    renderer: asRecord(surface.renderer),
    camera: asRecord(surface.camera),
    scene: asRecord(surface.scene),
    wardrobeGroup: asRecord(surface.wardrobeGroup),
  };
}

export function __wp_isViewportRoot(App: AppContainer, node: unknown): boolean {
  const roots = __wp_getViewportRoots(App);
  return !!node && (node === roots.scene || node === roots.wardrobeGroup);
}

export function __wp_readSketchHover(App: AppContainer): UnknownRecord | null {
  return asRecord(readRenderCacheValue(App, __SKETCH_HOVER_KEY));
}

export function __wp_writeSketchHover(App: AppContainer, snap: UnknownRecord | null): void {
  writeRenderCacheValue(App, __SKETCH_HOVER_KEY, snap);
}

export function __wp_clearSketchHover(App: AppContainer): void {
  __wp_writeSketchHover(App, null);
}
