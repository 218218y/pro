import type {
  AppContainer,
  BuilderDimensionLineFn,
  Object3DLike,
  ThreeLike,
  UnknownRecord,
} from '../../../types';
import type { Vector3Like } from '../../../types/three_like.js';

import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import { runPlatformActivityRenderTouch } from '../runtime/platform_access.js';
import { getWardrobeGroup, readRenderCacheValue, writeRenderCacheValue } from '../runtime/render_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
import { __wp_reportPickingIssue } from './canvas_picking_core_helpers.js';
import { __wp_measureObjectLocalBox, __wp_projectWorldPointToLocal } from './canvas_picking_local_helpers.js';
import type { HitObjectLike } from './canvas_picking_engine.js';

export const VIEWER_MEASUREMENT_MODE_ID = 'measure';

const VIEWER_MEASUREMENT_CACHE_KEY = '__wpViewerMeasurementOverlay';
const MIN_MEASURABLE_EDGE_M = 0.005;
const FRONT_Z_EPSILON_M = 0.006;
const GUIDE_OFFSET_M = 0.045;
const SIDE_GUIDE_OFFSET_M = 0.055;

type LocalMeasurementBox = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

type MeasurementOverlayState = {
  objects: Object3DLike[];
  targetKey: string | null;
};

type OverlayThree = ThreeLike & {
  BufferGeometry: ThreeLike['BufferGeometry'];
  LineBasicMaterial: ThreeLike['LineBasicMaterial'];
  Line: ThreeLike['Line'];
  Vector3: ThreeLike['Vector3'];
};

