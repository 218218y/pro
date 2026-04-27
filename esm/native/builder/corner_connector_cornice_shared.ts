// Corner connector cornice contracts/helpers.
//
// Keep the public connector cornice owner focused on orchestration while wave /
// profile / hitbox details consume a shared typed contract.

import type { BufferAttrLike } from './corner_geometry_plan.js';
import type { UnknownRecord } from '../../../types';
import type { ThrottleOpts } from '../runtime/throttled_errors.js';

export type CornerPointLike = { x: number; z: number; y?: number };
export type EulerLike = { y: number };
export type NodeLike = {
  position: { x: number; z: number; set(x: number, y: number, z: number): void };
  rotation: EulerLike;
  scale: { x: number };
  userData: UnknownRecord;
  castShadow?: boolean;
  receiveShadow?: boolean;
  renderOrder?: number;
};
export type GroupLike = NodeLike & { add(obj: unknown): void };
export type ShapeLike = { moveTo(x: number, y: number): void; lineTo(x: number, y: number): void };
export type Vector3Like = {
  x: number;
  z: number;
  applyEuler?(value: unknown): Vector3Like;
  normalize?(): Vector3Like;
  lengthSq?(): number;
  dot?(value: unknown): number;
};
export type ExtrudeGeometryLike = {
  computeVertexNormals?(): void;
  translate?(x: number, y: number, z: number): void;
  getAttribute?(name: string): unknown;
};
export type ThreeConnectorCorniceLike = {
  Shape: new () => ShapeLike;
  ExtrudeGeometry: new (
    shape: unknown,
    options: { depth: number; bevelEnabled: boolean; steps?: number }
  ) => ExtrudeGeometryLike;
  Mesh: new (geometry: unknown, material: unknown) => NodeLike;
  Vector3: new (x: number, y: number, z: number) => Vector3Like;
  MeshBasicMaterial: new (params: {
    transparent?: boolean;
    opacity?: number;
    side?: unknown;
  }) => UnknownRecord & { depthWrite?: boolean; colorWrite?: boolean };
  BoxGeometry: new (width: number, height: number, depth: number) => unknown;
  DoubleSide?: unknown;
};
export type CornerConnectorCorniceCtx = {
  App: unknown;
  THREE: ThreeConnectorCorniceLike;
  woodThick: number;
  startY: number;
  wingH: number;
  __stackOffsetZ: number;
  __stackKey: string;
  hasCorniceEnabled?: boolean;
  __corniceAllowedForThisStack: boolean;
  __corniceTypeNorm: string;
  bodyMat: unknown;
  addOutlines: (mesh: unknown) => void;
  getCornerMat: (partId: string, fallback: unknown) => unknown;
  __sketchMode: boolean;
};
export type CornerConnectorCorniceLocals = {
  pts: CornerPointLike[];
  cornerGroup: GroupLike;
  interiorX: number;
  interiorZ: number;
  mx: (x: number) => number;
  L: number;
  panelThick?: number;
  backPanelThick?: number;
  showFrontPanel?: boolean;
};
export type CornerConnectorCorniceHelpers = {
  readNumFrom: (obj: unknown, key: string, fallback: number) => number;
  asRecord: (value: unknown) => UnknownRecord;
  reportErrorThrottled: (app: unknown, error: unknown, meta: ThrottleOpts) => void;
};
export type CornerConnectorCorniceFlowParams = {
  ctx: CornerConnectorCorniceCtx;
  locals: CornerConnectorCorniceLocals;
  helpers: CornerConnectorCorniceHelpers;
};

export function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isUnknownRecord(value) ? value : null;
}

export function hasCorniceExtrusionSupport(THREE: unknown): THREE is ThreeConnectorCorniceLike {
  const rec = asRecord(THREE);
  return (
    !!rec &&
    typeof rec.Shape === 'function' &&
    typeof rec.ExtrudeGeometry === 'function' &&
    typeof rec.Mesh === 'function'
  );
}

export function isBufferAttrLike(value: unknown): value is BufferAttrLike {
  const rec = asRecord(value);
  return (
    !!rec && typeof rec.count === 'number' && typeof rec.getX === 'function' && typeof rec.setZ === 'function'
  );
}

export function readBufferAttribute(value: unknown): BufferAttrLike | null {
  return isBufferAttrLike(value) ? value : null;
}

export function appendCornerConnectorCorniceHitArea(args: {
  ctx: CornerConnectorCorniceCtx;
  locals: CornerConnectorCorniceLocals;
}): void {
  const { ctx, locals } = args;
  const { THREE, startY, wingH, __stackKey } = ctx;
  const { mx, L, cornerGroup } = locals;

  const bbW = Math.max(0.05, L);
  const bbD = Math.max(0.05, L);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, side: THREE.DoubleSide });
  // IMPORTANT: material.visible=false is ignored by the picking system.
  // Use a fully-transparent material so the hitbox remains clickable.
  // Also: depthWrite MUST be disabled, otherwise this invisible mesh can hide transparent curtains/glass
  // (it writes to the depth buffer and blocks rendering when doors are closed).
  hitMat.depthWrite = false;
  hitMat.colorWrite = false;

  const hit = new THREE.Mesh(new THREE.BoxGeometry(bbW, Math.max(0.05, wingH - 0.05), bbD), hitMat);
  hit.renderOrder = -1000;
  hit.position.set(mx(-L / 2), startY + (wingH - 0.05) / 2, L / 2);
  hit.userData = {
    moduleIndex: 'corner_pentagon',
    isModuleSelector: true,
    __wpStack: __stackKey,
    partId: 'corner_pent_hit',
  };
  cornerGroup.add(hit);
}
