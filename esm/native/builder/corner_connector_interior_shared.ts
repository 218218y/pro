// Corner connector interior contracts/helpers.
//
// Keep the public connector interior seam focused on orchestration while the
// pentagon special-layout and attach-rod flows consume a shared typed runtime
// contract.

import type { UnknownRecord } from '../../../types';
import type { ThrottleOpts } from '../runtime/throttled_errors.js';

export type P2 = { x: number; z: number };
export type CornerPointLike = { x: number; z: number; y?: number };
export type RotationLike = { x: number; y: number; z: number };
export type NodeLike = {
  position: { y: number; set(x: number, y: number, z: number): void };
  rotation: RotationLike;
  userData: UnknownRecord;
};
export type GroupLike = NodeLike & { add(obj: unknown): void };
export type AddRealisticHangerLike = (
  rodX: number,
  rodY: number,
  rodZ: number,
  parentGroup: GroupLike,
  moduleWidth?: number,
  enabledOverride?: boolean
) => unknown;
export type AddHangingClothesLike = (
  rodX: number,
  rodY: number,
  rodZ: number,
  width: number,
  parentGroup: GroupLike,
  maxHeight: number,
  isRestrictedDepth?: boolean | number,
  showContentsOverride?: boolean,
  doorStyleOverride?: unknown
) => unknown;
export type AddFoldedClothesLike = (
  shelfX: number,
  shelfY: number,
  shelfZ: number,
  width: number,
  parentGroup: GroupLike,
  maxHeight?: number,
  maxDepth?: number
) => unknown;
export type ShapeLike = { moveTo(x: number, y: number): void; lineTo(x: number, y: number): void };
export type ThreeInteriorLike = {
  Group: new () => GroupLike;
  Shape: new () => ShapeLike;
  Mesh: new (geometry: unknown, material: unknown) => NodeLike;
  BoxGeometry: new (width: number, height: number, depth: number) => unknown;
  CylinderGeometry: new (
    radiusTop: number,
    radiusBottom: number,
    height: number,
    radialSegments?: number
  ) => unknown;
  ExtrudeGeometry: new (
    shape: unknown,
    options: { depth: number; bevelEnabled: boolean; steps?: number }
  ) => unknown;
};
export type CornerConnectorInteriorCtx = {
  App: unknown;
  THREE: ThreeInteriorLike;
  woodThick: number;
  startY: number;
  wingH: number;
  uiAny: UnknownRecord;
  showHangerEnabled?: boolean;
  showContentsEnabled?: boolean;
  addOutlines: (mesh: unknown) => void;
  getMaterial: (name: unknown, kind: string) => unknown;
  getCornerMat: (partId: string, defaultMaterial: unknown) => unknown;
  bodyMat: unknown;
  addRealisticHanger?: AddRealisticHangerLike;
  addHangingClothes?: AddHangingClothesLike;
  addFoldedClothes?: AddFoldedClothesLike;
};
export type CornerConnectorInteriorLocals = {
  mx: (x: number) => number;
  L: number;
  Dmain: number;
  shape: unknown;
  pts: CornerPointLike[];
  interiorX: number;
  interiorZ: number;
  panelThick: number;
  backPanelThick: number;
  __backPanelOutsideInsetZ: number;
  cornerGroup: GroupLike;
};
export type CornerConnectorInteriorHelpers = {
  reportErrorThrottled: (app: unknown, error: unknown, meta: ThrottleOpts) => void;
};
export type CornerConnectorInteriorFlowParams = {
  ctx: CornerConnectorInteriorCtx;
  locals: CornerConnectorInteriorLocals;
  helpers: CornerConnectorInteriorHelpers;
};

export type CornerConnectorInteriorEmitters = {
  emitFoldedClothes: AddFoldedClothesLike | null;
  emitRealisticHanger: AddRealisticHangerLike | null;
  emitHangingClothes: AddHangingClothesLike | null;
};

export function createCornerConnectorInteriorEmitters(
  ctx: CornerConnectorInteriorCtx
): CornerConnectorInteriorEmitters {
  return {
    emitFoldedClothes: typeof ctx.addFoldedClothes === 'function' ? ctx.addFoldedClothes : null,
    emitRealisticHanger: typeof ctx.addRealisticHanger === 'function' ? ctx.addRealisticHanger : null,
    emitHangingClothes: typeof ctx.addHangingClothes === 'function' ? ctx.addHangingClothes : null,
  };
}