type MeasurableObject = HitObjectLike & {
  userData?: UnknownRecord | null;
  parent?: MeasurableObject | null;
  type?: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asObject3D(value: unknown): Object3DLike | null {
  return isRecord(value) ? (value as Object3DLike) : null;
}

function asMeasurableObject(value: unknown): MeasurableObject | null {
  return isRecord(value) ? (value as MeasurableObject) : null;
}

function readUserData(value: unknown): UnknownRecord | null {
  const rec = isRecord(value) ? value : null;
  const ud = rec && isRecord(rec.userData) ? rec.userData : null;
  return ud;
}

function readFiniteNumber(value: unknown, key: string): number | null {
  const rec = isRecord(value) ? value : null;
  const raw = rec ? rec[key] : null;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function sameModuleKey(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function isDecorativeObject(value: unknown): boolean {
  const rec = asMeasurableObject(value);
  return !!rec && (rec.type === 'LineSegments' || rec.type === 'Line' || rec.type === 'Sprite');
}

function readOverlayState(App: AppContainer): MeasurementOverlayState | null {
  const state = readRenderCacheValue<MeasurementOverlayState>(App, VIEWER_MEASUREMENT_CACHE_KEY);
  return state && Array.isArray(state.objects) ? state : null;
}

function writeOverlayState(App: AppContainer, state: MeasurementOverlayState | null): void {
  writeRenderCacheValue(App, VIEWER_MEASUREMENT_CACHE_KEY, state);
}

function removeObjectFromScene(obj: Object3DLike): void {
  try {
    const parent = asObject3D(obj.parent);
    if (parent && typeof parent.remove === 'function') parent.remove(obj);
  } catch {
    // ignore cleanup failures; the next build may already have removed the object.
  }

  try {
    const geometry = isRecord(obj) ? obj.geometry : null;
    const dispose = isRecord(geometry) ? geometry.dispose : null;
    if (typeof dispose === 'function') Reflect.apply(dispose, geometry, []);
  } catch {
    // ignore
  }

  try {
    const material = isRecord(obj) ? obj.material : null;
    const dispose = isRecord(material) ? material.dispose : null;
    if (typeof dispose === 'function') Reflect.apply(dispose, material, []);
  } catch {
    // ignore
  }
}

function touchRender(App: AppContainer): void {
  try {
    runPlatformActivityRenderTouch(App, {
      updateShadows: false,
      ensureRenderLoopAfterTrigger: true,
    });
  } catch {
    // ignore render wakeup failures; the overlay state is still updated.
  }
}

export function clearViewerMeasurementOverlay(App: AppContainer, render = true): void {
  const state = readOverlayState(App);
  const hadOverlay = !!state && state.objects.length > 0;
  if (state) {
    for (let i = 0; i < state.objects.length; i += 1) {
      const obj = state.objects[i];
      if (obj) removeObjectFromScene(obj);
    }
  }
  writeOverlayState(App, null);
  if (render && hadOverlay) touchRender(App);
}

function readAddDimensionLine(App: AppContainer): BuilderDimensionLineFn | null {
  try {
    const renderOps = getBuilderRenderOps(App) as UnknownRecord | null;
    const fn = renderOps && renderOps.addDimensionLine;
    return typeof fn === 'function' ? (fn as BuilderDimensionLineFn) : null;
  } catch {
    return null;
  }
}

function readOverlayThree(App: AppContainer): OverlayThree | null {
  const THREE = getThreeMaybe(App);
  if (
    !THREE ||
    typeof THREE.BufferGeometry !== 'function' ||
    typeof THREE.LineBasicMaterial !== 'function' ||
    typeof THREE.Line !== 'function' ||
    typeof THREE.Vector3 !== 'function'
  ) {
    return null;
  }
  return THREE as OverlayThree;
}

function vector(THREE: Pick<ThreeLike, 'Vector3'>, x: number, y: number, z: number): Vector3Like {
  return new THREE.Vector3(x, y, z);
}

function formatCmLabel(valueM: number): string {
  const cm = valueM * 100;
  if (!Number.isFinite(cm)) return '';
  if (cm >= 10) return Math.round(cm).toFixed(0);
  return cm.toFixed(1).replace(/\.0$/, '');
}

function targetKeyForHit(hitState: CanvasPickingClickHitState, target: unknown): string | null {
  const ud = readUserData(target);
  const identity = hitState.hitIdentity;
  const candidates = [
    ud?.partId,
    ud?.pid,
    ud?.surfaceId,
    ud?.moduleIndex,
    identity?.partId,
    identity?.doorId,
    identity?.drawerId,
    identity?.surfaceId,
    identity?.moduleIndex,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const raw = candidates[i];
    if (raw != null && String(raw).trim()) return String(raw).trim();
  }
  return null;
}

function findTaggedAncestor(start: unknown, predicate: (userData: UnknownRecord) => boolean): unknown | null {
  let current = asMeasurableObject(start);
  while (current) {
    const ud = readUserData(current);
    if (ud && predicate(ud)) return current;
    current = asMeasurableObject(current.parent);
  }
  return null;
}

function resolveMeasurementTarget(hitState: CanvasPickingClickHitState): unknown | null {
  const primary = asMeasurableObject(hitState.primaryHitObject);
  if (!primary || isDecorativeObject(primary)) return null;

  const primaryUd = readUserData(primary);
  if (primaryUd?.isModuleSelector) return primary;

  if (hitState.doorHitGroup) return hitState.doorHitGroup;

  if (hitState.foundDrawerId) {
    const drawerOwner = findTaggedAncestor(primary, ud => {
      const id = ud.drawerId ?? ud.partId ?? ud.pid;
      return id != null && String(id) === String(hitState.foundDrawerId);
    });
    if (drawerOwner) return drawerOwner;
  }

  const taggedOwner = findTaggedAncestor(primary, ud => !!(ud.partId ?? ud.pid ?? ud.surfaceId));
  return taggedOwner || primary;
}

function isModuleSelector(value: unknown): boolean {
  const ud = readUserData(value);
  return !!ud?.isModuleSelector;
}

function readModuleInteriorBox(args: {
  App: AppContainer;
  target: unknown;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
}): LocalMeasurementBox | null {
  const { App, target, hitState, wardrobeGroup } = args;
  if (!isModuleSelector(target) || hitState.foundModuleIndex == null) return null;

  const selectorBox = readMeasuredBox(App, target, wardrobeGroup);
  if (!selectorBox) return null;

  const grid = getInternalGridMap(App, hitState.foundModuleStack === 'bottom');
  const info = isRecord(grid) ? grid[String(hitState.foundModuleIndex)] : null;
  if (!isRecord(info)) return selectorBox;

  const bottomY = readFiniteNumber(info, 'effectiveBottomY');
  const topY = readFiniteNumber(info, 'effectiveTopY');
  const innerW = readFiniteNumber(info, 'innerW') ?? Math.max(0, selectorBox.width);
  const internalCenterX = readFiniteNumber(info, 'internalCenterX') ?? selectorBox.centerX;
  const internalDepth = readFiniteNumber(info, 'internalDepth') ?? selectorBox.depth;
  const internalZ = readFiniteNumber(info, 'internalZ') ?? selectorBox.centerZ;
  if (bottomY == null || topY == null || !(topY > bottomY) || !(innerW > 0) || !(internalDepth > 0)) {
    return selectorBox;
  }

  const hitLocal = __wp_projectWorldPointToLocal(App, hitState.primaryHitPoint, wardrobeGroup);
  const hitY = hitLocal && Number.isFinite(hitLocal.y) ? Number(hitLocal.y) : hitState.primaryHitY;
  if (typeof hitY !== 'number' || !Number.isFinite(hitY)) {
    return {
      centerX: internalCenterX,
      centerY: (bottomY + topY) / 2,
      centerZ: internalZ,
      width: innerW,
      height: topY - bottomY,
      depth: internalDepth,
    };
  }

  const woodThick = readFiniteNumber(info, 'woodThick') ?? 0.017;
  const minShelfWidth = Math.max(0.02, innerW * 0.45);
  const minShelfDepth = Math.max(0.02, internalDepth * 0.2);
  const maxShelfHeight = Math.max(0.085, woodThick * 3.2);
  const moduleKey = hitState.foundModuleIndex;
  const moduleMinX = internalCenterX - innerW / 2;
  const moduleMaxX = internalCenterX + innerW / 2;
  const bounds: number[] = [bottomY, topY];

  const visit = (obj: Object3DLike): void => {
    if (!obj || obj === target || isDecorativeObject(obj)) return;
    const ud = readUserData(obj);
    const objModule = ud?.moduleIndex;
    if (objModule != null && !sameModuleKey(objModule, moduleKey)) return;
    if (ud?.isModuleSelector || ud?.__wpViewerMeasurementOverlay || ud?.__ignoreRaycast) return;

    const box = __wp_measureObjectLocalBox(App, obj, wardrobeGroup);
    if (!box) return;
    const minY = box.centerY - box.height / 2;
    const maxY = box.centerY + box.height / 2;
    if (maxY <= bottomY + 0.001 || minY >= topY - 0.001) return;
    const minX = box.centerX - box.width / 2;
    const maxX = box.centerX + box.width / 2;
    const overlapX = Math.max(0, Math.min(moduleMaxX, maxX) - Math.max(moduleMinX, minX));
    if (overlapX < innerW * 0.35) return;
    if (box.width < minShelfWidth || box.depth < minShelfDepth || box.height > maxShelfHeight) return;
    bounds.push(Math.max(bottomY, minY), Math.min(topY, maxY));
  };

  try {
    if (typeof wardrobeGroup.traverse === 'function') wardrobeGroup.traverse(visit);
    else for (let i = 0; i < wardrobeGroup.children.length; i += 1) visit(wardrobeGroup.children[i]);
  } catch {
    // A cavity measurement should still fall back to the full internal selector box.
  }

  const sorted = bounds
    .filter(n => Number.isFinite(n))
    .sort((a, b) => a - b)
    .reduce<number[]>((acc, n) => {
      if (!acc.length || Math.abs(acc[acc.length - 1] - n) > 0.004) acc.push(n);
      return acc;
    }, []);

  let low = bottomY;
  let high = topY;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (b - a < MIN_MEASURABLE_EDGE_M) continue;
    if (hitY >= a - 0.002 && hitY <= b + 0.002) {
      low = a;
      high = b;
      break;
    }
  }

  const height = high - low;
  if (!(height > MIN_MEASURABLE_EDGE_M)) return selectorBox;
  return {
    centerX: internalCenterX,
    centerY: (low + high) / 2,
    centerZ: internalZ,
    width: innerW,
    height,
    depth: internalDepth,
  };
}

function readMeasuredBox(
  App: AppContainer,
  target: unknown,
  wardrobeGroup: Object3DLike
): LocalMeasurementBox | null {
  const measured = __wp_measureObjectLocalBox(App, target, wardrobeGroup);
  if (!measured) return null;
  const { centerX, centerY, centerZ, width, height, depth } = measured;
  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerY) ||
    !Number.isFinite(centerZ) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(depth) ||
    width < MIN_MEASURABLE_EDGE_M ||
    height < MIN_MEASURABLE_EDGE_M
  ) {
    return null;
  }
  return { centerX, centerY, centerZ, width, height, depth };
}

