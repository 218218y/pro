import type { AppContainer, UnknownRecord } from '../../../types';

import { isIndividualShelfPartId } from '../features/part_identity/api.js';
import { __wp_measureObjectLocalBox } from './canvas_picking_local_helpers.js';
import { __wp_projectWorldPointToLocal } from './canvas_picking_projection_runtime_plane.js';
import { asRecordMap } from './canvas_picking_generic_paint_hover_shared.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type { CanvasPaintTargetScope } from './canvas_picking_paint_target_scope.js';

export type ShelfPaintProximityTarget = {
  object: UnknownRecord;
  parent: UnknownRecord | null;
  partId: string;
  stackKey: 'top' | 'bottom';
  targetScope?: CanvasPaintTargetScope;
};

type LocalPoint = { x: number; y: number; z: number };
type RawPoint = { x?: number; y?: number; z?: number };

type ShelfPaintCandidate = ShelfPaintProximityTarget & {
  yDistance: number;
  lateralDistance: number;
  score: number;
};

const MIN_VERTICAL_HALO_M = 0.035;
const MAX_VERTICAL_HALO_M = 0.075;
const MIN_LATERAL_PAD_M = 0.012;
const MAX_LATERAL_PAD_M = 0.04;

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readRawPoint(point: RawPoint | null | undefined): LocalPoint | null {
  const x = readFiniteNumber(point?.x);
  const y = readFiniteNumber(point?.y);
  const z = readFiniteNumber(point?.z);
  return x == null || y == null || z == null ? null : { x, y, z };
}

function readHitPoint(hit: RaycastHitLike | null | undefined): LocalPoint | null {
  return readRawPoint(hit?.point);
}

function readStackKey(userData: UnknownRecord | null): 'top' | 'bottom' {
  return userData && userData.__wpStack === 'bottom' ? 'bottom' : 'top';
}

function isShelfPaintBoardUserData(userData: UnknownRecord | null): boolean {
  if (!userData) return false;
  const kind = typeof userData.__kind === 'string' ? String(userData.__kind) : '';
  if (kind === 'shelf_pin' || kind === 'brace_seam') return false;
  const partId = typeof userData.partId === 'string' ? String(userData.partId) : '';
  return !!partId && isIndividualShelfPartId(partId);
}

function readShelfPartId(userData: UnknownRecord | null): string {
  return isShelfPaintBoardUserData(userData) && typeof userData?.partId === 'string'
    ? String(userData.partId)
    : '';
}

function readPointInWardrobeLocal(args: {
  App: AppContainer;
  wardrobeGroup: UnknownRecord;
  point: LocalPoint | null;
}): LocalPoint | null {
  const { App, wardrobeGroup, point } = args;
  if (!point) return null;
  const projected = __wp_projectWorldPointToLocal(App, point, wardrobeGroup);
  if (projected) return projected;
  return point;
}

function distanceOutsideAxis(value: number, center: number, size: number, pad: number): number {
  const half = Math.max(0, size / 2);
  const delta = Math.abs(value - center) - half - pad;
  return delta > 0 ? delta : 0;
}

function resolveShelfHaloM(box: { width: number; height: number; depth: number }): {
  verticalHalo: number;
  lateralPad: number;
} {
  const minDimension = Math.max(0.001, Math.min(box.width, box.height, box.depth));
  return {
    verticalHalo: Math.max(MIN_VERTICAL_HALO_M, Math.min(MAX_VERTICAL_HALO_M, minDimension * 2.75)),
    lateralPad: Math.max(MIN_LATERAL_PAD_M, Math.min(MAX_LATERAL_PAD_M, minDimension * 1.75)),
  };
}

function considerShelfPaintCandidate(args: {
  App: AppContainer;
  wardrobeGroup: UnknownRecord;
  object: UnknownRecord;
  point: LocalPoint;
  best: ShelfPaintCandidate | null;
}): ShelfPaintCandidate | null {
  const { App, wardrobeGroup, object, point, best } = args;
  const userData = asRecordMap(object.userData);
  const partId = readShelfPartId(userData);
  if (!partId) return best;

  const box = __wp_measureObjectLocalBox(App, object, wardrobeGroup);
  if (!box || !(box.width > 0) || !(box.height > 0) || !(box.depth > 0)) return best;

  const { verticalHalo, lateralPad } = resolveShelfHaloM(box);
  const yDistance = distanceOutsideAxis(point.y, box.centerY, box.height, verticalHalo);
  if (yDistance > 0) return best;

  const xDistance = distanceOutsideAxis(point.x, box.centerX, box.width, lateralPad);
  const zDistance = distanceOutsideAxis(point.z, box.centerZ, box.depth, lateralPad);
  if (xDistance > 0 || zDistance > 0) return best;

  const lateralDistance = Math.max(xDistance, zDistance);
  const score = Math.abs(point.y - box.centerY) + lateralDistance * 0.5;
  if (best && best.score <= score) return best;

  return {
    object,
    parent: asRecordMap(object.parent),
    partId,
    stackKey: readStackKey(userData),
    yDistance,
    lateralDistance,
    score,
  };
}

function scanShelfPaintCandidates(args: {
  App: AppContainer;
  wardrobeGroup: UnknownRecord;
  node: unknown;
  point: LocalPoint;
  best: ShelfPaintCandidate | null;
}): ShelfPaintCandidate | null {
  const obj = asRecordMap(args.node);
  if (!obj) return args.best;

  let best = considerShelfPaintCandidate({
    App: args.App,
    wardrobeGroup: args.wardrobeGroup,
    object: obj,
    point: args.point,
    best: args.best,
  });

  const children = Array.isArray(obj.children) ? obj.children : [];
  for (let i = 0; i < children.length; i += 1) {
    best = scanShelfPaintCandidates({
      App: args.App,
      wardrobeGroup: args.wardrobeGroup,
      node: children[i],
      point: args.point,
      best,
    });
  }
  return best;
}

export function resolveNearbyShelfPaintTarget(args: {
  App: AppContainer;
  wardrobeGroup: UnknownRecord;
  intersects: readonly RaycastHitLike[] | null | undefined;
  primaryHitPoint?: RawPoint | null;
}): ShelfPaintProximityTarget | null {
  const { App, wardrobeGroup, intersects } = args;
  const firstHit = Array.isArray(intersects) && intersects.length ? intersects[0] : null;
  const rawPoint = readRawPoint(args.primaryHitPoint || null) || readHitPoint(firstHit);
  const point = readPointInWardrobeLocal({ App, wardrobeGroup, point: rawPoint });
  if (!point) return null;

  const best = scanShelfPaintCandidates({ App, wardrobeGroup, node: wardrobeGroup, point, best: null });
  if (!best) return null;

  return {
    object: best.object,
    parent: best.parent,
    partId: best.partId,
    stackKey: best.stackKey,
  };
}
