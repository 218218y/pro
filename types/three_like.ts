// Minimal three.js-like surfaces shared across app/build/platform layers.
// Keep these permissive but with the fields/methods we actually use in CheckJS/TS.

import type { UnknownRecord } from './common';

/**
 * Small, structural vector used across the codebase.
 * Intentionally *not* tied to three.js to keep boundary surfaces lightweight.
 */
export type Vec3Like = { x: number; y: number; z: number };

export interface Vector3Like extends UnknownRecord {
  x: number;
  y: number;
  z: number;

  set: (x: number, y: number, z: number) => Vector3Like;
  copy: (v: Vec3Like) => Vector3Like;
  clone: () => Vector3Like;

  sub: (v: Vec3Like) => Vector3Like;
  add: (v: Vec3Like) => Vector3Like;
  multiplyScalar: (s: number) => Vector3Like;
  addVectors: (a: Vec3Like, b: Vec3Like) => Vector3Like;
  lerp: (v: Vec3Like, alpha: number) => Vector3Like;
}

export interface EulerLike extends UnknownRecord {
  x: number;
  y: number;
  z: number;
}

export interface Object3DLike extends UnknownRecord {
  name?: string;
  visible?: boolean;

  parent: Object3DLike | null;
  // In three.js this is always an array; keeping it required avoids strict null-check noise.
  children: Object3DLike[];

  position: Vector3Like;
  rotation: EulerLike;
  scale: Vector3Like;

  // In three.js this is always an object (defaults to {}). Required for strict mode.
  userData: UnknownRecord;

  add: (obj: Object3DLike, ...rest: Object3DLike[]) => unknown;
  remove: (obj: Object3DLike, ...rest: Object3DLike[]) => unknown;
  getObjectByName?: (name: string) => Object3DLike | null;
  traverse?: (fn: (obj: Object3DLike) => void) => void;

  // Mesh-ish flags/properties (used for best-effort picking / ignoring raycast)
  isMesh?: boolean;
  raycast?: (raycaster: unknown, intersects: unknown[]) => unknown;
}

export interface CameraLike extends UnknownRecord {
  position: Vector3Like;
  fov: number;
  updateProjectionMatrix: () => unknown;
  updateMatrixWorld?: (force?: boolean) => unknown;
}

export interface ControlsLike extends EventTarget, UnknownRecord {
  target: Vector3Like;
  enableDamping?: boolean;
  update: () => unknown;
}

export interface WebGLRenderTargetLike extends UnknownRecord {
  texture?: unknown;
}
