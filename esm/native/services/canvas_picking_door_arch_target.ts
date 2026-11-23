import type { Vector3Like } from '../../../types/three_like.js';
import type { AppContainer, Object3DLike, ThreeLike, Vec3Like } from '../../../types';
import type {
  DoorArchCut,
  DoorArchPoint,
  DoorArchProfile,
  DoorArchRect,
  DoorCurveShape,
} from '../../../types/maps.js';
import {
  containsDoorArchPoint,
  DOOR_ARCH_OUTER_CLEARANCE_M,
  doorArchSpan,
  doorContourSpanAtX,
  doorArchOutline,
  intersectDoorContours,
  getDoorsArray,
  isCanonicalDoorVisualMapKey,
  resolveDoorArchCutSlice,
  type DoorArchTool,
} from './canvas_picking_door_edit_shared.js';
import {
  readDoorLeafRectFromUserData,
  readPointXYZ,
  readGrooveSurfaceRectFromUserData,
  readMirrorPlacementRectFromUserData,
  resolveGrooveSurfaceOwnerByPartId,
  resolveMirrorPlacementOwnerByPartId,
} from './canvas_picking_door_shared.js';
import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
import { resolveCanvasDoorSplitVerticalLockedWorldY } from './canvas_picking_door_split_pointer_y.js';
import type { RaycasterLike } from './canvas_picking_engine.js';
import { __wp_scopeCornerPartKeyForStack } from './canvas_picking_core_helpers.js';

export type ArchSurface = {
  group: Object3DLike;
  anchor: Object3DLike;
  contour?: readonly DoorArchPoint[];
  key: string;
  rect: DoorArchRect;
  z: number;
  face: 1 | -1;
  toWorld: (point: Vector3Like) => Vector3Like;
  toLocal: (point: Vector3Like) => Vector3Like;
};

export type DoorArchSlice = {
  surface: ArchSurface;
  rect: DoorArchRect;
  profile: DoorArchProfile;
};

export type DoorArchTarget = {
  surface: ArchSurface;
  point: Vector3Like;
  surfaces: { surface: ArchSurface; offsetX: number; offsetY: number }[];
  seam: number | null;
  snapToEnd?: boolean;
  removalOnly?: boolean;
  allSurfaces: ArchSurface[];
};

const EDGE_SNAP_M = 0.055;
const VERTICAL_EDGE_SNAP_M = 0.045;
const MAX_SEAM_GAP_M = 0.025;
const PLANE_EPSILON_M = 0.008;
const SURFACE_INSET_M = 0.004;

function readArchSurface(group: Object3DLike, tool: DoorArchTool, face: 1 | -1): ArchSurface | null {
  const ud = group.userData;
  const partId = ud.partId;
  if (typeof partId !== 'string' || ud.__wpDoorRemoved === true || group.visible === false) return null;

  let owner = group;
  let contour: readonly DoorArchPoint[] | undefined;
  let rect = readDoorLeafRectFromUserData(ud);
  let key = __wp_scopeCornerPartKeyForStack(partId, ud.__wpStack === 'bottom' ? 'bottom' : 'top');
  let z = typeof ud.__wpFrontThickness === 'number' ? (ud.__wpFrontThickness / 2) * face : 0;
  if (tool === 'cut') {
    const match = /^d([1-9]\d*)_(full|top|bot|mid\d*)$/.exec(partId);
    if (!match || !rect || face < 0 || ud.__wpWinterBraceDoorPlan || ud.__wpSketchSegmentedDoor) return null;
    key = `splitarch_d${match[1]}`;
    const width = ud.__wpFrontVisualWidth;
    if (typeof width === 'number') {
      const center = (rect.minX + rect.maxX) / 2;
      rect = { ...rect, minX: center - width / 2, maxX: center + width / 2 };
    }
    if (typeof ud.__wpArchCutBaseMinY === 'number' && typeof ud.__wpArchCutBaseMaxY === 'number') {
      rect = { ...rect, minY: ud.__wpArchCutBaseMinY, maxY: ud.__wpArchCutBaseMaxY };
    }
  } else {
    if (!isCanonicalDoorVisualMapKey(key)) return null;
    if (tool === 'groove') {
      const surface = resolveGrooveSurfaceOwnerByPartId(group, key);
      if (!surface || face < 0) return null;
      const surfaceZ = surface.userData?.__wpGrooveSurfaceZ;
      if (typeof surfaceZ !== 'number') return null;
      owner = surface as Object3DLike;
      rect = readGrooveSurfaceRectFromUserData(owner.userData);
      z = surfaceZ;
    } else {
      const surface = resolveMirrorPlacementOwnerByPartId(group, key);
      if (!surface) return null;
      owner = surface as Object3DLike;
      rect = readMirrorPlacementRectFromUserData(owner.userData);
    }
    const outline = owner.userData.__wpDoorSurfaceContour;
    if (Array.isArray(outline)) contour = outline as DoorArchPoint[];
  }
  if (!rect || rect.maxX <= rect.minX || rect.maxY <= rect.minY) return null;
  if (typeof owner.localToWorld !== 'function' || typeof owner.worldToLocal !== 'function') return null;
  const toWorld = owner.localToWorld as (point: Vector3Like) => Vector3Like;
  const toLocal = owner.worldToLocal as (point: Vector3Like) => Vector3Like;
  return {
    group,
    anchor: owner,
    ...(contour ? { contour } : {}),
    key,
    rect,
    z,
    face,
    toWorld: point => toWorld.call(owner, point),
    toLocal: point => toLocal.call(owner, point),
  };
}

