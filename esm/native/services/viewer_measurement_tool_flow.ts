import type { BuilderDimensionLineFn, Object3DLike, ThreeLike, UnknownRecord } from '../../../types';
import type { Vector3Like } from '../../../types/three_like.js';

import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
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
import type { ViewerMeasurementFeatureRuntime } from './viewer_measurement_tool_runtime.js';

const OVERLAY_RENDER_ORDER = 10040;
const GUIDE_OFFSET_M = 0.045;
const SIDE_GUIDE_OFFSET_M = 0.055;
const REAR_SELECTION_FRAME_PULL_FORWARD_M = 0.012;
const PART_HOVER_COLOR = 0x38bdf8;
const POINT_STRAIGHT_SNAP_COLOR = 0x16a34a;
const POINT_DEFAULT_COLOR = 0x2563eb;
const POINT_MEASUREMENT_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='25' viewBox='0 0 25 25'%3E%3Cpath d='M6 6 L19 19 M19 6 L6 19' stroke='%23111827' stroke-width='2.2' stroke-linecap='round'/%3E%3Ccircle cx='12.5' cy='12.5' r='2.2' fill='none' stroke='%23ffffff' stroke-width='1.4'/%3E%3C/svg%3E") 12 12, crosshair`;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asObject3D(value: unknown): Object3DLike | null {
  return isRecord(value) ? (value as Object3DLike) : null;
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
    // measurement-visual-fallback: overlay metadata and resource cleanup are best-effort after measurement state commits
  }

  try {
    const material = isRecord(obj) ? obj.material : null;
    const dispose = isRecord(material) ? material.dispose : null;
    if (typeof dispose === 'function') Reflect.apply(dispose, material, []);
  } catch {
    // measurement-visual-fallback: overlay metadata and resource cleanup are best-effort after measurement state commits
  }
}

function formatCmLabel(valueM: number): string {
  const cm = valueM * 100;
  if (!Number.isFinite(cm)) return '';
  if (cm >= 10) return Math.round(cm).toFixed(0);
  return cm.toFixed(1).replace(/\.0$/, '');
}

function readOverlayState(runtime: ViewerMeasurementFeatureRuntime): MeasurementOverlayState | null {
  return runtime.state.readOverlay('committed');
}

function readHoverOverlayState(runtime: ViewerMeasurementFeatureRuntime): MeasurementOverlayState | null {
  return runtime.state.readOverlay('hover');
}

function writeOverlayState(
  runtime: ViewerMeasurementFeatureRuntime,
  state: MeasurementOverlayState | null
): void {
  runtime.state.writeOverlay('committed', state);
}

function writeHoverOverlayState(
  runtime: ViewerMeasurementFeatureRuntime,
  state: MeasurementOverlayState | null
): void {
  runtime.state.writeOverlay('hover', state);
}

function applyMeasurementToolCursor(
  runtime: ViewerMeasurementFeatureRuntime,
  mode: ViewerMeasurementToolMode
): void {
  runtime.ui.writeCursor(mode === 'points' ? POINT_MEASUREMENT_CURSOR : 'crosshair');
}

export function getViewerMeasurementToolModeWithRuntime(
  runtime: ViewerMeasurementFeatureRuntime
): ViewerMeasurementToolMode {
  return runtime.state.readToolMode();
}

export function setViewerMeasurementToolModeWithRuntime(
  runtime: ViewerMeasurementFeatureRuntime,
  mode: ViewerMeasurementToolMode,
  render = true
): void {
  const nextMode: ViewerMeasurementToolMode = mode === 'points' ? 'points' : 'part';
  const previousMode = getViewerMeasurementToolModeWithRuntime(runtime);
  runtime.state.writeToolMode(nextMode);
  applyMeasurementToolCursor(runtime, nextMode);
  if (previousMode !== nextMode) clearViewerMeasurementOverlayWithRuntime(runtime, render);
}

function touchRender(runtime: ViewerMeasurementFeatureRuntime): void {
  runtime.render.touch();
}

export function clearViewerMeasurementOverlayWithRuntime(
  runtime: ViewerMeasurementFeatureRuntime,
  render = true
): void {
  const state = readOverlayState(runtime);
  const hoverState = readHoverOverlayState(runtime);
  const hadOverlay = !!state && state.objects.length > 0;
  const hadHoverOverlay = !!hoverState && hoverState.objects.length > 0;
  removeOverlayStateObjects(state);
  removeOverlayStateObjects(hoverState);
  writeOverlayState(runtime, null);
  writeHoverOverlayState(runtime, null);
  if (render && (hadOverlay || hadHoverOverlay)) touchRender(runtime);
}

