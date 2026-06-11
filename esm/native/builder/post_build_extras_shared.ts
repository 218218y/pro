// Shared post-build extras helpers (Pure ESM)
//
// These helpers are intentionally kept free of feature policy so the individual
// post-build owners can stay focused on dimensions / sketch overlays / finalize flows.

import { reportError, shouldFailFast } from '../runtime/api.js';

import type {
  AppContainer,
  BuildContextLike,
  BuildCtxCreateFnsLike,
  BuildCtxLayoutLike,
  BuildCtxResolversLike,
  BuildCtxStringsLike,
  DoorVisualEntryLike,
  DrawerVisualEntryLike,
  Object3DLike,
} from '../../../types/index.js';

export type ValueRecord = Record<string, unknown>;
export type LineMaterialLike = ValueRecord & {
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  depthTest?: boolean;
  color?: { setHex?: (value: number) => unknown } | null;
};
export type Box3Like = ValueRecord & {
  clone: () => Box3Like;
  applyMatrix4: (matrix: unknown) => Box3Like;
  union: (box: Box3Like) => Box3Like;
  getSize: (target: { x: number; y: number; z: number }) => unknown;
  min?: { z?: number };
  max?: { z?: number };
};
export type GeometryLike = ValueRecord & {
  dispose?: () => unknown;
  setFromPoints?: (points: unknown[]) => unknown;
  boundingBox?: Box3Like | null;
  computeBoundingBox?: () => unknown;
};
export type TraversableLike = Object3DLike & {
  traverse?: (fn: (obj: Object3DLike & ValueRecord) => void) => void;
};
export type CtxCreateSurface = BuildCtxCreateFnsLike & ValueRecord;
export type CtxResolversSurface = BuildCtxResolversLike & ValueRecord;
export type CtxStringsSurface = BuildCtxStringsLike & ValueRecord;
export type CtxLayoutSurface = BuildCtxLayoutLike & ValueRecord;
export type CanvasLike = OffscreenCanvas | HTMLCanvasElement;
export type ImageDataLike = { data: ArrayLike<number> | Uint8ClampedArray };
export type CanvasDrawImageArgsLike =
  | [image: CanvasImageSource, dx: number, dy: number]
  | [image: CanvasImageSource, dx: number, dy: number, dWidth: number, dHeight: number]
  | [
      image: CanvasImageSource,
      sx: number,
      sy: number,
      sWidth: number,
      sHeight: number,
      dx: number,
      dy: number,
      dWidth: number,
      dHeight: number,
    ];
export type BoundUnknownMethod<Args extends readonly unknown[] = readonly unknown[], Return = unknown> = (
  ...args: Args
) => Return;
export type Ctx2DLike = ValueRecord & {
  drawImage: (...args: CanvasDrawImageArgsLike) => unknown;
  getImageData: (sx: number, sy: number, sw: number, sh: number) => ImageDataLike;
  clearRect?: (x: number, y: number, w: number, h: number) => unknown;
};
export type DoorRuntimeEntryLike = DoorVisualEntryLike | Object3DLike;
export type DrawerRuntimeEntryLike = DrawerVisualEntryLike | Object3DLike;
export type Matrix4MultiplyLike = { multiplyMatrices: (a: unknown, b: unknown) => unknown };

export function isRecord(v: unknown): v is ValueRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function readKey(obj: ValueRecord | null, key: string): unknown {
  if (!obj) return undefined;
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}

