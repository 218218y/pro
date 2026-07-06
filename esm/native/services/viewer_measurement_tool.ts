import type {
  AppContainer,
  BuilderDimensionLineFn,
  Object3DLike,
  ThreeLike,
  UnknownRecord,
} from '../../../types';
import type { Vector3Like } from '../../../types/three_like.js';

import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { getDocumentMaybe } from '../runtime/dom_access.js';
import { setModePrimary } from '../runtime/mode_write_access.js';
import { getUiFeedbackServiceMaybe } from '../runtime/service_access.js';
import { runPlatformActivityRenderTouch } from '../runtime/platform_access.js';
import { getWardrobeGroup, readRenderCacheValue, writeRenderCacheValue } from '../runtime/render_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
import { __wp_reportPickingIssue } from './canvas_picking_core_helpers.js';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';
import {
  FRONT_Z_EPSILON_M,
  MIN_MEASURABLE_EDGE_M,
  type LocalMeasurementBox,
  type MeasurementAxis,
  type MeasurementOverlayState,
  type MeasurementPlane,
  type OverlayThree,
  type PointMeasurementDraft,
  type PointMeasurementPointerContext,
  type ViewerMeasurementToolMode,
} from './viewer_measurement_tool_contracts.js';
import {
  addBasisVectors,
  axisVector,
  basisVector,
  getBoxLengthAxis,
  getBoxMaxAxis,
  getBoxMinAxis,
  pointOnBoxAxisLine,
  pointOnMeasurementPlane,
  vector,
} from './viewer_measurement_tool_geometry.js';
import {
  resolveViewerMeasurementResolution,
  resolveViewerMeasurementTarget,
} from './viewer_measurement_tool_resolution.js';
import {
  readPointMeasurementPointerLocalPoint,
  resolvePointMeasurementStart,
  resolvePointMeasurementStartFromPointer,
} from './viewer_measurement_tool_point_resolution.js';
import { resolvePointMeasurementEnd } from './viewer_measurement_tool_point_geometry.js';

export const VIEWER_MEASUREMENT_MODE_ID = 'measure';
export type { ViewerMeasurementToolMode } from './viewer_measurement_tool_contracts.js';

const VIEWER_MEASUREMENT_CACHE_KEY = '__wpViewerMeasurementOverlay';
const VIEWER_MEASUREMENT_TOOL_MODE_CACHE_KEY = '__wpViewerMeasurementToolMode';
const OVERLAY_RENDER_ORDER = 10040;
const GUIDE_OFFSET_M = 0.045;
const SIDE_GUIDE_OFFSET_M = 0.055;
const REAR_SELECTION_FRAME_PULL_FORWARD_M = 0.012;
const POINT_STRAIGHT_SNAP_COLOR = 0x16a34a;
const POINT_DEFAULT_COLOR = 0x2563eb;
const POINT_MEASUREMENT_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='25' viewBox='0 0 25 25'%3E%3Cpath d='M6 6 L19 19 M19 6 L6 19' stroke='%23111827' stroke-width='2.2' stroke-linecap='round'/%3E%3Ccircle cx='12.5' cy='12.5' r='2.2' fill='none' stroke='%23ffffff' stroke-width='1.4'/%3E%3C/svg%3E") 12 12, crosshair`;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asObject3D(value: unknown): Object3DLike | null {
  return isRecord(value) ? (value as Object3DLike) : null;
}

function readOverlayState(App: AppContainer): MeasurementOverlayState | null {
  const state = readRenderCacheValue<MeasurementOverlayState>(App, VIEWER_MEASUREMENT_CACHE_KEY);
  return state && Array.isArray(state.objects) ? state : null;
}

function writeOverlayState(App: AppContainer, state: MeasurementOverlayState | null): void {
  writeRenderCacheValue(App, VIEWER_MEASUREMENT_CACHE_KEY, state);
}