function clearViewerMeasurementHoverOverlay(
  runtime: ViewerMeasurementFeatureRuntime,
  render = true
): boolean {
  const state = readHoverOverlayState(runtime);
  const hadOverlay = !!state && state.objects.length > 0;
  removeOverlayStateObjects(state);
  writeHoverOverlayState(runtime, null);
  if (render && hadOverlay) touchRender(runtime);
  return hadOverlay;
}

function readAddDimensionLine(runtime: ViewerMeasurementFeatureRuntime): BuilderDimensionLineFn | null {
  return runtime.render.readAddDimensionLine();
}

function readOverlayThree(runtime: ViewerMeasurementFeatureRuntime): OverlayThree | null {
  return runtime.render.readThree();
}

function readWardrobeGroup(runtime: ViewerMeasurementFeatureRuntime): Object3DLike | null {
  return runtime.render.readWardrobeGroup();
}

function exitViewerMeasurementPrimaryMode(runtime: ViewerMeasurementFeatureRuntime): void {
  runtime.ui.exitPrimaryMode();
  runtime.ui.clearModeChrome();
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
    ...line.userData,
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
    // measurement-visual-fallback: overlay metadata and resource cleanup are best-effort after measurement state commits
  }
  const material = rec.material;
  try {
    if (Array.isArray(material)) rec.material = material.map(item => tuneOverlayMaterial(item, options));
    else if (material) rec.material = tuneOverlayMaterial(material, options);
  } catch {
    // measurement-visual-fallback: overlay metadata and resource cleanup are best-effort after measurement state commits
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
      ...line.userData,
      __wpViewerMeasurementOverlay: true,
      __wpExcludeWardrobeBounds: true,
      __ignoreRaycast: true,
    };
    tuneOverlayObject(line, { depthTest: true });
    out.push(line);
  }
  if (sprite) {
    sprite.userData = {
      ...sprite.userData,
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
  name?: string;
  color?: number;
}): void {
  const { THREE, wardrobeGroup, box, plane, objects } = args;
  const frameUMin = resolveSelectionFrameAxisMin(plane, plane.uAxis, plane.uMin, plane.uMax);
  const frameVMin = resolveSelectionFrameAxisMin(plane, plane.vAxis, plane.vMin, plane.vMax);
  addTrackedLine({
    THREE,
    wardrobeGroup,
    objects,
    name: args.name || 'wp-viewer-measurement-selection-frame',
    color: args.color,
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
  runtime: ViewerMeasurementFeatureRuntime;
  draft: PointMeasurementDraft;
  hitState?: CanvasPickingClickHitState | null;
  includePreview: boolean;
  pointer?: PointMeasurementPointerContext | null;
}): boolean {
  const { runtime, draft, hitState, includePreview, pointer } = args;
  const geometryRuntime = runtime.geometry;
  applyMeasurementToolCursor(runtime, 'points');
  const THREE = readOverlayThree(runtime);
  const wardrobeGroup = readWardrobeGroup(runtime);
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
      runtime: geometryRuntime,
      hitState,
      wardrobeGroup,
      plane: draft.plane,
      pointer,
    });
    const addDimensionLine = readAddDimensionLine(runtime);
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

  writeOverlayState(runtime, { objects, targetKey: draft.targetKey, pointDraft: draft });
  touchRender(runtime);
  return true;
}

function beginPointMeasurementDraft(args: {
  runtime: ViewerMeasurementFeatureRuntime;
  hitState?: CanvasPickingClickHitState | null;
  pointer?: PointMeasurementPointerContext | null;
}): boolean {
  const { runtime, hitState, pointer } = args;
  const geometryRuntime = runtime.geometry;
  applyMeasurementToolCursor(runtime, 'points');
  const THREE = readOverlayThree(runtime);
  const wardrobeGroup = readWardrobeGroup(runtime);
  if (!THREE || !wardrobeGroup) return false;

  const draft = hitState
    ? resolvePointMeasurementStart({ runtime: geometryRuntime, THREE, hitState, wardrobeGroup })
    : resolvePointMeasurementStartFromPointer({ runtime: geometryRuntime, THREE, wardrobeGroup, pointer });
  if (!draft) return false;

  if (!renderPointDraftOverlay({ runtime, draft, includePreview: false })) return false;

  runtime.ui.showPointDraftHint();
  return true;
}

