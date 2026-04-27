import type {
  AppContainer,
  CameraLike,
  ControlsLike,
  InitializedViewportSurfaceLike,
  Object3DLike,
  RenderNamespaceLike,
  RendererLike,
  UnknownRecord,
  Vec3Like,
} from '../../../types';

import {
  isRecord,
  readFiniteNumber as readFiniteNumberShared,
  readRecord,
} from '../runtime/render_runtime_primitives.js';

export type AppLike = AppContainer | (UnknownRecord & { config?: unknown; render?: unknown });
export type RenderBag = RenderNamespaceLike & {
  mirrorRenderTarget?: unknown;
  mirrorCubeCamera?: unknown;
  __mirrorLastUpdateMs?: number;
};
export type SurfaceRecord = InitializedViewportSurfaceLike;
export type ViewportContainerLike = {
  clientWidth?: number;
  clientHeight?: number;
  appendChild?: (node: unknown) => unknown;
};
export type CameraPoseLike = {
  position?: Vec3Like | null;
  target?: Vec3Like | null;
};

export type Vec3Writable = {
  x?: unknown;
  y?: unknown;
  z?: unknown;
  set?: (x: number, y: number, z: number) => unknown;
  copy?: (v: Vec3Like) => unknown;
  clone?: () => unknown;
  sub?: (v: unknown) => unknown;
  add?: (v: unknown) => unknown;
  multiplyScalar?: (s: number) => unknown;
  addVectors?: (a: Vec3Like, b: Vec3Like) => unknown;
  lerp?: (v: Vec3Like, alpha: number) => unknown;
};
export type CameraWritable = {
  position?: unknown;
  fov?: unknown;
  updateProjectionMatrix?: () => unknown;
  updateMatrixWorld?: (force?: boolean) => unknown;
};
export type ControlsWritable = {
  target?: unknown;
  enableDamping?: unknown;
  update?: () => unknown;
  addEventListener?: EventTarget['addEventListener'];
  removeEventListener?: EventTarget['removeEventListener'];
  dispatchEvent?: EventTarget['dispatchEvent'];
};
export type RendererWritable = {
  domElement?: unknown;
  shadowMap?: UnknownRecord;
  setClearColor?: (color: number, alpha?: number) => unknown;
  setSize?: (width: number, height: number) => unknown;
  setPixelRatio?: (ratio: number) => unknown;
  render?: (scene: unknown, camera: unknown) => unknown;
};
export type Object3DWritable = {
  parent?: unknown;
  children?: unknown;
  position?: unknown;
  rotation?: unknown;
  scale?: unknown;
  userData?: unknown;
  add?: Object3DLike['add'];
  remove?: Object3DLike['remove'];
  getObjectByName?: Object3DLike['getObjectByName'];
  traverse?: Object3DLike['traverse'];
};
export type Object3DCompatible = Object3DWritable & {
  parent: Object3DLike | null;
  children: Object3DLike[];
  position: Object3DLike['position'];
  rotation: Object3DLike['rotation'];
  scale: Object3DLike['scale'];
  userData: Object3DLike['userData'];
  add: Object3DLike['add'];
  remove: Object3DLike['remove'];
};
export type ThreeRuntime = UnknownRecord & {
  Scene?: new () => unknown;
  WebGLCubeRenderTarget?: new (size: number, opts?: UnknownRecord) => unknown;
  CubeCamera?: new (near: number, far: number, renderTarget: unknown) => unknown;
  PerspectiveCamera?: new (fov: number, aspect: number, near: number, far: number) => unknown;
  WebGLRenderer?: new (opts?: UnknownRecord) => unknown;
  OrbitControls?: new (camera: unknown, domElement: unknown) => unknown;
  Group?: new () => unknown;
  LinearFilter?: unknown;
  RGBAFormat?: unknown;
  PCFShadowMap?: unknown;
};

export function readFiniteNumber(value: unknown, fallback: number): number {
  return readFiniteNumberShared(value, fallback);
}

export function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const num = readFiniteNumber(value, fallback);
  return Math.max(min, Math.min(max, num));
}

export function readVec3Writable(value: unknown): Vec3Writable | null {
  const rec = readRecord<Vec3Writable>(value);
  if (!rec) return null;
  const hasAxes = 'x' in rec || 'y' in rec || 'z' in rec;
  const hasVectorMethods =
    typeof rec.set === 'function' ||
    typeof rec.clone === 'function' ||
    typeof rec.sub === 'function' ||
    typeof rec.add === 'function' ||
    typeof rec.multiplyScalar === 'function';
  return hasAxes || hasVectorMethods ? rec : null;
}

export function readCameraWritable(value: unknown): CameraWritable | null {
  const rec = readRecord<CameraWritable>(value);
  return rec && (readVec3Writable(rec.position) || typeof rec.updateProjectionMatrix === 'function')
    ? rec
    : null;
}

export function readControlsWritable(value: unknown): ControlsWritable | null {
  const rec = readRecord<ControlsWritable>(value);
  return rec && (readVec3Writable(rec.target) || typeof rec.update === 'function' || 'enableDamping' in rec)
    ? rec
    : null;
}

export function readRendererWritable(value: unknown): RendererWritable | null {
  const rec = readRecord<RendererWritable>(value);
  return rec &&
    (typeof rec.setClearColor === 'function' ||
      typeof rec.setSize === 'function' ||
      typeof rec.setPixelRatio === 'function' ||
      typeof rec.render === 'function' ||
      'domElement' in rec ||
      isRecord(rec.shadowMap))
    ? rec
    : null;
}

export function readObject3DWritable(value: unknown): Object3DWritable | null {
  const rec = readRecord<Object3DWritable>(value);
  return rec &&
    (typeof rec.add === 'function' ||
      typeof rec.remove === 'function' ||
      readVec3Writable(rec.position) !== null ||
      Array.isArray(rec.children) ||
      'parent' in rec)
    ? rec
    : null;
}

export function readWebGLRenderTargetLike(value: unknown): UnknownRecord | null {
  return readRecord(value);
}

export type { CameraLike, ControlsLike, Object3DLike, RendererLike };