function localRayHit(THREE: ThreeLike, surface: ArchSurface, ray: { origin: Vec3Like; direction: Vec3Like }) {
  const start = surface.toLocal(new THREE.Vector3(ray.origin.x, ray.origin.y, ray.origin.z));
  const end = surface.toLocal(
    new THREE.Vector3(
      ray.origin.x + ray.direction.x,
      ray.origin.y + ray.direction.y,
      ray.origin.z + ray.direction.z
    )
  );
  const dz = end.z - start.z;
  if (dz * surface.face >= -1e-6) return null;
  const distance = (surface.z - start.z) / dz;
  if (distance < 0) return null;
  return { point: start.lerp(end, distance), distance };
}

function findSeamNeighbor(
  THREE: ThreeLike,
  anchor: ArchSurface,
  point: Vector3Like,
  others: readonly ArchSurface[]
) {
  const rect = anchor.rect;
  let nearest: {
    surface: ArchSurface;
    offsetX: number;
    offsetY: number;
    seam: number;
    distance: number;
  } | null = null;
  for (const other of others) {
    if (other.key === anchor.key) continue;
    const lo = anchor.toLocal(other.toWorld(new THREE.Vector3(other.rect.minX, other.rect.minY, other.z)));
    const hi = anchor.toLocal(other.toWorld(new THREE.Vector3(other.rect.maxX, other.rect.maxY, other.z)));
    const corner = anchor.toLocal(
      other.toWorld(new THREE.Vector3(other.rect.minX, other.rect.maxY, other.z))
    );
    if (
      Math.abs(lo.z - anchor.z) > PLANE_EPSILON_M ||
      Math.abs(hi.z - anchor.z) > PLANE_EPSILON_M ||
      Math.abs(corner.x - lo.x) > PLANE_EPSILON_M ||
      Math.abs(hi.x - corner.x - (other.rect.maxX - other.rect.minX)) > PLANE_EPSILON_M ||
      Math.abs(lo.y - rect.minY) > PLANE_EPSILON_M ||
      Math.abs(hi.y - rect.maxY) > PLANE_EPSILON_M
    )
      continue;

    const onRight = lo.x > (rect.minX + rect.maxX) / 2;
    const gap = onRight ? lo.x - rect.maxX : rect.minX - hi.x;
    if (gap < -0.0005 || gap > MAX_SEAM_GAP_M) continue;
    const seam = onRight ? (lo.x + rect.maxX) / 2 : (hi.x + rect.minX) / 2;
    const distance = Math.abs(seam - point.x);
    const maxSnap = Math.min(EDGE_SNAP_M, 0.14 * (rect.maxX - rect.minX), 0.14 * (hi.x - lo.x));
    if (distance > maxSnap || (nearest && distance >= nearest.distance)) continue;
    nearest = {
      surface: other,
      offsetX: lo.x - other.rect.minX,
      offsetY: lo.y - other.rect.minY,
      seam,
      distance,
    };
  }
  return nearest;
}