function renderPointMeasurement(args: {
  runtime: ViewerMeasurementFeatureRuntime;
  draft: PointMeasurementDraft;
  hitState?: CanvasPickingClickHitState | null;
  pointer?: PointMeasurementPointerContext | null;
}): boolean {
  const { runtime, draft, hitState, pointer } = args;
  const geometryRuntime = runtime.geometry;
  applyMeasurementToolCursor(runtime, 'points');
  const THREE = readOverlayThree(runtime);
  const wardrobeGroup = readWardrobeGroup(runtime);
  const addDimensionLine = readAddDimensionLine(runtime);
  if (!THREE || !wardrobeGroup || !addDimensionLine) return false;

  const localEnd = readPointMeasurementPointerLocalPoint({
    runtime: geometryRuntime,
    hitState,
    wardrobeGroup,
    plane: draft.plane,
    pointer,
  });
  if (!localEnd) return false;

  const plane = draft.plane;
  const resolved = resolvePointMeasurementEnd({ THREE, draft, localEnd });
  if (!resolved || !(resolved.length > MIN_MEASURABLE_EDGE_M)) {
    return beginPointMeasurementDraft({ runtime, hitState, pointer });
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

  writeOverlayState(runtime, { objects, targetKey: draft.targetKey, pointDraft: null });
  touchRender(runtime);
  return true;
}

function isActionableMeasurementHitState(
  hitState: CanvasPickingClickHitState | null
): hitState is CanvasPickingClickHitState {
  if (!hitState) return false;
  if (!Array.isArray(hitState.intersects) || hitState.intersects.length === 0) return false;
  return !!resolveViewerMeasurementTarget(hitState);
}

function exitPointMeasurementOnEmptyClick(runtime: ViewerMeasurementFeatureRuntime): boolean {
  clearViewerMeasurementOverlayWithRuntime(runtime, false);
  exitViewerMeasurementPrimaryMode(runtime);
  touchRender(runtime);
  return true;
}

function tryHandleViewerPointMeasurementClick(args: {
  runtime: ViewerMeasurementFeatureRuntime;
  hitState: CanvasPickingClickHitState | null;
  ndcX?: number;
  ndcY?: number;
  raycaster?: RaycasterLike | null;
  mouse?: MouseVectorLike | null;
}): boolean {
  const { runtime, hitState } = args;
  const pointer: PointMeasurementPointerContext = {
    ndcX: args.ndcX,
    ndcY: args.ndcY,
    raycaster: args.raycaster,
    mouse: args.mouse,
  };
  applyMeasurementToolCursor(runtime, 'points');
  const currentState = readOverlayState(runtime);
  const draft = currentState?.pointDraft || null;

  if (!isActionableMeasurementHitState(hitState)) {
    if (draft) {
      clearViewerMeasurementOverlayWithRuntime(runtime, false);
      if (!renderPointMeasurement({ runtime, draft, hitState: null, pointer })) touchRender(runtime);
      return true;
    }
    clearViewerMeasurementOverlayWithRuntime(runtime, false);
    if (beginPointMeasurementDraft({ runtime, hitState: null, pointer })) return true;
    return exitPointMeasurementOnEmptyClick(runtime);
  }

  if (!draft) {
    clearViewerMeasurementOverlayWithRuntime(runtime, false);
    if (!beginPointMeasurementDraft({ runtime, hitState, pointer })) touchRender(runtime);
    return true;
  }

  clearViewerMeasurementOverlayWithRuntime(runtime, false);
  if (!renderPointMeasurement({ runtime, draft, hitState, pointer })) touchRender(runtime);
  return true;
}

export function tryHandleViewerMeasurementHoverWithRuntime(args: {
  runtime: ViewerMeasurementFeatureRuntime;
  hitState: CanvasPickingClickHitState | null;
  ndcX?: number;
  ndcY?: number;
  raycaster?: RaycasterLike | null;
  mouse?: MouseVectorLike | null;
}): boolean {
  const { runtime, hitState } = args;
  if (getViewerMeasurementToolModeWithRuntime(runtime) !== 'points') {
    return tryHandleViewerPartMeasurementHover({ runtime, hitState });
  }
  clearViewerMeasurementHoverOverlay(runtime, false);
  applyMeasurementToolCursor(runtime, 'points');
  const state = readOverlayState(runtime);
  const draft = state?.pointDraft || null;
  if (!draft) return false;

  removeOverlayStateObjects(state);
  if (
    !renderPointDraftOverlay({
      runtime,
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
    writeOverlayState(runtime, { objects: [], targetKey: draft.targetKey, pointDraft: draft });
    touchRender(runtime);
  }
  return true;
}

function renderPartMeasurementHoverOverlay(args: {
  runtime: ViewerMeasurementFeatureRuntime;
  target: unknown;
  hitState: CanvasPickingClickHitState;
}): boolean {
  const { runtime, target, hitState } = args;
  const geometryRuntime = runtime.geometry;
  const THREE = readOverlayThree(runtime);
  const wardrobeGroup = readWardrobeGroup(runtime);
  if (!THREE || !wardrobeGroup) return false;

  const resolution = resolveViewerMeasurementResolution({
    runtime: geometryRuntime,
    THREE,
    hitState,
    wardrobeGroup,
    target,
  });
  if (!resolution) return false;

  const committedState = readOverlayState(runtime);
  if (
    committedState &&
    !committedState.pointDraft &&
    resolution.targetKey &&
    committedState.targetKey === resolution.measurementKey
  ) {
    clearViewerMeasurementHoverOverlay(runtime, true);
    return true;
  }

  const objects: Object3DLike[] = [];
  addSelectionFrame({
    THREE,
    wardrobeGroup,
    box: resolution.box,
    plane: resolution.plane,
    objects,
    name: 'wp-viewer-measurement-hover-frame',
    color: PART_HOVER_COLOR,
  });

  writeHoverOverlayState(runtime, { objects, targetKey: resolution.measurementKey });
  touchRender(runtime);
  return true;
}

function tryHandleViewerPartMeasurementHover(args: {
  runtime: ViewerMeasurementFeatureRuntime;
  hitState: CanvasPickingClickHitState | null;
}): boolean {
  const { runtime, hitState } = args;
  applyMeasurementToolCursor(runtime, 'part');
  if (!hitState) return clearViewerMeasurementHoverOverlay(runtime, true);

  try {
    const target = resolveViewerMeasurementTarget(hitState);
    if (!target) return clearViewerMeasurementHoverOverlay(runtime, true);

    clearViewerMeasurementHoverOverlay(runtime, false);
    if (!renderPartMeasurementHoverOverlay({ runtime, target, hitState })) {
      touchRender(runtime);
      return false;
    }
    return true;
  } catch (err) {
    clearViewerMeasurementHoverOverlay(runtime, false);
    runtime.diagnostics.reportPickingIssue(err, 'hoverPart', 1000);
    touchRender(runtime);
    return false;
  }
}

function renderMeasurementOverlay(args: {
  runtime: ViewerMeasurementFeatureRuntime;
  target: unknown;
  hitState: CanvasPickingClickHitState;
}): boolean {
  const { runtime, target, hitState } = args;
  const geometryRuntime = runtime.geometry;
  clearViewerMeasurementHoverOverlay(runtime, false);
  const THREE = readOverlayThree(runtime);
  const wardrobeGroup = readWardrobeGroup(runtime);
  const addDimensionLine = readAddDimensionLine(runtime);
  if (!THREE || !wardrobeGroup || !addDimensionLine) return false;

  const resolution = resolveViewerMeasurementResolution({
    runtime: geometryRuntime,
    THREE,
    hitState,
    wardrobeGroup,
    target,
  });
  if (!resolution) return false;
  const { box, plane, measurementKey } = resolution;
  const objects: Object3DLike[] = [];
  addSelectionFrame({ THREE, wardrobeGroup, box, plane, objects });
  addDimensionGuides({ THREE, addDimensionLine, box, plane, objects });

  writeOverlayState(runtime, { objects, targetKey: measurementKey });
  touchRender(runtime);
  return true;
}

export function tryHandleViewerMeasurementClickWithRuntime(args: {
  runtime: ViewerMeasurementFeatureRuntime;
  hitState: CanvasPickingClickHitState | null;
  ndcX?: number;
  ndcY?: number;
  raycaster?: RaycasterLike | null;
  mouse?: MouseVectorLike | null;
}): boolean {
  const { runtime, hitState } = args;
  try {
    if (getViewerMeasurementToolModeWithRuntime(runtime) === 'points') {
      return tryHandleViewerPointMeasurementClick({
        runtime,
        hitState,
        ndcX: args.ndcX,
        ndcY: args.ndcY,
        raycaster: args.raycaster,
        mouse: args.mouse,
      });
    }
  } catch (error) {
    runtime.diagnostics.reportNonFatal('readToolMode', error);
    // Fall back to the regular part measurement so the click remains usable.
  }

  clearViewerMeasurementOverlayWithRuntime(runtime, false);
  if (!hitState) {
    exitViewerMeasurementPrimaryMode(runtime);
    touchRender(runtime);
    return true;
  }

  try {
    const target = resolveViewerMeasurementTarget(hitState);
    if (!target) {
      exitViewerMeasurementPrimaryMode(runtime);
      touchRender(runtime);
      return true;
    }
    if (!renderMeasurementOverlay({ runtime, target, hitState })) touchRender(runtime);
  } catch (err) {
    runtime.diagnostics.reportPickingIssue(err, 'click', 1000);
    touchRender(runtime);
  }
  return true;
}