function writeMeasurementCursor(App: AppContainer, cursor: string): void {
  try {
    const doc = getDocumentMaybe(App) as (Document & { querySelectorAll?: unknown }) | null;
    if (doc?.body?.style) doc.body.style.cursor = cursor === 'default' ? 'default' : cursor;
    const querySelectorAll = isRecord(doc) ? doc.querySelectorAll : null;
    if (typeof querySelectorAll !== 'function') return;
    const canvases = Reflect.apply(querySelectorAll, doc, ['canvas']);
    const listLike = canvases && typeof canvases === 'object' ? (canvases as { length?: unknown }) : null;
    const length = typeof listLike?.length === 'number' ? listLike.length : 0;
    for (let i = 0; i < length; i += 1) {
      const canvas = (canvases as { [index: number]: unknown })[i];
      if (isRecord(canvas) && isRecord(canvas.style)) {
        canvas.style.cursor = cursor === 'default' ? '' : cursor;
      }
    }
  } catch {
    // Cursor is only a precision aid; measurement geometry still works without DOM access.
  }
}

function applyMeasurementToolCursor(App: AppContainer, mode: ViewerMeasurementToolMode): void {
  writeMeasurementCursor(App, mode === 'points' ? POINT_MEASUREMENT_CURSOR : 'crosshair');
}

export function getViewerMeasurementToolMode(App: AppContainer): ViewerMeasurementToolMode {
  const raw = readRenderCacheValue<unknown>(App, VIEWER_MEASUREMENT_TOOL_MODE_CACHE_KEY);
  return raw === 'points' ? 'points' : 'part';
}

export function setViewerMeasurementToolMode(
  App: AppContainer,
  mode: ViewerMeasurementToolMode,
  render = true
): void {
  const nextMode: ViewerMeasurementToolMode = mode === 'points' ? 'points' : 'part';
  const previousMode = getViewerMeasurementToolMode(App);
  writeRenderCacheValue(App, VIEWER_MEASUREMENT_TOOL_MODE_CACHE_KEY, nextMode);
  applyMeasurementToolCursor(App, nextMode);
  if (previousMode !== nextMode) clearViewerMeasurementOverlay(App, render);
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
  removeOverlayStateObjects(state);
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

function formatCmLabel(valueM: number): string {
  const cm = valueM * 100;
  if (!Number.isFinite(cm)) return '';
  if (cm >= 10) return Math.round(cm).toFixed(0);
  return cm.toFixed(1).replace(/\.0$/, '');
}

function clearMeasurementModeChrome(App: AppContainer): void {
  try {
    getUiFeedbackServiceMaybe(App)?.updateEditStateToast?.(null, false);
  } catch {
    // ignore UI feedback cleanup failures
  }

  try {
    writeMeasurementCursor(App, 'default');
  } catch {
    // ignore document cleanup failures
  }
}

function exitViewerMeasurementPrimaryMode(App: AppContainer): void {
  try {
    setModePrimary(
      App,
      'none',
      {},
      {
        source: 'viewerMeasurement:emptyClick',
        noBuild: true,
        noHistory: true,
        noAutosave: true,
        noPersist: true,
        noCapture: true,
        immediate: true,
      }
    );
  } catch {
    // Some isolated tests or partial hosts do not install mode actions; clearing
    // the overlay and chrome is still the correct local behavior.
  }

  clearMeasurementModeChrome(App);
}

function addTrackedLine(args: {
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  objects: Object3DLike[];
  points: Vector3Like[];
  name: string;
  color?: number;
}): void {
  const { THREE, wardrobeGroup, objects, points, name } = args;
  const color = args.color ?? POINT_DEFAULT_COLOR;
  const geometry = new THREE.BufferGeometry();
  if (typeof geometry.setFromPoints === 'function') geometry.setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.98,
    depthTest: true,
    depthWrite: false,
  });
  const line = asObject3D(new THREE.Line(geometry, material));
  if (!line) return;
  line.name = name;
  line.renderOrder = OVERLAY_RENDER_ORDER;
  line.userData = {
    ...(line.userData || {}),
    __wpViewerMeasurementOverlay: true,
    __wpExcludeWardrobeBounds: true,
    __ignoreRaycast: true,
  };
  wardrobeGroup.add(line);
  objects.push(line);
}