function readFrontZ(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
  box: LocalMeasurementBox;
}): { z: number; sign: number } {
  const { App, hitState, wardrobeGroup, box } = args;
  const minZ = box.centerZ - box.depth / 2;
  const maxZ = box.centerZ + box.depth / 2;
  let sign = 1;

  const localHit = __wp_projectWorldPointToLocal(App, hitState.primaryHitPoint, wardrobeGroup);
  if (localHit && Number.isFinite(localHit.z)) {
    sign = Math.abs(localHit.z - minZ) < Math.abs(localHit.z - maxZ) ? -1 : 1;
  }

  const faceZ = sign >= 0 ? maxZ : minZ;
  return { z: faceZ + sign * FRONT_Z_EPSILON_M, sign };
}

function addTrackedLine(args: {
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  objects: Object3DLike[];
  points: Vector3Like[];
  name: string;
}): void {
  const { THREE, wardrobeGroup, objects, points, name } = args;
  const geometry = new THREE.BufferGeometry();
  if (typeof geometry.setFromPoints === 'function') geometry.setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x2563eb,
    transparent: true,
    opacity: 0.98,
    depthTest: false,
    depthWrite: false,
  });
  const line = asObject3D(new THREE.Line(geometry, material));
  if (!line) return;
  line.name = name;
  line.userData = {
    ...(line.userData || {}),
    __wpViewerMeasurementOverlay: true,
    __wpExcludeWardrobeBounds: true,
    __ignoreRaycast: true,
  };
  wardrobeGroup.add(line);
  objects.push(line);
}

