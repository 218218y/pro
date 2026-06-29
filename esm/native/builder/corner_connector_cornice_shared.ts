// Corner connector cornice contracts/helpers.
//
// Keep the public connector cornice owner focused on orchestration while wave /
// profile / hitbox details consume a shared typed contract.

import {
  CARCASS_CORNICE_DIMENSIONS,
  CORNER_WING_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
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
  mainH?: number;
  baseLegTopPlatformHeightM?: number;
  __stackOffsetZ: number;
  __stackKey: string;
  hasCorniceEnabled?: boolean;
  __corniceAllowedForThisStack: boolean;
  __corniceTypeNorm: string;
  bodyMat: unknown;
  addOutlines: (mesh: unknown) => void;
  getCornerMat: (partId: string, defaultMaterial: unknown) => unknown;
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
  adjacentWingBodyHeight?: number | null;
  adjacentMainBodyHeight?: number | null;
};
export type CornerConnectorCorniceHelpers = {
  readNumFrom: (obj: unknown, key: string, defaultValue: number) => number;
  asRecord: (value: unknown) => UnknownRecord;
  reportErrorThrottled: (app: unknown, error: unknown, meta: ThrottleOpts) => void;
};
export type CornerConnectorCorniceFlowParams = {
  ctx: CornerConnectorCorniceCtx;
  locals: CornerConnectorCorniceLocals;
  helpers: CornerConnectorCorniceHelpers;
};

export function positiveConnectorTopPlatformHeight(ctx: { baseLegTopPlatformHeightM?: unknown }): number {
  const value = ctx.baseLegTopPlatformHeightM;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function resolveCornerConnectorCorniceTopY(ctx: {
  startY: number;
  wingH: number;
  baseLegTopPlatformHeightM?: unknown;
}): number {
  const bodyHeight = Number.isFinite(ctx.wingH) && ctx.wingH > 0 ? ctx.wingH : 0;
  return ctx.startY + bodyHeight + positiveConnectorTopPlatformHeight(ctx);
}

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

export type CornerConnectorCorniceSideReturn = {
  side: 'wing' | 'main';
  partId: 'corner_cornice_side_left' | 'corner_cornice_side_right';
  a: CornerPointLike;
  b: CornerPointLike;
};

function finitePositiveOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function readOptionalNeighborBodyHeight(value: unknown, defaultHeight: number): number | null {
  if (value === null) return null;
  const n = finitePositiveOrNull(value);
  return n == null ? defaultHeight : n;
}

function isConnectorTallerThanNeighbor(
  connectorBodyHeight: number,
  neighborBodyHeight: number | null
): boolean {
  if (!Number.isFinite(connectorBodyHeight) || connectorBodyHeight <= 0) return false;
  if (neighborBodyHeight == null) return true;
  return connectorBodyHeight > neighborBodyHeight + CARCASS_CORNICE_DIMENSIONS.common.epsilonM;
}

export function resolveCornerConnectorCorniceSideReturns(args: {
  ctx: Pick<CornerConnectorCorniceCtx, 'wingH' | 'mainH'>;
  locals: Pick<CornerConnectorCorniceLocals, 'pts' | 'adjacentWingBodyHeight' | 'adjacentMainBodyHeight'>;
}): CornerConnectorCorniceSideReturn[] {
  const { ctx, locals } = args;
  const pts = Array.isArray(locals.pts) ? locals.pts : [];
  if (pts.length < 5) return [];

  const connectorBodyHeight = finitePositiveOrNull(ctx.wingH) ?? 0;
  const wingNeighborBodyHeight = readOptionalNeighborBodyHeight(
    locals.adjacentWingBodyHeight,
    connectorBodyHeight
  );
  const mainNeighborBodyHeight = readOptionalNeighborBodyHeight(
    locals.adjacentMainBodyHeight,
    readOptionalNeighborBodyHeight(ctx.mainH, connectorBodyHeight) ?? connectorBodyHeight
  );

  const out: CornerConnectorCorniceSideReturn[] = [];
  if (isConnectorTallerThanNeighbor(connectorBodyHeight, wingNeighborBodyHeight)) {
    out.push({ side: 'wing', partId: 'corner_cornice_side_left', a: pts[1], b: pts[2] });
  }
  if (isConnectorTallerThanNeighbor(connectorBodyHeight, mainNeighborBodyHeight)) {
    // Use a back-to-front path so the visible miter is on the diagonal/front joint.
    out.push({ side: 'main', partId: 'corner_cornice_side_right', a: pts[4], b: pts[3] });
  }
  return out;
}

export function appendCornerConnectorCorniceHitArea(args: {
  ctx: CornerConnectorCorniceCtx;
  locals: CornerConnectorCorniceLocals;
}): void {
  const { ctx, locals } = args;
  const { THREE, startY, wingH, __stackKey } = ctx;
  const { mx, L, cornerGroup } = locals;

  const bbW = Math.max(CORNER_WING_DIMENSIONS.connector.corniceHitMinWidthM, L);
  const bbD = Math.max(CORNER_WING_DIMENSIONS.connector.corniceHitMinWidthM, L);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, side: THREE.DoubleSide });
  // IMPORTANT: material.visible=false is ignored by the picking system.
  // Use a fully-transparent material so the hitbox remains clickable.
  // Also: depthWrite MUST be disabled, otherwise this invisible mesh can hide transparent curtains/glass
  // (it writes to the depth buffer and blocks rendering when doors are closed).
  hitMat.depthWrite = false;
  hitMat.colorWrite = false;

  const hitHeight = Math.max(
    CORNER_WING_DIMENSIONS.connector.corniceHitMinWidthM,
    wingH - CORNER_WING_DIMENSIONS.connector.corniceHitHeightClearanceM
  );
  const hit = new THREE.Mesh(new THREE.BoxGeometry(bbW, hitHeight, bbD), hitMat);
  hit.renderOrder = -1000;
  hit.position.set(
    mx(-L / 2),
    startY + (wingH - CORNER_WING_DIMENSIONS.connector.corniceHitHeightClearanceM) / 2,
    L / 2
  );
  hit.userData = {
    moduleIndex: 'corner_pentagon',
    isModuleSelector: true,
    __wpStack: __stackKey,
    partId: 'corner_pent_hit',
  };
  cornerGroup.add(hit);
}