function tuneOverlayMaterial(material: unknown, options: { depthTest: boolean }): unknown {
  const rec = isRecord(material) ? material : null;
  if (!rec) return material;

  let writable = rec;
  const clone = rec.clone;
  if (typeof clone === 'function') {
    try {
      const cloned = Reflect.apply(clone, rec, []);
      if (isRecord(cloned)) writable = cloned;
    } catch {
      writable = rec;
    }
  }

  try {
    writable.depthTest = options.depthTest;
    writable.depthWrite = false;
    writable.transparent = true;
    writable.needsUpdate = true;
  } catch {
    // ignore material write failures
  }

  return writable;
}

function tuneOverlayObject(obj: Object3DLike, options: { depthTest: boolean }): void {
  const rec = isRecord(obj) ? obj : null;
  if (!rec) return;
  try {
    rec.renderOrder = OVERLAY_RENDER_ORDER;
  } catch {
    // ignore
  }
  const material = rec.material;
  try {
    if (Array.isArray(material)) rec.material = material.map(item => tuneOverlayMaterial(item, options));
    else if (material) rec.material = tuneOverlayMaterial(material, options);
  } catch {
    // ignore
  }
}

function writeMaterialColor(material: unknown, color: number): void {
  const rec = isRecord(material) ? material : null;
  if (!rec) return;
  try {
    const colorValue = rec.color;
    if (isRecord(colorValue) && typeof colorValue.set === 'function') {
      Reflect.apply(colorValue.set, colorValue, [color]);
    } else {
      rec.color = color;
    }
    rec.needsUpdate = true;
  } catch {
    // A color hint is a visual affordance; keep the measurement usable if the
    // host material is immutable or custom.
  }
}

function tintOverlayObjects(objects: Object3DLike[], color: number, includeSprites = false): void {
  for (let i = 0; i < objects.length; i += 1) {
    const obj = objects[i];
    const rec = isRecord(obj) ? obj : null;
    if (!rec) continue;
    if (!includeSprites && rec.type === 'Sprite') continue;
    const material = rec.material;
    if (Array.isArray(material)) material.forEach(item => writeMaterialColor(item, color));
    else writeMaterialColor(material, color);
  }
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
      __wpExcludeWardrobeBounds: true,
      __ignoreRaycast: true,
    };
    tuneOverlayObject(line, { depthTest: true });
    out.push(line);
  }
  if (sprite) {
    sprite.userData = {
      ...(sprite.userData || {}),
      __wpViewerMeasurementOverlay: true,
      __wpExcludeWardrobeBounds: true,
      __ignoreRaycast: true,
    };
    tuneOverlayObject(sprite, { depthTest: false });
    out.push(sprite);
  }
  return out;
}