function readCreatedDimensionObjects(value: unknown): Object3DLike[] {
  const rec = isRecord(value) ? value : null;
  const out: Object3DLike[] = [];
  const line = asObject3D(rec?.line);
  const sprite = asObject3D(rec?.sprite);
  if (line) {
    line.userData = {
      ...(line.userData || {}),
      __wpViewerMeasurementOverlay: true,
      __ignoreRaycast: true,
    };
    out.push(line);
  }
  if (sprite) {
    sprite.userData = {
      ...(sprite.userData || {}),
      __wpViewerMeasurementOverlay: true,
      __ignoreRaycast: true,
    };
    out.push(sprite);
  }
  return out;
}

function addDimensionGuides(args: {
  THREE: OverlayThree;
  addDimensionLine: BuilderDimensionLineFn;
  box: LocalMeasurementBox;
  z: number;
  sign: number;
  objects: Object3DLike[];
}): void {
  const { THREE, addDimensionLine, box, z, sign, objects } = args;
  const minX = box.centerX - box.width / 2;
  const maxX = box.centerX + box.width / 2;
  const minY = box.centerY - box.height / 2;
  const maxY = box.centerY + box.height / 2;
  const sideOffset = SIDE_GUIDE_OFFSET_M;
  const xSide = maxX + sideOffset;
  const zBump = sign * FRONT_Z_EPSILON_M;
  const labelScale = { textScale: 0.78, styleKey: 'cell' };

  const widthObjects = readCreatedDimensionObjects(
    addDimensionLine(
      vector(THREE, minX, maxY, z),
      vector(THREE, maxX, maxY, z),
      vector(THREE, 0, GUIDE_OFFSET_M, zBump),
      formatCmLabel(box.width),
      labelScale,
      vector(THREE, 0, 0.012, 0)
    )
  );
  objects.push(...widthObjects);

  const heightObjects = readCreatedDimensionObjects(
    addDimensionLine(
      vector(THREE, xSide, minY, z),
      vector(THREE, xSide, maxY, z),
      vector(THREE, sideOffset, 0, zBump),
      formatCmLabel(box.height),
      labelScale
    )
  );
  objects.push(...heightObjects);
}

