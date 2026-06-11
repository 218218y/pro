// three.js integration surface (runtime-provided)
//
// WardrobePro runs with a platform-provided THREE namespace (via app.deps.THREE).
// During the JS->TS migration we keep this type permissive, but we still expose
// real structural surfaces so CheckJS can validate common usage across builder /
// platform / services without falling back to loose signatures everywhere.
//
// If later you add `three` as an npm dependency and want full typings, this file
// is the single place to swap to: `export type ThreeLike = typeof import('three');`

import type { UnknownRecord } from './common';
import type { Object3DLike, Vector3Like } from './three_like';

export interface Box3BoundsLike extends UnknownRecord {
  min: { x?: number; y?: number; z?: number };
  max: { x?: number; y?: number; z?: number };
  getCenter: (target: unknown) => unknown;
  getSize: (target: unknown) => unknown;
}

export interface Box3Like extends Box3BoundsLike {
  setFromObject: (obj: unknown) => Box3Like;
  copy: (box: unknown) => Box3Like;
  applyMatrix4: (matrix: unknown) => Box3Like;
  clone?: () => Box3Like;
}

export interface GeometryLike extends UnknownRecord {
  attributes?: UnknownRecord;
  userData?: UnknownRecord;
  boundingBox?: Box3Like | null;
  setFromPoints?: (points: unknown[]) => GeometryLike;
  computeBoundingBox?: () => unknown;
  computeVertexNormals?: () => unknown;
  translate?: (x: number, y: number, z: number) => GeometryLike;
}

export interface TextureLike extends UnknownRecord {
  wrapS: unknown;
  wrapT: unknown;
  repeat: { set: (x: number, y: number) => unknown };
  userData?: UnknownRecord;
}

export interface MaterialLike extends UnknownRecord {
  userData?: UnknownRecord;
  needsUpdate?: boolean;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  side?: unknown;
  color: { setHex: (value: number) => unknown };
  metalness?: number;
  roughness?: number;
  emissive?: unknown;
  emissiveIntensity?: number;
  envMap?: unknown;
  envMapIntensity?: number;
  premultipliedAlpha?: boolean;
}

export interface ShapeLike extends UnknownRecord {
  moveTo: (x: number, y: number) => unknown;
  lineTo: (x: number, y: number) => unknown;
  quadraticCurveTo: (cpx: number, cpy: number, x: number, y: number) => unknown;
  closePath: () => unknown;
  holes?: ShapeLike[];
}

export interface LightLike extends Object3DLike {
  castShadow?: boolean;
  intensity?: number;
  shadow?: UnknownRecord;
  target?: Object3DLike;
}

export interface RaycastPointLike {
  x?: number;
  y?: number;
  z?: number;
}

export interface RaycastIntersectionLike {
  object: UnknownRecord;
  point?: RaycastPointLike | null;
}

export interface RaycasterRuntimeLike extends UnknownRecord {
  setFromCamera: (mouse: { x: number; y: number }, camera: unknown) => void;
  intersectObjects: (
    objects: unknown,
    recursive?: boolean,
    optionalTarget?: RaycastIntersectionLike[]
  ) => RaycastIntersectionLike[];
}

export interface Vector2Like extends UnknownRecord {
  x: number;
  y: number;
}

export interface Matrix4Like extends UnknownRecord {
  copy: (matrix: unknown) => Matrix4Like;
  invert: () => Matrix4Like;
  multiplyMatrices?: (a: unknown, b: unknown) => Matrix4Like;
}

export interface QuaternionLike extends UnknownRecord {}
export interface EulerRuntimeLike extends UnknownRecord {}
export interface PerspectiveCameraLike extends UnknownRecord {}
export interface WebGLRendererLike extends UnknownRecord {}
export interface WebGLCubeRenderTargetLike extends UnknownRecord {}

export interface BufferAttributeLike extends UnknownRecord {
  count: number;
  getX: (index: number) => number;
  setZ: (index: number, value: number) => unknown;
}

export interface ColorLike extends UnknownRecord {
  setStyle: (style: string) => unknown;
  getHSL: (target: { h: number; s: number; l: number }) => unknown;
  setHSL: (h: number, s: number, l: number) => unknown;
  getHexString: () => string;
}