function addDimensionGuides(args: {
  THREE: OverlayThree;
  addDimensionLine: BuilderDimensionLineFn;
  box: LocalMeasurementBox;
  plane: MeasurementPlane;
  objects: Object3DLike[];
}): void {
  const { THREE, addDimensionLine, box, plane, objects } = args;
  const sideOffset = SIDE_GUIDE_OFFSET_M;
  const normalBump = plane.normalSign * FRONT_Z_EPSILON_M;
  const labelScale = { textScale: 0.78, styleKey: 'cell' };

  const widthObjects = readCreatedDimensionObjects(
    addDimensionLine(
      pointOnMeasurementPlane(THREE, box, plane, plane.uMin, plane.vMax),
      pointOnMeasurementPlane(THREE, box, plane, plane.uMax, plane.vMax),
      plane.basis
        ? addBasisVectors(THREE, plane.basis.v, GUIDE_OFFSET_M, plane.basis.normal, normalBump)
        : axisVector(THREE, plane.vAxis, GUIDE_OFFSET_M, { [plane.normalAxis]: normalBump }),
      formatCmLabel(plane.uLength),
      labelScale,
      plane.basis ? basisVector(THREE, plane.basis.v, 0.012) : axisVector(THREE, plane.vAxis, 0.012)
    )
  );
  objects.push(...widthObjects);

  const heightObjects = readCreatedDimensionObjects(
    addDimensionLine(
      pointOnMeasurementPlane(THREE, box, plane, plane.uMax + sideOffset, plane.vMin),
      pointOnMeasurementPlane(THREE, box, plane, plane.uMax + sideOffset, plane.vMax),
      plane.basis
        ? addBasisVectors(THREE, plane.basis.u, sideOffset, plane.basis.normal, normalBump)
        : axisVector(THREE, plane.uAxis, sideOffset, { [plane.normalAxis]: normalBump }),
      formatCmLabel(plane.vLength),
      labelScale
    )
  );
  objects.push(...heightObjects);

  const normalLength = plane.basis
    ? plane.basis.normalMax - plane.basis.normalMin
    : getBoxLengthAxis(box, plane.normalAxis);
  if (!(normalLength > MIN_MEASURABLE_EDGE_M)) return;

  const anchorU = plane.uMin - sideOffset;
  const anchorV = (plane.vMin + plane.vMax) / 2;
  const depthStart = plane.basis
    ? pointOnMeasurementPlane(THREE, box, { ...plane, normalValue: plane.basis.normalMin }, anchorU, anchorV)
    : pointOnBoxAxisLine(THREE, box, {
        [plane.uAxis]: anchorU,
        [plane.vAxis]: anchorV,
        [plane.normalAxis]: getBoxMinAxis(box, plane.normalAxis),
      });
  const depthEnd = plane.basis
    ? pointOnMeasurementPlane(THREE, box, { ...plane, normalValue: plane.basis.normalMax }, anchorU, anchorV)
    : pointOnBoxAxisLine(THREE, box, {
        [plane.uAxis]: anchorU,
        [plane.vAxis]: anchorV,
        [plane.normalAxis]: getBoxMaxAxis(box, plane.normalAxis),
      });

  const depthObjects = readCreatedDimensionObjects(
    addDimensionLine(
      depthStart,
      depthEnd,
      plane.basis
        ? basisVector(THREE, plane.basis.u, -sideOffset)
        : axisVector(THREE, plane.uAxis, -sideOffset),
      formatCmLabel(normalLength),
      labelScale,
      plane.basis ? basisVector(THREE, plane.basis.u, -0.012) : axisVector(THREE, plane.uAxis, -0.012)
    )
  );
  objects.push(...depthObjects);
}

function resolveSelectionFrameAxisMin(
  plane: MeasurementPlane,
  axis: MeasurementAxis,
  min: number,
  max: number
): number {
  if (plane.kind !== 'top' || axis !== 'z') return min;
  const length = max - min;
  if (!(length > MIN_MEASURABLE_EDGE_M)) return min;
  const pull = Math.min(
    REAR_SELECTION_FRAME_PULL_FORWARD_M,
    Math.max(0, length - MIN_MEASURABLE_EDGE_M) * 0.25
  );
  if (!(pull > 0)) return min;
  return Math.min(max - MIN_MEASURABLE_EDGE_M, min + pull);
}

function addSelectionFrame(args: {
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  box: LocalMeasurementBox;
  plane: MeasurementPlane;
  objects: Object3DLike[];
}): void {
  const { THREE, wardrobeGroup, box, plane, objects } = args;
  const frameUMin = resolveSelectionFrameAxisMin(plane, plane.uAxis, plane.uMin, plane.uMax);
  const frameVMin = resolveSelectionFrameAxisMin(plane, plane.vAxis, plane.vMin, plane.vMax);
  addTrackedLine({
    THREE,
    wardrobeGroup,
    objects,
    name: 'wp-viewer-measurement-selection-frame',
    points: [
      pointOnMeasurementPlane(THREE, box, plane, frameUMin, frameVMin),
      pointOnMeasurementPlane(THREE, box, plane, plane.uMax, frameVMin),
      pointOnMeasurementPlane(THREE, box, plane, plane.uMax, plane.vMax),
      pointOnMeasurementPlane(THREE, box, plane, frameUMin, plane.vMax),
      pointOnMeasurementPlane(THREE, box, plane, frameUMin, frameVMin),
    ],
  });
}

function offsetPointOnMeasurementPlane(
  THREE: Pick<ThreeLike, 'Vector3'>,
  plane: MeasurementPlane,
  point: { x: number; y: number; z: number },
  deltaU: number,
  deltaV: number
): Vector3Like {
  if (plane.basis) {
    return vector(
      THREE,
      point.x + plane.basis.u.x * deltaU + plane.basis.v.x * deltaV,
      point.y + plane.basis.u.y * deltaU + plane.basis.v.y * deltaV,
      point.z + plane.basis.u.z * deltaU + plane.basis.v.z * deltaV
    );
  }
  const coords = { x: point.x, y: point.y, z: point.z };
  coords[plane.uAxis] = (coords[plane.uAxis] || 0) + deltaU;
  coords[plane.vAxis] = (coords[plane.vAxis] || 0) + deltaV;
  return vector(THREE, coords.x, coords.y, coords.z);
}