export function resolveDoorArchTarget(args: {
  App: AppContainer;
  THREE: ThreeLike;
  tool: DoorArchTool;
  shape: DoorCurveShape;
  hit: CanvasPickingClickHitState | null;
  raycaster: RaycasterLike;
}): DoorArchTarget | null {
  const rayValue = args.raycaster as RaycasterLike & { ray?: { origin?: unknown; direction?: unknown } };
  const origin = readPointXYZ(rayValue.ray?.origin);
  const direction = readPointXYZ(rayValue.ray?.direction);
  if (!origin || !direction) return null;
  const face = args.hit?.hitIdentity?.faceSign === -1 ? -1 : 1;
  const surfaces = getDoorsArray(args.App).flatMap(entry => {
    if (!entry.group) return [];
    if (args.tool === 'cut' && entry.type !== 'hinged') return [];
    const surface = readArchSurface(entry.group, args.tool, face);
    return surface ? [surface] : [];
  });
  if (args.tool === 'cut') {
    // Standard straight segments share a leaf. Measure its full height in
    // each segment's own coordinates before planning a cut.
    const families = new Map<string, ArchSurface[]>();
    for (const surface of surfaces) {
      const family = families.get(surface.key) ?? [];
      family.push(surface);
      families.set(surface.key, family);
    }
    for (const family of families.values()) {
      const min = Math.min(...family.map(surface => surface.group.position.y + surface.rect.minY));
      const max = Math.max(...family.map(surface => surface.group.position.y + surface.rect.maxY));
      for (const surface of family) {
        surface.rect = {
          ...surface.rect,
          minY: min - surface.group.position.y,
          maxY: max - surface.group.position.y,
        };
      }
    }
  }
  const hasDoorHit = !!args.hit?.effectiveDoorId;
  const hitFamily = hingedDoorFamily(args.hit?.effectiveDoorId);
  const nearest = surfaces
    .flatMap(surface => {
      const direct =
        hasDoorHit &&
        (args.hit?.doorHitGroup === surface.group ||
          args.hit?.effectiveDoorId === surface.group.userData.partId);
      const hit = localRayHit(args.THREE, surface, { origin, direction });
      if (!hit) return [];
      const { rect } = surface;
      const x = Math.max(rect.minX, Math.min(rect.maxX, hit.point.x));
      const xGap = Math.abs(x - hit.point.x);
      if (
        xGap > EDGE_SNAP_M ||
        hit.point.y < rect.minY - VERTICAL_EDGE_SNAP_M ||
        hit.point.y > rect.maxY + VERTICAL_EDGE_SNAP_M
      )
        return [];
      const span = surface.contour ? doorContourSpanAtX(surface.contour, x) : rect;
      const edge = args.shape === 'arch' ? span?.maxY : args.shape === 'arch-down' ? span?.minY : undefined;
      const snapToEnd = edge !== undefined && Math.abs(hit.point.y - edge) <= VERTICAL_EDGE_SNAP_M;
      if (
        hasDoorHit &&
        !direct &&
        !(
          snapToEnd &&
          args.tool !== 'cut' &&
          surface.contour &&
          hitFamily &&
          hitFamily === hingedDoorFamily(surface.group.userData.partId)
        )
      )
        return [];
      const yGap = Math.max(0, rect.minY - hit.point.y, hit.point.y - rect.maxY);
      return [{ ...hit, surface, snapToEnd, direct, overhang: xGap + yGap }];
    })
    .sort((a, b) => {
      const depth = a.distance - b.distance;
      if (Math.abs(depth) > PLANE_EPSILON_M) return depth;
      return (
        Number(b.snapToEnd) - Number(a.snapToEnd) ||
        Number(b.direct) - Number(a.direct) ||
        a.overhang - b.overhang ||
        depth
      );
    })[0];
  if (!nearest) return null;
  const { surface, point, snapToEnd } = nearest;
  const neighbor = findSeamNeighbor(args.THREE, surface, point, surfaces);
  if (
    !hasDoorHit &&
    !neighbor &&
    !snapToEnd &&
    (args.tool !== 'cut' || surface.group.userData.__wpArchCutBaseMinY === undefined)
  )
    return null;
  if (args.tool === 'cut') {
    const world = surface.toWorld(point.clone());
    const lock = resolveCanvasDoorSplitVerticalLockedWorldY(args.App, world.y);
    if (lock !== null) {
      world.y = lock;
      point.copy(surface.toLocal(world));
    }
  }
  return {
    point,
    surface,
    surfaces: [{ surface, offsetX: 0, offsetY: 0 }, ...(neighbor ? [neighbor] : [])],
    seam: neighbor?.seam ?? null,
    snapToEnd,
    removalOnly: !hasDoorHit && !neighbor && !snapToEnd,
    allSurfaces: surfaces,
  };
}

