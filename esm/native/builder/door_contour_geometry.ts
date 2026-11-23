import type { ThreeLike } from '../../../types';
import type { DoorArchPoint } from '../../../types/maps.js';

export function createDoorContourGeometry(THREE: ThreeLike, points: readonly DoorArchPoint[], depth: number) {
  const shape = new THREE.Shape();
  const [first, ...rest] = points;
  if (!first) throw new RangeError('A door contour requires points');
  shape.moveTo(first.x, first.y);
  for (const point of rest) shape.lineTo(point.x, point.y);
  shape.lineTo(first.x, first.y);
  if (depth === 0) return new THREE.ShapeGeometry(shape);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate?.(0, 0, -depth / 2);
  return geometry;
}