function addPointCrossMarker(args: {
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  objects: Object3DLike[];
  plane: MeasurementPlane;
  point: Vector3Like;
  namePrefix: string;
  half?: number;
  color?: number;
}): void {
  const { THREE, wardrobeGroup, objects, plane, point, namePrefix } = args;
  const half = args.half ?? 0.014;
  const color = args.color ?? POINT_DEFAULT_COLOR;
  addTrackedLine({
    THREE,
    wardrobeGroup,
    objects,
    name: `${namePrefix}-x-a`,
    points: [
      offsetPointOnMeasurementPlane(THREE, plane, point, -half, -half),
      offsetPointOnMeasurementPlane(THREE, plane, point, half, half),
    ],
    color,
  });
  addTrackedLine({
    THREE,
    wardrobeGroup,
    objects,
    name: `${namePrefix}-x-b`,
    points: [
      offsetPointOnMeasurementPlane(THREE, plane, point, -half, half),
      offsetPointOnMeasurementPlane(THREE, plane, point, half, -half),
    ],
    color,
  });
}

function addDraftPointMarker(args: {
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  objects: Object3DLike[];
  plane: MeasurementPlane;
  point: Vector3Like;
  namePrefix?: string;
  color?: number;
}): void {
  addPointCrossMarker({
    ...args,
    namePrefix: args.namePrefix || 'wp-viewer-measurement-point-draft-marker',
    color: args.color,
  });
}

function removeOverlayStateObjects(state: MeasurementOverlayState | null): void {
  if (!state) return;
  for (let i = 0; i < state.objects.length; i += 1) {
    const obj = state.objects[i];
    if (obj) removeObjectFromScene(obj);
  }
}

function renderPointDraftOverlay(args: {
  App: AppContainer;
  draft: PointMeasurementDraft;
  hitState?: CanvasPickingClickHitState | null;
  includePreview: boolean;
  pointer?: PointMeasurementPointerContext | null;
}): boolean {
  const { App, draft, hitState, includePreview, pointer } = args;
  applyMeasurementToolCursor(App, 'points');
  const THREE = readOverlayThree(App);
  const wardrobeGroup = getWardrobeGroup(App);
  if (!THREE || !wardrobeGroup) return false;

  const objects: Object3DLike[] = [];
  const startPoint = vector(THREE, draft.point.x, draft.point.y, draft.point.z);
  addDraftPointMarker({
    THREE,
    wardrobeGroup,
    objects,
    plane: draft.plane,
    point: startPoint,
    namePrefix: 'wp-viewer-measurement-point-draft-start',
  });

  if (includePreview) {
    const localEnd = readPointMeasurementPointerLocalPoint({
      App,
      hitState,
      wardrobeGroup,
      plane: draft.plane,
      pointer,
    });
    const addDimensionLine = readAddDimensionLine(App);
    const resolved = localEnd ? resolvePointMeasurementEnd({ THREE, draft, localEnd }) : null;
    if (resolved) {
      addDraftPointMarker({
        THREE,
        wardrobeGroup,
        objects,
        plane: draft.plane,
        point: resolved.end,
        namePrefix: 'wp-viewer-measurement-point-draft-cursor',
        color: resolved.snapped ? POINT_STRAIGHT_SNAP_COLOR : POINT_DEFAULT_COLOR,
      });
      if (resolved.length > MIN_MEASURABLE_EDGE_M && addDimensionLine) {
        const dimensionObjects = readCreatedDimensionObjects(
          addDimensionLine(
            resolved.start,
            resolved.end,
            axisVector(THREE, draft.plane.normalAxis, 0),
            formatCmLabel(resolved.length),
            { textScale: 0.82, styleKey: 'cell' }
          )
        );
        if (resolved.snapped) tintOverlayObjects(dimensionObjects, POINT_STRAIGHT_SNAP_COLOR);
        objects.push(...dimensionObjects);
      } else {
        addTrackedLine({
          THREE,
          wardrobeGroup,
          objects,
          name: 'wp-viewer-measurement-point-draft-preview-line',
          points: [resolved.start, resolved.end],
          color: resolved.snapped ? POINT_STRAIGHT_SNAP_COLOR : POINT_DEFAULT_COLOR,
        });
      }
    }
  }

  writeOverlayState(App, { objects, targetKey: draft.targetKey, pointDraft: draft });
  touchRender(App);
  return true;
}