function hingedDoorFamily(partId: unknown): string | undefined {
  return typeof partId === 'string' ? /^d[1-9]\d*(?=_(?:full|top|bot|mid\d*)$)/.exec(partId)?.[0] : undefined;
}

function readDraftM(value: unknown): number | null {
  const cm = typeof value === 'string' ? Number(value.trim().replace(',', '.')) : value;
  return typeof cm === 'number' && cm > 0 && Number.isFinite(cm) ? cm / 100 : null;
}

export function planDoorArch(args: {
  tool: DoorArchTool;
  shape: DoorCurveShape;
  target: DoorArchTarget;
  widthCm?: unknown;
  heightCm?: unknown;
}): DoorArchSlice[] {
  const { tool, target, shape } = args;
  const cut = tool === 'cut';
  const minX = Math.min(...target.surfaces.map(({ surface, offsetX }) => surface.rect.minX + offsetX));
  const maxX = Math.max(...target.surfaces.map(({ surface, offsetX }) => surface.rect.maxX + offsetX));
  const inset = cut ? 0 : SURFACE_INSET_M;
  const maxHalf =
    target.seam === null
      ? (maxX - minX) / 2 - inset
      : Math.min(target.seam - minX, maxX - target.seam) - inset;
  const half = cut ? (maxX - minX) / 2 : Math.min(maxHalf, (readDraftM(args.widthCm) ?? 2 * maxHalf) / 2);
  if (half < 0.025) return [];
  const centerX = cut
    ? (minX + maxX) / 2
    : (target.seam ?? Math.max(minX + inset + half, Math.min(maxX - inset - half, target.point.x)));
  const left = centerX - half;
  const right = centerX + half;
  const insetY = target.snapToEnd ? 0 : inset;
  const bottom =
    Math.max(...target.surfaces.map(({ surface, offsetY }) => surface.rect.minY + offsetY)) + insetY;
  const top =
    Math.min(...target.surfaces.map(({ surface, offsetY }) => surface.rect.maxY + offsetY)) - insetY;
  const requestedHeight = readDraftM(args.heightCm);
  const doubleCurve = shape === 'arch-both' || shape === 'ellipse';
  if (cut && doubleCurve) return [];
  const centered = doubleCurve || (tool === 'mirror' && shape === 'arch');
  const height = Math.min(top - bottom, requestedHeight ?? top - bottom);
  const centerY = Math.max(bottom + height / 2, Math.min(top - height / 2, target.point.y));
  const cutRise = Math.min(half, (top - bottom) * 0.35);
  let minY = bottom;
  let maxY = top;
  if (centered) {
    minY = centerY - height / 2;
    maxY = centerY + height / 2;
  } else if (shape === 'arch-down') {
    const pad = cut ? DOOR_ARCH_OUTER_CLEARANCE_M : 0;
    const limit = cut ? top - cutRise - pad : top - (requestedHeight === null ? 0 : height);
    const pointerY = target.snapToEnd && !cut ? bottom : target.point.y;
    minY = Math.max(bottom + pad, Math.min(limit, pointerY));
    if (!cut && requestedHeight !== null) maxY = minY + height;
  } else {
    const pad = cut ? DOOR_ARCH_OUTER_CLEARANCE_M : 0;
    const limit = cut ? bottom + cutRise + pad : bottom + (requestedHeight === null ? 0 : height);
    const pointerY = target.snapToEnd && !cut ? top : target.point.y;
    maxY = Math.min(top - pad, Math.max(limit, pointerY));
    if (!cut && requestedHeight !== null) minY = maxY - height;
  }
  if (minY < bottom - 1e-7 || maxY > top + 1e-7) return [];
  const span = maxY - minY;
  if (span < 0.03) return [];

  const riseM =
    shape === 'ellipse'
      ? span / 2
      : doubleCurve
        ? Math.min(half, span * 0.33)
        : cut
          ? cutRise
          : Math.min(half, span * 0.8);
  const link =
    target.surfaces.length === 2
      ? [
          tool,
          shape,
          ...target.surfaces.map(item => item.surface.key).sort(),
          minY.toFixed(4),
          maxY.toFixed(4),
          half.toFixed(4),
        ].join(':')
      : undefined;
  const slices = target.surfaces.flatMap(({ surface, offsetX, offsetY }) => {
    const fitToFront = !cut && target.snapToEnd && !!surface.contour;
    const x0 = Math.max(left, surface.rect.minX + offsetX);
    const x1 = Math.min(right, surface.rect.maxX + offsetX);
    if (x1 - x0 < 0.02) return [];
    return [
      {
        surface,
        rect: fitToFront
          ? surface.rect
          : { minX: x0 - offsetX, maxX: x1 - offsetX, minY: minY - offsetY, maxY: maxY - offsetY },
        profile: {
          start: (x0 - left) / (2 * half),
          end: Math.min(1, (x1 - left) / (2 * half)),
          rise: riseM / span,
          ...(shape === 'arch' ? {} : { shape }),
          ...(link ? { link } : {}),
          ...(fitToFront ? { fitToFront: true as const } : {}),
        },
      },
    ];
  });
  if (slices.length !== target.surfaces.length) return [];
  if (
    slices.some(slice => {
      const { contour } = slice.surface;
      return (
        contour && !intersectDoorContours(doorArchOutline(slice.rect, slice.profile, contour), contour).length
      );
    })
  )
    return [];
  return slices;
}

