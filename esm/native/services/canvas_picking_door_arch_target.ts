import type { Vector3Like } from '../../../types/three_like.js';
import type { AppContainer, Object3DLike, ThreeLike, Vec3Like } from '../../../types';
import type { DoorArchCut, DoorArchPoint, DoorArchProfile, DoorArchRect } from '../../../types/maps.js';
import {
  containsDoorArchPoint,
  doorArchY,
  doorContourSpanAtX,
  doorArchOutline,
  intersectDoorContours,
  getDoorsArray,
  MIN_DOOR_ARCH_CUT_MARGIN_M,
  isCanonicalDoorVisualMapKey,
  readDoorArchCut,
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
  allSurfaces: ArchSurface[];
};

const EDGE_SNAP_M = 0.055;
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
    if (!isCanonicalDoorVisualMapKey(key) || (tool === 'mirror' && ud.__wpArchCutBaseMinY !== undefined))
      return null;
    if (tool === 'groove') {
      const surface = resolveGrooveSurfaceOwnerByPartId(group, key);
      if (!surface || face < 0) return null;
      const surfaceZ = surface.userData?.__wpGrooveSurfaceZ;
      if (typeof surfaceZ !== 'number') return null;
      owner = surface as Object3DLike;
      rect = readGrooveSurfaceRectFromUserData(owner.userData);
      const outline = owner.userData.__wpGrooveSurfaceContour;
      if (Array.isArray(outline)) contour = outline as DoorArchPoint[];
      z = surfaceZ;
    } else {
      const surface = resolveMirrorPlacementOwnerByPartId(group, key);
      if (!surface) return null;
      owner = surface as Object3DLike;
      rect = readMirrorPlacementRectFromUserData(owner.userData);
    }
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
  const nearest = surfaces
    .flatMap(surface => {
      if (
        hasDoorHit &&
        args.hit?.doorHitGroup !== surface.group &&
        args.hit?.effectiveDoorId !== surface.group.userData.partId
      )
        return [];
      const hit = localRayHit(args.THREE, surface, { origin, direction });
      if (
        !hit ||
        hit.point.x < surface.rect.minX - EDGE_SNAP_M ||
        hit.point.x > surface.rect.maxX + EDGE_SNAP_M ||
        hit.point.y < surface.rect.minY ||
        hit.point.y > surface.rect.maxY
      )
        return [];
      const overhang = Math.max(0, surface.rect.minX - hit.point.x, hit.point.x - surface.rect.maxX);
      return [{ ...hit, surface, overhang }];
    })
    .sort((a, b) => {
      const depth = a.distance - b.distance;
      return Math.abs(depth) > PLANE_EPSILON_M ? depth : a.overhang - b.overhang || depth;
    })[0];
  if (!nearest) return null;
  const { surface, point } = nearest;
  const neighbor = findSeamNeighbor(args.THREE, surface, point, surfaces);
  if (
    !hasDoorHit &&
    !neighbor &&
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
    allSurfaces: surfaces,
  };
}

function readDraftM(value: unknown): number | null {
  const cm = typeof value === 'string' ? Number(value.trim().replace(',', '.')) : value;
  return typeof cm === 'number' && cm > 0 && Number.isFinite(cm) ? cm / 100 : null;
}

