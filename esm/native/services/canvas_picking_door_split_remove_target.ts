import type { AppContainer, UnknownRecord } from '../../../types';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import type { HitObjectLike } from './canvas_picking_engine.js';
import { DOOR_SYSTEM_DIMENSIONS } from '../../shared/dimensions/door_system_policy.js';
import { getCamera } from '../runtime/render_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import type { CanvasDoorSplitBounds } from './canvas_picking_door_split_click_contracts.js';

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readDoorMarkerPlaneZ(hitDoorGroup: unknown): number {
  const group = asRecord(hitDoorGroup);
  const userData = asRecord(group?.userData);
  const zSign = isFiniteNumber(userData?.__handleZSign) ? Number(userData.__handleZSign) : 1;
  const zOff = DOOR_SYSTEM_DIMENSIONS.hinged.split.hoverMarkerZOffsetM;
  return zOff * (zSign === -1 ? -1 : 1);
}

function readDoorLocalXSpan(hitDoorGroup: unknown): { minX: number; maxX: number } {
  const group = asRecord(hitDoorGroup);
  const userData = asRecord(group?.userData);
  const rectMin = isFiniteNumber(userData?.__doorRectMinX) ? Number(userData.__doorRectMinX) : NaN;
  const rectMax = isFiniteNumber(userData?.__doorRectMaxX) ? Number(userData.__doorRectMaxX) : NaN;
  if (Number.isFinite(rectMin) && Number.isFinite(rectMax) && rectMax > rectMin) {
    return { minX: rectMin, maxX: rectMax };
  }

  const width = isFiniteNumber(userData?.__doorWidth)
    ? Math.max(0.01, Number(userData.__doorWidth))
    : DOOR_SYSTEM_DIMENSIONS.hinged.split.hoverDefaultDoorWidthM;
  const meshOffsetX = isFiniteNumber(userData?.__doorMeshOffsetX) ? Number(userData.__doorMeshOffsetX) : 0;
  return { minX: meshOffsetX - width / 2, maxX: meshOffsetX + width / 2 };
}

function readGroupWorldY(App: AppContainer, hitDoorGroup: unknown): number | null {
  const group = asRecord(hitDoorGroup);
  if (!group) return null;

  try {
    const THREE = getThreeMaybe(App);
    const getWorldPosition = group.getWorldPosition;
    if (THREE && typeof THREE.Vector3 === 'function' && typeof getWorldPosition === 'function') {
      const v = new THREE.Vector3();
      Reflect.apply(getWorldPosition, group, [v]);
      if (isFiniteNumber(v.y)) return Number(v.y);
    }
  } catch {
    // The next path keeps test doubles and simple object graphs working.
  }

  const pos = asRecord(group.position);
  return isFiniteNumber(pos?.y) ? Number(pos.y) : null;
}

function projectLocalPointToNdc(args: {
  App: AppContainer;
  camera: unknown;
  hitDoorGroup: unknown;
  localX: number;
  worldY: number;
  planeZ: number;
}): { x: number; y: number } | null {
  const { App, camera, hitDoorGroup, localX, worldY, planeZ } = args;
  const group = asRecord(hitDoorGroup);
  if (!group || !camera) return null;

  try {
    const THREE = getThreeMaybe(App);
    const localToWorld = group.localToWorld;
    if (!THREE || typeof THREE.Vector3 !== 'function' || typeof localToWorld !== 'function') return null;

    const groupWorldY = readGroupWorldY(App, hitDoorGroup);
    if (!isFiniteNumber(groupWorldY)) return null;

    const v = new THREE.Vector3(localX, worldY - groupWorldY, planeZ);
    Reflect.apply(localToWorld, group, [v]);
    if (typeof v.project !== 'function') return null;
    Reflect.apply(v.project, v, [camera]);
    if (!isFiniteNumber(v.x) || !isFiniteNumber(v.y)) return null;
    return { x: Number(v.x), y: Number(v.y) };
  } catch {
    return null;
  }
}

