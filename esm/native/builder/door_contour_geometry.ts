import type { ThreeLike } from '../../../types';
import type { DoorArchPoint } from '../../../types/maps.js';

export function readDoorContourPoints(value: unknown): DoorArchPoint[] | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  const points: DoorArchPoint[] = [];
  const input: unknown[] = value;
  for (const point of input) {
    if (
      !point ||
      typeof point !== 'object' ||
      !('x' in point) ||
      !('y' in point) ||
      typeof point.x !== 'number' ||
      typeof point.y !== 'number' ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y)
    )
      return null;
    points.push({ x: point.x, y: point.y });
  }
  return points;
}

function createDoorShape(THREE: ThreeLike, points: readonly DoorArchPoint[]) {
  const shape = new THREE.Shape();
  const [first, ...rest] = points;
  if (!first) throw new RangeError('A door contour requires points');
  shape.moveTo(first.x, first.y);
  for (const point of rest) shape.lineTo(point.x, point.y);
  shape.lineTo(first.x, first.y);
  return shape;
}

export function createDoorContourGeometry(THREE: ThreeLike, points: readonly DoorArchPoint[], depth: number) {
  return createDoorContourRegionsGeometry(THREE, [points], depth);
}

export function createDoorContourRegionsGeometry(
  THREE: ThreeLike,
  regions: readonly (readonly DoorArchPoint[])[],
  depth: number
) {
  const shapes = regions.map(points => createDoorShape(THREE, points));
  const shape = shapes.length === 1 ? shapes[0] : shapes;
  if (depth === 0) return new THREE.ShapeGeometry(shape);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate?.(0, 0, -depth / 2);
  return geometry;
}