function addSelectionFrame(args: {
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  box: LocalMeasurementBox;
  z: number;
  objects: Object3DLike[];
}): void {
  const { THREE, wardrobeGroup, box, z, objects } = args;
  const minX = box.centerX - box.width / 2;
  const maxX = box.centerX + box.width / 2;
  const minY = box.centerY - box.height / 2;
  const maxY = box.centerY + box.height / 2;
  addTrackedLine({
    THREE,
    wardrobeGroup,
    objects,
    name: 'wp-viewer-measurement-selection-frame',
    points: [
      vector(THREE, minX, minY, z),
      vector(THREE, maxX, minY, z),
      vector(THREE, maxX, maxY, z),
      vector(THREE, minX, maxY, z),
      vector(THREE, minX, minY, z),
    ],
  });

  const tick = Math.min(0.045, Math.max(0.016, Math.min(box.width, box.height) * 0.08));
  addTrackedLine({
    THREE,
    wardrobeGroup,
    objects,
    name: 'wp-viewer-measurement-selection-corner-ticks',
    points: [
      vector(THREE, minX, minY, z),
      vector(THREE, minX + tick, minY, z),
      vector(THREE, minX, minY, z),
      vector(THREE, minX, minY + tick, z),
      vector(THREE, maxX, minY, z),
      vector(THREE, maxX - tick, minY, z),
      vector(THREE, maxX, minY, z),
      vector(THREE, maxX, minY + tick, z),
      vector(THREE, maxX, maxY, z),
      vector(THREE, maxX - tick, maxY, z),
      vector(THREE, maxX, maxY, z),
      vector(THREE, maxX, maxY - tick, z),
      vector(THREE, minX, maxY, z),
      vector(THREE, minX + tick, maxY, z),
      vector(THREE, minX, maxY, z),
      vector(THREE, minX, maxY - tick, z),
    ],
  });
}

function renderMeasurementOverlay(args: {
  App: AppContainer;
  target: unknown;
  hitState: CanvasPickingClickHitState;
}): boolean {
  const { App, target, hitState } = args;
  const THREE = readOverlayThree(App);
  const wardrobeGroup = getWardrobeGroup(App);
  const addDimensionLine = readAddDimensionLine(App);
  if (!THREE || !wardrobeGroup || !addDimensionLine) return false;

  const box =
    readModuleInteriorBox({ App, target, hitState, wardrobeGroup }) ||
    readMeasuredBox(App, target, wardrobeGroup);
  if (!box) return false;

  const { z, sign } = readFrontZ({ App, hitState, wardrobeGroup, box });
  const objects: Object3DLike[] = [];
  addSelectionFrame({ THREE, wardrobeGroup, box, z, objects });
  addDimensionGuides({ THREE, addDimensionLine, box, z, sign, objects });

  const key = targetKeyForHit(hitState, target);
  writeOverlayState(App, { objects, targetKey: key });
  touchRender(App);
  return true;
}

export function tryHandleViewerMeasurementClick(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState | null;
}): boolean {
  const { App, hitState } = args;
  clearViewerMeasurementOverlay(App, false);
  if (!hitState) {
    touchRender(App);
    return true;
  }

  try {
    const target = resolveMeasurementTarget(hitState);
    if (!target) {
      touchRender(App);
      return true;
    }
    if (!renderMeasurementOverlay({ App, target, hitState })) touchRender(App);
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'viewerMeasurement',
      op: 'click',
      throttleMs: 1000,
    });
    touchRender(App);
  }
  return true;
}
