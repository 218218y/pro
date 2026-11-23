import type { Vector3Like } from '../../../types/three_like.js';
import type { AppContainer, GeometryLike, SketchPlacementPreviewArgsLike, ThreeLike } from '../../../types';
import type { DoorArchPoint } from '../../../types/maps.js';
import {
  doorArchCutEdges,
  doorArchOutline,
  intersectDoorContours,
} from './canvas_picking_door_edit_shared.js';
import type { DoorArchAction } from './canvas_picking_door_arch_actions.js';
import type { ArchSurface } from './canvas_picking_door_arch_target.js';
import {
  buildRectClearanceMeasurementEntries,
  resolveCellMeasurementLabelOutsets,
} from './canvas_picking_hover_clearance_measurements.js';

type PreviewMarker = {
  geometry: GeometryLike;
  material: unknown;
  parent: { worldToLocal(point: Vector3Like): Vector3Like };
  position: Vector3Like;
  scale: Vector3Like;
  quaternion: { identity(): void };
  userData: { __matAdd: unknown; __matRemove: unknown; __matAreaAdd: unknown; __matAreaRemove: unknown };
  visible?: boolean;
};

const baseGeometries = new WeakMap<PreviewMarker, GeometryLike>();

function readMarker(value: unknown): PreviewMarker | null {
  if (!value || typeof value !== 'object' || !('geometry' in value) || !('parent' in value)) return null;
  return value as PreviewMarker;
}

export function clearDoorArchPreview(value: unknown): void {
  const marker = readMarker(value);
  if (!marker) return;
  const base = baseGeometries.get(marker);
  if (!base) return;
  if (typeof marker.geometry.dispose === 'function') marker.geometry.dispose();
  marker.geometry = base;
  marker.visible = false;
  baseGeometries.delete(marker);
}

function ribbonTriangles(path: DoorArchPoint[], halfWidth: number): DoorArchPoint[] {
  const edges = path.map((point, index) => {
    const a = path[index - 1] ?? point;
    const b = path[index + 1] ?? point;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const x = (-(b.y - a.y) / length) * halfWidth;
    const y = ((b.x - a.x) / length) * halfWidth;
    return {
      left: { x: point.x + x, y: point.y + y },
      right: { x: point.x - x, y: point.y - y },
    };
  });
  const triangles: DoorArchPoint[] = [];
  for (let i = 1; i < edges.length; i++) {
    const a = edges[i - 1]!;
    const b = edges[i]!;
    triangles.push(a.left, a.right, b.left, b.left, a.right, b.right);
  }
  return triangles;
}

function archMeasurementPreview(
  App: AppContainer,
  surface: ArchSurface,
  high: DoorArchPoint,
  low: DoorArchPoint,
  z: number,
  op: DoorArchAction['kind']
): SketchPlacementPreviewArgsLike {
  const width = surface.rect.maxX - surface.rect.minX;
  const lineHeight = Math.max(0.0001, high.y - low.y);
  const centerY = (high.y + low.y) / 2;
  const textScale = 0.9;
  const { verticalLabelOutset } = resolveCellMeasurementLabelOutsets(textScale);
  const clearanceMeasurements = buildRectClearanceMeasurementEntries({
    containerMinX: surface.rect.minX,
    containerMaxX: surface.rect.maxX,
    containerMinY: surface.rect.minY,
    containerMaxY: surface.rect.maxY,
    targetCenterX: high.x,
    targetCenterY: centerY,
    targetWidth: width,
    targetHeight: lineHeight,
    z: z + 0.0025 * surface.face,
    styleKey: 'cell',
    textScale,
    verticalLabelOutset,
    faceSign: surface.face,
    viewFaceSign: surface.face,
    labelFaceSign: surface.face,
  });
  return {
    App,
    anchor: surface.anchor,
    anchorParent: surface.anchor,
    kind: 'rod',
    x: high.x,
    y: centerY,
    z,
    w: width,
    h: lineHeight,
    d: 0.004,
    woodThick: 0.004,
    op,
    showPrimaryBody: false,
    clearanceMeasurements,
  };
}

export function showDoorArchPreview(
  value: unknown,
  App: AppContainer,
  THREE: ThreeLike,
  action: DoorArchAction,
  setSketchPreview?: ((args: SketchPlacementPreviewArgsLike) => unknown) | null
): boolean {
  const marker = readMarker(value);
  if (!marker?.parent?.worldToLocal) return false;
  clearDoorArchPreview(marker);
  const vertices: number[] = [];
  const isCut = action.tool === 'cut';
  let measurement:
    { surface: ArchSurface; high: DoorArchPoint; low: DoorArchPoint; z: number; worldY: number } | undefined;
  for (const { surface, rect, profile } of action.slices) {
    const curves = isCut ? doorArchCutEdges(rect, profile) : null;
    const outline = doorArchOutline(rect, profile, surface.contour);
    const triangles = curves
      ? curves.flatMap(curve => ribbonTriangles(curve, action.kind === 'remove' ? 0.01 : 0.006))
      : intersectDoorContours(outline, surface.contour ?? outline);
    const z = surface.z + (isCut ? 0.018 : 0.008) * surface.face;
    for (const { x, y } of triangles) {
      const point = marker.parent.worldToLocal(surface.toWorld(new THREE.Vector3(x, y, z)));
      vertices.push(point.x, point.y, point.z);
    }
    if (action.tool !== 'mirror' && triangles.length) {
      const points = curves?.flat() ?? triangles;
      let high = points[0]!;
      let low = high;
      for (const point of points) {
        if (point.y > high.y) high = point;
        if (point.y < low.y) low = point;
      }
      if (!profile.shape) low = high;
      if (profile.shape === 'arch-down') high = low;
      const sign = profile.shape === 'arch-down' ? -1 : 1;
      const worldY = sign * surface.toWorld(new THREE.Vector3(high.x, high.y, z)).y;
      if (!measurement || worldY > measurement.worldY + 1e-8) measurement = { surface, high, low, z, worldY };
    }
  }
  if (!vertices.length) return false;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute?.('position', new THREE.Float32BufferAttribute(vertices, 3));
  baseGeometries.set(marker, marker.geometry);
  marker.geometry = geometry;
  marker.position.set(0, 0, 0);
  marker.scale.set(1, 1, 1);
  marker.quaternion.identity();
  const { __matAdd, __matRemove, __matAreaAdd, __matAreaRemove } = marker.userData;
  marker.material = isCut
    ? action.kind === 'remove'
      ? __matRemove
      : __matAdd
    : action.kind === 'remove'
      ? __matAreaRemove
      : __matAreaAdd;
  marker.visible = true;
  if (measurement) {
    const { surface, high, low, z } = measurement;
    setSketchPreview?.(archMeasurementPreview(App, surface, high, low, z, action.kind));
  }
  return true;
}