export function makeDoorArchCut(slice: DoorArchSlice): DoorArchCut {
  const fullHeight = slice.surface.rect.maxY - slice.surface.rect.minY;
  return {
    peak: slice.profile.shape === 'arch-down' ? 1 : (slice.rect.maxY - slice.surface.rect.minY) / fullHeight,
    ...(slice.profile.shape ? { base: (slice.rect.minY - slice.surface.rect.minY) / fullHeight } : {}),
    profile: {
      ...slice.profile,
      rise: (slice.profile.rise * (slice.rect.maxY - slice.rect.minY)) / fullHeight,
    },
  };
}

export function readDoorArchCutSlice(surface: ArchSurface, cut: DoorArchCut): DoorArchSlice {
  return { surface, ...resolveDoorArchCutSlice(surface.rect, cut) };
}

function cutHitYInRange(curveY: number, pointerY: number): boolean {
  return pointerY >= curveY - 0.075 && pointerY <= curveY + 0.035;
}

export function doorArchCutHitDistance(slice: DoorArchSlice, point: Vector3Like): number {
  const x = Math.max(slice.rect.minX, Math.min(slice.rect.maxX, point.x));
  if (Math.abs(x - point.x) >= 0.018) return Infinity;
  const { minY, maxY } = doorArchSpan(slice.rect, slice.profile, x);
  const shape = slice.profile.shape;
  const fromTop =
    shape !== 'arch-down' && cutHitYInRange(maxY, point.y) ? Math.abs(point.y - maxY) : Infinity;
  const fromBottom = shape && cutHitYInRange(-minY, -point.y) ? Math.abs(point.y - minY) : Infinity;
  return Math.min(fromTop, fromBottom);
}

export function hitsDoorArchSlice(slice: DoorArchSlice, point: Vector3Like, tool: DoorArchTool): boolean {
  if (tool === 'cut') return Number.isFinite(doorArchCutHitDistance(slice, point));
  const x = Math.max(slice.rect.minX, Math.min(slice.rect.maxX, point.x));
  if (Math.abs(x - point.x) > 0.01) return false;
  const face = slice.surface.contour && doorContourSpanAtX(slice.surface.contour, x);
  if (slice.profile.fitToFront && face) {
    return point.y >= face.minY - VERTICAL_EDGE_SNAP_M && point.y <= face.maxY + VERTICAL_EDGE_SNAP_M;
  }
  if (slice.surface.contour && (!face || point.y < face.minY - 0.006 || point.y > face.maxY + 0.006))
    return false;
  return [0, -0.012, 0.012].some(offset =>
    containsDoorArchPoint(slice.rect, slice.profile, { x, y: point.y + offset })
  );
}