export function planDoorArch(args: {
  tool: DoorArchTool;
  target: DoorArchTarget;
  widthCm?: unknown;
  heightCm?: unknown;
}): DoorArchSlice[] {
  const { tool, target } = args;
  const anchor = target.surface.rect;
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
  const bottom =
    Math.max(...target.surfaces.map(({ surface, offsetY }) => surface.rect.minY + offsetY)) + inset;
  const top = Math.min(...target.surfaces.map(({ surface, offsetY }) => surface.rect.maxY + offsetY)) - inset;
  const requestedHeight = readDraftM(args.heightCm);
  const height = Math.min(top - bottom, requestedHeight ?? top - bottom);
  const centerY = Math.max(bottom + height / 2, Math.min(top - height / 2, target.point.y));
  const maxY = tool === 'mirror' ? centerY + height / 2 : Math.min(top, target.point.y);
  const minY =
    tool === 'mirror'
      ? centerY - height / 2
      : tool === 'groove' && requestedHeight !== null
        ? maxY - requestedHeight
        : bottom;
  if (minY < bottom - 1e-7) return [];
  const span = maxY - minY;
  if (span < 0.03) return [];

  const cutRise = Math.min(half, (anchor.maxY - anchor.minY) * 0.35);
  const riseM = cut ? cutRise : Math.min(half, span * 0.8);
  if (cut && (span - riseM < MIN_DOOR_ARCH_CUT_MARGIN_M || top - maxY < MIN_DOOR_ARCH_CUT_MARGIN_M))
    return [];
  const link =
    target.surfaces.length === 2
      ? [
          tool,
          ...target.surfaces.map(item => item.surface.key).sort(),
          minY.toFixed(4),
          maxY.toFixed(4),
          half.toFixed(4),
        ].join(':')
      : undefined;
  const slices = target.surfaces.flatMap(({ surface, offsetX, offsetY }) => {
    const x0 = Math.max(left, surface.rect.minX + offsetX);
    const x1 = Math.min(right, surface.rect.maxX + offsetX);
    if (x1 - x0 < 0.02) return [];
    return [
      {
        surface,
        rect: { minX: x0 - offsetX, maxX: x1 - offsetX, minY: minY - offsetY, maxY: maxY - offsetY },
        profile: {
          start: (x0 - left) / (2 * half),
          end: Math.min(1, (x1 - left) / (2 * half)),
          rise: riseM / span,
          ...(link ? { link } : {}),
        },
      },
    ];
  });
  if (slices.length !== target.surfaces.length) return [];
  if (
    slices.some(slice => {
      const { contour } = slice.surface;
      return contour && !intersectDoorContours(doorArchOutline(slice.rect, slice.profile), contour).length;
    })
  )
    return [];
  return slices;
}

export function makeDoorArchCut(slice: DoorArchSlice): DoorArchCut {
  const fullHeight = slice.surface.rect.maxY - slice.surface.rect.minY;
  return {
    peak: (slice.rect.maxY - slice.surface.rect.minY) / fullHeight,
    profile: {
      ...slice.profile,
      rise: (slice.profile.rise * (slice.rect.maxY - slice.rect.minY)) / fullHeight,
    },
  };
}

export function readDoorArchCutSlice(surface: ArchSurface, value: unknown): DoorArchSlice | null {
  const cut = readDoorArchCut(value);
  if (!cut) return null;
  const rect = surface.rect;
  return {
    surface,
    rect: { ...rect, maxY: rect.minY + cut.peak * (rect.maxY - rect.minY) },
    profile: { ...cut.profile, rise: cut.profile.rise / cut.peak },
  };
}

function cutHitYInRange(curveY: number, pointerY: number): boolean {
  return pointerY >= curveY - 0.075 && pointerY <= curveY + 0.035;
}

export function hitsDoorArchSlice(slice: DoorArchSlice, point: Vector3Like, tool: DoorArchTool): boolean {
  const x = Math.max(slice.rect.minX, Math.min(slice.rect.maxX, point.x));
  if (tool === 'cut') {
    return Math.abs(x - point.x) < 0.018 && cutHitYInRange(doorArchY(slice.rect, slice.profile, x), point.y);
  }
  if (Math.abs(x - point.x) > 0.01) return false;
  const face = slice.surface.contour && doorContourSpanAtX(slice.surface.contour, x);
  if (slice.surface.contour && (!face || point.y < face.minY - 0.006 || point.y > face.maxY + 0.006))
    return false;
  // A pick on the apex or the narrow air gap should still remove the previewed region.
  const y = point.y - 0.012;
  return (
    containsDoorArchPoint(slice.rect, slice.profile, { x, y: Math.max(slice.rect.minY, y) }) &&
    point.y >= slice.rect.minY - 0.012
  );
}