function beginPointMeasurementDraft(args: {
  App: AppContainer;
  hitState?: CanvasPickingClickHitState | null;
  pointer?: PointMeasurementPointerContext | null;
}): boolean {
  const { App, hitState, pointer } = args;
  applyMeasurementToolCursor(App, 'points');
  const THREE = readOverlayThree(App);
  const wardrobeGroup = getWardrobeGroup(App);
  if (!THREE || !wardrobeGroup) return false;

  const draft = hitState
    ? resolvePointMeasurementStart({ App, THREE, hitState, wardrobeGroup })
    : resolvePointMeasurementStartFromPointer({ App, THREE, wardrobeGroup, pointer });
  if (!draft) return false;

  if (!renderPointDraftOverlay({ App, draft, includePreview: false })) return false;

  try {
    getUiFeedbackServiceMaybe(App)?.updateEditStateToast?.(
      'מצב מדידה מדוייק: לחץ נקודה שנייה; קרוב לאופקי/אנכי יינעל בירוק',
      true
    );
  } catch {
    // visual overlay is enough in partial test hosts.
  }
  return true;
}

function renderPointMeasurement(args: {
  App: AppContainer;
  draft: PointMeasurementDraft;
  hitState?: CanvasPickingClickHitState | null;
  pointer?: PointMeasurementPointerContext | null;
}): boolean {
  const { App, draft, hitState, pointer } = args;
  applyMeasurementToolCursor(App, 'points');
  const THREE = readOverlayThree(App);
  const wardrobeGroup = getWardrobeGroup(App);
  const addDimensionLine = readAddDimensionLine(App);
  if (!THREE || !wardrobeGroup || !addDimensionLine) return false;

  const localEnd = readPointMeasurementPointerLocalPoint({
    App,
    hitState,
    wardrobeGroup,
    plane: draft.plane,
    pointer,
  });
  if (!localEnd) return false;

  const plane = draft.plane;
  const resolved = resolvePointMeasurementEnd({ THREE, draft, localEnd });
  if (!resolved || !(resolved.length > MIN_MEASURABLE_EDGE_M)) {
    return beginPointMeasurementDraft({ App, hitState, pointer });
  }

  const objects: Object3DLike[] = [];

  const lineObjects = readCreatedDimensionObjects(
    addDimensionLine(
      resolved.start,
      resolved.end,
      axisVector(THREE, plane.normalAxis, 0),
      formatCmLabel(resolved.length),
      { textScale: 0.82, styleKey: 'cell' }
    )
  );
  if (resolved.snapped) tintOverlayObjects(lineObjects, POINT_STRAIGHT_SNAP_COLOR);
  objects.push(...lineObjects);
  addDraftPointMarker({
    THREE,
    wardrobeGroup,
    objects,
    plane,
    point: resolved.start,
    namePrefix: 'wp-viewer-measurement-point-start',
    color: resolved.snapped ? POINT_STRAIGHT_SNAP_COLOR : POINT_DEFAULT_COLOR,
  });
  addDraftPointMarker({
    THREE,
    wardrobeGroup,
    objects,
    plane,
    point: resolved.end,
    namePrefix: 'wp-viewer-measurement-point-end',
    color: resolved.snapped ? POINT_STRAIGHT_SNAP_COLOR : POINT_DEFAULT_COLOR,
  });

  writeOverlayState(App, { objects, targetKey: draft.targetKey, pointDraft: null });
  touchRender(App);
  return true;
}

function isActionableMeasurementHitState(
  hitState: CanvasPickingClickHitState | null
): hitState is CanvasPickingClickHitState {
  if (!hitState) return false;
  if (!Array.isArray(hitState.intersects) || hitState.intersects.length === 0) return false;
  return !!resolveViewerMeasurementTarget(hitState);
}