export type ThreeGroupCtor = new () => Object3DLike;
export type ThreeMeshCtor = new (
  geometry?: GeometryLike | unknown,
  material?: MaterialLike | MaterialLike[] | unknown
) => Object3DLike;
export type ThreeVector3Ctor = new (x?: number, y?: number, z?: number) => Vector3Like;
export type ThreeBoxGeometryCtor = new (
  width?: number,
  height?: number,
  depth?: number,
  widthSegments?: number,
  heightSegments?: number,
  depthSegments?: number
) => GeometryLike;
export type ThreePlaneGeometryCtor = new (
  width?: number,
  height?: number,
  widthSegments?: number,
  heightSegments?: number
) => GeometryLike;
export type ThreeCylinderGeometryCtor = new (
  radiusTop?: number,
  radiusBottom?: number,
  height?: number,
  radialSegments?: number,
  heightSegments?: number,
  openEnded?: boolean
) => GeometryLike;
export type ThreeTorusGeometryCtor = new (
  radius?: number,
  tube?: number,
  radialSegments?: number,
  tubularSegments?: number,
  arc?: number
) => GeometryLike;
export type ThreeBufferGeometryCtor = new () => GeometryLike;
export type ThreeEdgesGeometryCtor = new (geometry?: unknown, thresholdAngle?: number) => GeometryLike;
export type ThreeExtrudeGeometryCtor = new (shape?: unknown, options?: UnknownRecord) => GeometryLike;
export type ThreeShapeCtor = new (points?: unknown) => ShapeLike;
export type ThreeTextureCtor = new (image?: unknown) => TextureLike;
export type ThreeCanvasTextureCtor = new (
  canvas?: unknown,
  mapping?: unknown,
  wrapS?: unknown,
  wrapT?: unknown
) => TextureLike;
export type ThreeLineCtor = new (
  geometry?: GeometryLike | unknown,
  material?: MaterialLike | unknown
) => Object3DLike;
export type ThreeSpriteCtor = new (material?: MaterialLike | unknown) => Object3DLike & {
  position: Vector3Like;
  scale: { set: (x: number, y: number, z: number) => unknown };
};
export type ThreeLightCtor = new (color?: unknown, intensity?: number) => LightLike;
export type ThreeRoundedBoxGeometryCtor = new (
  width?: number,
  height?: number,
  depth?: number,
  segments?: number,
  radius?: number
) => GeometryLike;
export type ThreeShapeGeometryCtor = new (shape?: unknown, curveSegments?: number) => GeometryLike;
export type ThreePathCtor = new (points?: unknown) => ShapeLike;
export type ThreeSceneCtor = new () => Object3DLike;
export type ThreeBox3Ctor = new (min?: unknown, max?: unknown) => Box3Like;
export type ThreePlaneCtor = new (normal?: unknown, constant?: number) => UnknownRecord;
export type ThreeRaycasterCtor = new (
  origin?: unknown,
  direction?: unknown,
  near?: number,
  far?: number
) => RaycasterRuntimeLike;
export type ThreeVector2Ctor = new (x?: number, y?: number) => Vector2Like;
export type ThreeMatrix4Ctor = new () => Matrix4Like;
export type ThreeQuaternionCtor = new (x?: number, y?: number, z?: number, w?: number) => QuaternionLike;
export type ThreeEulerCtor = new (x?: number, y?: number, z?: number, order?: string) => EulerRuntimeLike;
export type ThreePerspectiveCameraCtor = new (
  fov?: number,
  aspect?: number,
  near?: number,
  far?: number
) => PerspectiveCameraLike;
export type ThreeWebGLRendererCtor = new (params?: UnknownRecord) => WebGLRendererLike;
export type ThreeWebGLCubeRenderTargetCtor = new (
  size?: number,
  options?: UnknownRecord
) => WebGLCubeRenderTargetLike;
export type ThreeCubeCameraCtor = new (
  near?: number,
  far?: number,
  renderTarget?: WebGLCubeRenderTargetLike | unknown
) => Object3DLike;
export type ThreeBufferAttributeCtor = new (
  array?: ArrayLike<number> | ArrayBufferLike,
  itemSize?: number,
  normalized?: boolean
) => BufferAttributeLike;
export type ThreeFloat32BufferAttributeCtor = new (
  array?: ArrayLike<number> | number[],
  itemSize?: number,
  normalized?: boolean
) => BufferAttributeLike;

export interface ThreeLike {
  Group: ThreeGroupCtor;
  Mesh: ThreeMeshCtor;
  Vector3: ThreeVector3Ctor;
  BoxGeometry: ThreeBoxGeometryCtor;
  PlaneGeometry: ThreePlaneGeometryCtor;
  CylinderGeometry: ThreeCylinderGeometryCtor;
  TorusGeometry: ThreeTorusGeometryCtor;
  BufferGeometry: ThreeBufferGeometryCtor;
  EdgesGeometry: ThreeEdgesGeometryCtor;
  ExtrudeGeometry: ThreeExtrudeGeometryCtor;
  Shape: ThreeShapeCtor;
  Texture: ThreeTextureCtor;
  CanvasTexture: ThreeCanvasTextureCtor;
  MeshStandardMaterial: new (opts?: UnknownRecord) => MaterialLike;
  MeshBasicMaterial: new (opts?: UnknownRecord) => MaterialLike;
  SpriteMaterial: new (opts?: UnknownRecord) => MaterialLike;
  LineBasicMaterial: new (opts?: UnknownRecord) => MaterialLike;
  Line: ThreeLineCtor;
  LineSegments: ThreeLineCtor;
  Sprite: ThreeSpriteCtor;
  AmbientLight: ThreeLightCtor;
  DirectionalLight: ThreeLightCtor;
  DoubleSide: unknown;
  FrontSide: unknown;
  BackSide: unknown;
  RepeatWrapping: unknown;
  RoundedBoxGeometry: ThreeRoundedBoxGeometryCtor;
  ShapeGeometry: ThreeShapeGeometryCtor;
  Color: new (value?: unknown) => ColorLike;
  Path: ThreePathCtor;
  Scene: ThreeSceneCtor;
  Box3: ThreeBox3Ctor;
  Plane: ThreePlaneCtor;
  Raycaster: ThreeRaycasterCtor;
  Vector2: ThreeVector2Ctor;
  Matrix4: ThreeMatrix4Ctor;
  Quaternion: ThreeQuaternionCtor;
  Euler: ThreeEulerCtor;
  PerspectiveCamera: ThreePerspectiveCameraCtor;
  WebGLRenderer: ThreeWebGLRendererCtor;
  WebGLCubeRenderTarget: ThreeWebGLCubeRenderTargetCtor;
  CubeCamera: ThreeCubeCameraCtor;
  BufferAttribute: ThreeBufferAttributeCtor;
  Float32BufferAttribute: ThreeFloat32BufferAttributeCtor;
  [k: string]: unknown;
}