function distancePointToSegmentNdc(
  px: number,
  py: number,
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = px - a.x;
  const wy = py - a.y;
  const lenSq = vx * vx + vy * vy;
  if (!(lenSq > 1e-12)) return Math.hypot(px - a.x, py - a.y);
  const t = clamp((wx * vx + wy * vy) / lenSq, 0, 1);
  const cx = a.x + vx * t;
  const cy = a.y + vy * t;
  return Math.hypot(px - cx, py - cy);
}

function resolveCutLineScreenDistance(args: {
  App: AppContainer;
  camera: unknown;
  hitDoorGroup: unknown;
  ndcX: number | null | undefined;
  ndcY: number | null | undefined;
  cutY: number;
  worldTolerance: number;
}): { distanceNdc: number; toleranceNdc: number } | null {
  const { App, camera, hitDoorGroup, ndcX, ndcY, cutY, worldTolerance } = args;
  if (!isFiniteNumber(ndcX) || !isFiniteNumber(ndcY)) return null;
  const span = readDoorLocalXSpan(hitDoorGroup);
  const z = readDoorMarkerPlaneZ(hitDoorGroup);
  const a = projectLocalPointToNdc({ App, camera, hitDoorGroup, localX: span.minX, worldY: cutY, planeZ: z });
  const b = projectLocalPointToNdc({ App, camera, hitDoorGroup, localX: span.maxX, worldY: cutY, planeZ: z });
  if (!a || !b) return null;

  const midX = (span.minX + span.maxX) / 2;
  const p0 = projectLocalPointToNdc({ App, camera, hitDoorGroup, localX: midX, worldY: cutY, planeZ: z });
  const p1 = projectLocalPointToNdc({
    App,
    camera,
    hitDoorGroup,
    localX: midX,
    worldY: cutY + Math.max(0.005, worldTolerance),
    planeZ: z,
  });
  const projectedTol = p0 && p1 ? Math.abs(p1.y - p0.y) : 0;
  const toleranceNdc = Math.max(0.012, Math.min(0.08, projectedTol || 0));
  return {
    distanceNdc: distancePointToSegmentNdc(Number(ndcX), Number(ndcY), a, b),
    toleranceNdc,
  };
}

export function resolveCanvasDoorCustomSplitRemoveTolerance(bounds: CanvasDoorSplitBounds): number {
  const H = Number(bounds.maxY) - Number(bounds.minY);
  const dims = DOOR_SYSTEM_DIMENSIONS.hinged.split;
  return Math.max(
    dims.hoverCustomRemoveToleranceMinM,
    Math.min(dims.hoverCustomRemoveToleranceMaxM, H * dims.hoverCustomRemoveToleranceRatio)
  );
}

export function resolveCanvasDoorCustomSplitRemoveTarget(args: {
  App: AppContainer;
  bounds: CanvasDoorSplitBounds;
  prevList: number[];
  pointerY?: number | null;
  ndcX?: number | null;
  ndcY?: number | null;
  camera?: unknown;
  hitDoorGroup?: unknown;
  toleranceAbs?: number | null;
}): { index: number; yAbs: number; distanceAbs: number; distanceNdc: number | null } | null {
  const { App, bounds, prevList, pointerY, ndcX, ndcY, hitDoorGroup } = args;
  const minY = Number(bounds.minY);
  const maxY = Number(bounds.maxY);
  const H = maxY - minY;
  if (!Number.isFinite(H) || !(H > 0.05) || !Array.isArray(prevList) || !prevList.length) return null;

  const dims = DOOR_SYSTEM_DIMENSIONS.hinged.split;
  const padAbs = dims.hoverCustomEdgePadM;
  const tolAbs = isFiniteNumber(args.toleranceAbs)
    ? Math.max(0, Number(args.toleranceAbs))
    : resolveCanvasDoorCustomSplitRemoveTolerance(bounds);
  const camera = args.camera || getCamera(App);

  let best: {
    index: number;
    yAbs: number;
    distanceAbs: number;
    distanceNdc: number | null;
    score: number;
  } | null = null;

  for (let i = 0; i < prevList.length; i++) {
    const n = prevList[i];
    if (!Number.isFinite(n)) continue;
    const normalized = clamp(Number(n), 0, 1);
    const yAbs = clamp(minY + normalized * H, minY + padAbs, maxY - padAbs);
    const distanceAbs = isFiniteNumber(pointerY) ? Math.abs(yAbs - Number(pointerY)) : Infinity;
    const screen = hitDoorGroup
      ? resolveCutLineScreenDistance({
          App,
          camera,
          hitDoorGroup,
          ndcX,
          ndcY,
          cutY: yAbs,
          worldTolerance: tolAbs,
        })
      : null;

    const screenMatch = !!screen && screen.distanceNdc <= screen.toleranceNdc;
    const worldMatch = distanceAbs <= tolAbs;
    if (!screenMatch && !worldMatch) continue;

    const score =
      screenMatch && screen
        ? screen.distanceNdc / Math.max(screen.toleranceNdc, 1e-6)
        : distanceAbs / Math.max(tolAbs, 1e-6);
    if (!best || score < best.score) {
      best = {
        index: i,
        yAbs,
        distanceAbs,
        distanceNdc: screen ? screen.distanceNdc : null,
        score,
      };
    }
  }

  return best
    ? { index: best.index, yAbs: best.yAbs, distanceAbs: best.distanceAbs, distanceNdc: best.distanceNdc }
    : null;
}