export function parseNum(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return NaN;
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function asRecord(v: unknown): ValueRecord | null {
  return isRecord(v) ? v : null;
}

export function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function isNumericArrayLike(value: unknown): value is ArrayLike<number> {
  if (Array.isArray(value)) return value.every(item => typeof item === 'number');
  if (!value || typeof value !== 'object') return false;
  const length = Reflect.get(value, 'length');
  if (typeof length !== 'number' || !Number.isFinite(length) || length < 0) return false;
  const first = length > 0 ? Reflect.get(value, 0) : undefined;
  return first == null || typeof first === 'number';
}

export function hasMultiplyMatrices(value: unknown): value is Matrix4MultiplyLike {
  return isRecord(value) && typeof value.multiplyMatrices === 'function';
}

export function asImageDataLike(value: unknown): ImageDataLike | null {
  if (!isRecord(value) || !isNumericArrayLike(value.data)) return null;
  return { data: value.data };
}

export function asCtx2DLike(v: unknown): Ctx2DLike | null {
  if (!isRecord(v)) return null;
  const drawImage = v.drawImage;
  const getImageData = v.getImageData;
  const clearRect = v.clearRect;
  if (typeof drawImage !== 'function' || typeof getImageData !== 'function') return null;
  return {
    ...v,
    drawImage: (...args: CanvasDrawImageArgsLike) => Reflect.apply(drawImage, v, args),
    getImageData: (sx: number, sy: number, sw: number, sh: number) => {
      const out = Reflect.apply(getImageData, v, [sx, sy, sw, sh]);
      return asImageDataLike(out) ?? { data: new Uint8ClampedArray(0) };
    },
    clearRect:
      typeof clearRect === 'function'
        ? (x: number, y: number, w: number, h: number) => Reflect.apply(clearRect, v, [x, y, w, h])
        : undefined,
  };
}

export function readFunction<Args extends readonly unknown[] = readonly unknown[], Return = unknown>(
  obj: ValueRecord | null,
  key: string
): BoundUnknownMethod<Args, Return> | null {
  const value = readKey(obj, key);
  if (typeof value !== 'function') return null;
  return (...args: Args): Return => Reflect.apply(value, obj, args);
}

export function getGeometry(obj: unknown): GeometryLike | null {
  if (!isRecord(obj)) return null;
  return isRecord(obj.geometry) ? obj.geometry : null;
}

export function isObject3DLike(value: unknown): value is Object3DLike {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.children) &&
    isRecord(value.position) &&
    isRecord(value.rotation) &&
    typeof value.add === 'function' &&
    typeof value.remove === 'function'
  );
}

export function asTraversable(value: unknown): TraversableLike | null {
  if (!isObject3DLike(value)) return null;
  return typeof value.traverse === 'function' ? { ...value, traverse: value.traverse } : value;
}

export function asObject3D(value: unknown): Object3DLike | null {
  return isObject3DLike(value) ? value : null;
}

export function readBoundsAxis(
  box: Box3Like | null | undefined,
  axis: 'x' | 'y' | 'z',
  edge: 'min' | 'max'
): number {
  const point = edge === 'min' ? box?.min : box?.max;
  const raw = point && typeof point === 'object' ? Reflect.get(point, axis) : undefined;
  return Number(raw);
}

export function readCtxSection<T extends ValueRecord>(value: T | null | undefined): T | null {
  return isRecord(value) ? value : null;
}

export function readCtxCreateSurface(ctx: BuildContextLike): CtxCreateSurface | null {
  return readCtxSection(ctx.create);
}

export function readCtxResolversSurface(ctx: BuildContextLike): CtxResolversSurface | null {
  return readCtxSection(ctx.resolvers);
}

export function readCtxStringsSurface(ctx: BuildContextLike): CtxStringsSurface | null {
  return readCtxSection(ctx.strings);
}

export function readCtxLayoutSurface(ctx: BuildContextLike): CtxLayoutSurface | null {
  return readCtxSection(ctx.layout);
}

export function asCanvasImageSource(value: unknown): CanvasImageSource | null {
  if (!value || typeof value !== 'object') return null;
  if (typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap) return value;
  if (typeof HTMLCanvasElement !== 'undefined' && value instanceof HTMLCanvasElement) return value;
  if (typeof HTMLImageElement !== 'undefined' && value instanceof HTMLImageElement) return value;
  if (typeof HTMLVideoElement !== 'undefined' && value instanceof HTMLVideoElement) return value;
  if (typeof OffscreenCanvas !== 'undefined' && value instanceof OffscreenCanvas) return value;
  return null;
}

export function getDoorEntryGroup(entry: DoorRuntimeEntryLike): Object3DLike | null {
  if (isRecord(entry) && 'group' in entry) {
    return isObject3DLike(entry.group) ? entry.group : null;
  }
  return isObject3DLike(entry) ? entry : null;
}

export function getDrawerEntryGroup(entry: DrawerRuntimeEntryLike): Object3DLike | null {
  if (isRecord(entry) && 'group' in entry) {
    return isObject3DLike(entry.group) ? entry.group : null;
  }
  return isObject3DLike(entry) ? entry : null;
}

export function reportPostBuildSoft(
  App: AppContainer | null,
  op: string,
  error: unknown,
  extra?: Record<string, unknown>
): void {
  reportError(App, error, {
    where: 'native/builder/post_build_extras_pipeline',
    op,
    fatal: false,
    ...(extra || {}),
  });
  if (shouldFailFast(App)) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}
