import type { Vector3Like } from '../../../types/three_like.js';
import type { GeometryLike, ThreeLike } from '../../../types';
import { doorArchOutline, sampleDoorArch } from './canvas_picking_door_edit_shared.js';
import type { DoorArchAction } from './canvas_picking_door_arch_actions.js';

type PreviewMarker = {
  geometry: GeometryLike;
  material: unknown;
  parent: { worldToLocal(point: Vector3Like): Vector3Like };
  position: Vector3Like;
  scale: Vector3Like;
  quaternion: { identity(): void };
  userData: { __matAdd: unknown; __matRemove: unknown };
  visible?: boolean;
  frustumCulled: boolean;
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

export function showDoorArchPreview(value: unknown, THREE: ThreeLike, action: DoorArchAction): boolean {
  const marker = readMarker(value);
  if (!marker?.parent?.worldToLocal) return false;
  clearDoorArchPreview(marker);
  const vertices: number[] = [];
  for (const { surface, rect, profile } of action.slices) {
    const path = action.tool === 'cut' ? sampleDoorArch(rect, profile) : doorArchOutline(rect, profile);
    if (action.tool !== 'cut' && path[0]) path.push(path[0]);
    const z = surface.z + 0.007 * surface.face;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      if (length < 1e-7) continue;
      const rx = (-dy / length) * 0.002;
      const ry = (dx / length) * 0.002;
      const corners = [
        [a.x + rx, a.y + ry],
        [a.x - rx, a.y - ry],
        [b.x + rx, b.y + ry],
        [b.x - rx, b.y - ry],
      ];
      const points = corners.map(([x, y]) =>
        marker.parent.worldToLocal(surface.toWorld(new THREE.Vector3(x, y, z)))
      );
      for (const index of [0, 1, 2, 2, 1, 3]) {
        const point = points[index];
        if (point) vertices.push(point.x, point.y, point.z);
      }
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
  marker.material = action.kind === 'remove' ? marker.userData.__matRemove : marker.userData.__matAdd;
  marker.visible = true;
  return true;
}