function exitPointMeasurementOnEmptyClick(App: AppContainer): boolean {
  clearViewerMeasurementOverlay(App, false);
  exitViewerMeasurementPrimaryMode(App);
  touchRender(App);
  return true;
}

function tryHandleViewerPointMeasurementClick(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState | null;
  ndcX?: number;
  ndcY?: number;
  raycaster?: RaycasterLike | null;
  mouse?: MouseVectorLike | null;
}): boolean {
  const { App, hitState } = args;
  const pointer: PointMeasurementPointerContext = {
    ndcX: args.ndcX,
    ndcY: args.ndcY,
    raycaster: args.raycaster,
    mouse: args.mouse,
  };
  applyMeasurementToolCursor(App, 'points');
  const currentState = readOverlayState(App);
  const draft = currentState?.pointDraft || null;

  if (!isActionableMeasurementHitState(hitState)) {
    if (draft) {
      clearViewerMeasurementOverlay(App, false);
      if (!renderPointMeasurement({ App, draft, hitState: null, pointer })) touchRender(App);
      return true;
    }
    clearViewerMeasurementOverlay(App, false);
    if (beginPointMeasurementDraft({ App, hitState: null, pointer })) return true;
    return exitPointMeasurementOnEmptyClick(App);
  }

  if (!draft) {
    clearViewerMeasurementOverlay(App, false);
    if (!beginPointMeasurementDraft({ App, hitState, pointer })) touchRender(App);
    return true;
  }

  clearViewerMeasurementOverlay(App, false);
  if (!renderPointMeasurement({ App, draft, hitState, pointer })) touchRender(App);
  return true;
}

export function tryHandleViewerMeasurementHover(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState | null;
  ndcX?: number;
  ndcY?: number;
  raycaster?: RaycasterLike | null;
  mouse?: MouseVectorLike | null;
}): boolean {
  const { App, hitState } = args;
  if (getViewerMeasurementToolMode(App) !== 'points') return false;
  applyMeasurementToolCursor(App, 'points');
  const state = readOverlayState(App);
  const draft = state?.pointDraft || null;
  if (!draft) return false;

  removeOverlayStateObjects(state);
  if (
    !renderPointDraftOverlay({
      App,
      draft,
      hitState,
      includePreview: true,
      pointer: {
        ndcX: args.ndcX,
        ndcY: args.ndcY,
        raycaster: args.raycaster,
        mouse: args.mouse,
      },
    })
  ) {
    writeOverlayState(App, { objects: [], targetKey: draft.targetKey, pointDraft: draft });
    touchRender(App);
  }
  return true;
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

  const resolution = resolveViewerMeasurementResolution({ App, THREE, hitState, wardrobeGroup, target });
  if (!resolution) return false;
  const { box, plane, targetKey } = resolution;
  const objects: Object3DLike[] = [];
  addSelectionFrame({ THREE, wardrobeGroup, box, plane, objects });
  addDimensionGuides({ THREE, addDimensionLine, box, plane, objects });

  writeOverlayState(App, { objects, targetKey });
  touchRender(App);
  return true;
}

export function tryHandleViewerMeasurementClick(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState | null;
  ndcX?: number;
  ndcY?: number;
  raycaster?: RaycasterLike | null;
  mouse?: MouseVectorLike | null;
}): boolean {
  const { App, hitState } = args;

  try {
    if (getViewerMeasurementToolMode(App) === 'points') {
      return tryHandleViewerPointMeasurementClick({
        App,
        hitState,
        ndcX: args.ndcX,
        ndcY: args.ndcY,
        raycaster: args.raycaster,
        mouse: args.mouse,
      });
    }
  } catch {
    // Fall back to the regular part measurement in partial hosts.
  }

  clearViewerMeasurementOverlay(App, false);
  if (!hitState) {
    exitViewerMeasurementPrimaryMode(App);
    touchRender(App);
    return true;
  }

  try {
    const target = resolveViewerMeasurementTarget(hitState);
    if (!target) {
      exitViewerMeasurementPrimaryMode(App);
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