export type CanvasDoorCustomSplitScreenRemoveCandidate = {
  doorBaseKey: string;
  hitDoorGroup: HitObjectLike;
  bounds: CanvasDoorSplitBounds;
  target: { index: number; yAbs: number; distanceAbs: number; distanceNdc: number | null };
};

export function resolveCanvasDoorCustomSplitScreenRemoveCandidate(args: {
  App: AppContainer;
  roots: unknown;
  ndcX?: number | null;
  ndcY?: number | null;
  camera?: unknown;
  readBounds: (App: AppContainer, doorBaseKey: string) => CanvasDoorSplitBounds | null;
  readPosList: (App: AppContainer, doorBaseKey: string) => number[];
  normalizeDoorBaseKey: (App: AppContainer, hitDoorGroup: HitObjectLike, hitDoorPid: string) => string;
}): CanvasDoorCustomSplitScreenRemoveCandidate | null {
  const { App, ndcX, ndcY, readBounds, readPosList, normalizeDoorBaseKey } = args;
  if (!isFiniteNumber(ndcX) || !isFiniteNumber(ndcY)) return null;
  const roots = Array.isArray(args.roots) ? args.roots : [];
  if (!roots.length) return null;
  const camera = args.camera || getCamera(App);
  if (!camera) return null;

  let best: (CanvasDoorCustomSplitScreenRemoveCandidate & { score: number }) | null = null;
  const seen = new Set<string>();

  for (let i = 0; i < roots.length; i++) {
    const groupRec = asRecord(roots[i]);
    if (!groupRec) continue;
    const group = groupRec as HitObjectLike;
    const userData = asRecord(groupRec?.userData);
    const hitDoorPid = formatIdentityValue(readIdentityValue(userData?.partId));
    if (!hitDoorPid) continue;

    let doorBaseKey = '';
    try {
      doorBaseKey = normalizeDoorBaseKey(App, group, hitDoorPid);
    } catch {
      doorBaseKey = hitDoorPid;
    }
    if (!doorBaseKey) continue;

    const bounds = readBounds(App, doorBaseKey);
    if (!bounds) continue;
    const prevList = readPosList(App, doorBaseKey);
    if (!prevList.length) continue;

    const target = resolveCanvasDoorCustomSplitRemoveTarget({
      App,
      bounds,
      prevList,
      pointerY: null,
      ndcX,
      ndcY,
      camera,
      hitDoorGroup: group,
      toleranceAbs: resolveCanvasDoorCustomSplitRemoveTolerance(bounds),
    });
    if (!target || target.distanceNdc == null) continue;

    const key = `${doorBaseKey}:${target.index}:${target.yAbs}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const score = target.distanceNdc;
    if (!best || score < best.score) {
      best = { doorBaseKey, hitDoorGroup: group, bounds, target, score };
    }
  }

  return best
    ? {
        doorBaseKey: best.doorBaseKey,
        hitDoorGroup: best.hitDoorGroup,
        bounds: best.bounds,
        target: best.target,
      }
    : null;
}
