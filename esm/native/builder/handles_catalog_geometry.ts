import type { BuilderOutlineFn, ThreeLike } from '../../../types';
import { HANDLE_CATALOG, getSurfaceHandleFootprint, readHandleSizeMm } from '../../shared/handle_catalog.js';
import type { SurfaceHandleType } from '../../shared/handle_catalog.js';
import type { NodeLike } from './handles_shared.js';

type Geometry = InstanceType<ThreeLike['BoxGeometry']>;

/** Meshes are authored horizontally, with the mounting plane at local z=0. */
export function addCatalogHandleGeometry(args: {
  THREE: ThreeLike;
  group: NodeLike;
  type: SurfaceHandleType;
  sizeMm: unknown;
  cache: Map<string, Geometry>;
  isDrawer: boolean;
  material: unknown;
  addOutlines: BuilderOutlineFn;
}): void {
  const { THREE, group, type, sizeMm, cache, isDrawer, material, addOutlines } = args;
  const footprint = getSurfaceHandleFootprint(type, 'drawer', sizeMm);
  const { width, height, depth } = footprint;
  const grip = new THREE.Group();
  if (!isDrawer && HANDLE_CATALOG[type].sizesMm.length > 0) {
    grip.rotation.z = Math.PI / 2;
  }
  group.add(grip);

  const size = readHandleSizeMm(type, sizeMm);
  // Only catalog sizes can reach this per-app cache. A geometry is immutable after registration.
  function geometryFor(part: string, create: () => Geometry): Geometry {
    const key = `${type}:${size ?? 'fixed'}:${part}`;
    const existing = cache.get(key);
    if (existing) return existing;
    const geometry = create();
    geometry.userData = { ...geometry.userData, isCached: true };
    cache.set(key, geometry);
    return geometry;
  }

  function mesh(geometry: Geometry, x: number, y: number, z: number, rx = 0, rz = 0): void {
    const part = new THREE.Mesh(geometry, material);
    part.userData = { __keepMaterial: true };
    part.position.set(x, y, z);
    part.rotation.x = rx;
    part.rotation.z = rz;
    addOutlines(part);
    grip.add(part);
  }

  function post(x: number, radius: number, length: number): void {
    const geometry = geometryFor('post', () => new THREE.CylinderGeometry(radius, radius, length, 16));
    mesh(geometry, x, 0, length / 2, Math.PI / 2);
  }

  const spacing = (size ?? 0) / 1000;
  switch (type) {
    case 'standard':
      mesh(
        geometryFor('grip', () => new THREE.BoxGeometry(width, height, depth)),
        0,
        0,
        depth / 2
      );
      break;
    case 'bar_slim':
      for (const x of [-spacing / 2, spacing / 2]) {
        mesh(
          geometryFor('post', () => new THREE.BoxGeometry(0.016, height, 0.024)),
          x,
          0,
          0.012
        );
      }
      mesh(
        geometryFor('grip', () => new THREE.BoxGeometry(width, height, 0.006)),
        0,
        0,
        depth - 0.003
      );
      break;
    case 'bar_round':
      for (const x of [-spacing / 2, spacing / 2]) post(x, height / 2, 0.027);
      mesh(
        geometryFor('grip', () => new THREE.CylinderGeometry(height / 2, height / 2, width, 20)),
        0,
        0,
        depth - height / 2,
        0,
        Math.PI / 2
      );
      break;
    case 'bow': {
      const arch = geometryFor('grip', () => {
        const half = width / 2;
        const shape = new THREE.Shape();
        shape.moveTo(-half, 0);
        shape.quadraticCurveTo(0, depth * 2, half, 0);
        shape.lineTo(spacing / 2 - 0.006, 0);
        shape.quadraticCurveTo(0, (depth - 0.007) * 2, -spacing / 2 + 0.006, 0);
        shape.closePath();
        return new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 16 });
      });
      mesh(arch, 0, height / 2, 0, Math.PI / 2);
      break;
    }
    case 'knob_round':
      post(0, 0.009, 0.018);
      mesh(
        geometryFor('grip', () => new THREE.CylinderGeometry(width / 2 - 0.003, width / 2, 0.009, 28)),
        0,
        0,
        depth - 0.0045,
        Math.PI / 2
      );
      break;
    case 'knob_t':
      post(0, height / 2, 0.025);
      mesh(
        geometryFor('grip', () => new THREE.CylinderGeometry(height / 2, height / 2, width, 20)),
        0,
        0,
        depth - height / 2,
        0,
        Math.PI / 2
      );
      break;
    case 'cup':
      mesh(
        geometryFor('grip', () => createCupGeometry(THREE, width, height, depth)),
        0,
        0,
        0
      );
      break;
  }
}

/** Hollow half-dome. The bottom remains open for fingers and the rim meets the front. */
function createCupGeometry(THREE: ThreeLike, width: number, height: number, depth: number): Geometry {
  const geometry = new THREE.BufferGeometry();
  if (typeof geometry.setAttribute !== 'function' || typeof geometry.setIndex !== 'function') {
    throw new TypeError('[handles] cup requires indexed buffer geometry');
  }
  const columns = 24;
  const rows = 8;
  const positions: number[] = [];
  const indices: number[] = [];
  const stride = columns + 1;
  const skinSize = stride * (rows + 1);

  for (const inset of [0, 0.002]) {
    for (let row = 0; row <= rows; row++) {
      const angle = Math.PI * (0.5 - row / (2 * rows));
      const radius = Math.cos(angle);
      for (let col = 0; col <= columns; col++) {
        const sweep = (Math.PI * col) / columns;
        positions.push(
          (width / 2 - inset) * radius * Math.cos(sweep),
          (height - inset) * radius * Math.sin(sweep) - height / 2,
          (depth - inset) * Math.sin(angle)
        );
      }
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const a = row * stride + col;
      const b = a + stride;
      indices.push(a, b, b + 1, a, b + 1, a + 1);
      indices.push(
        a + skinSize,
        b + 1 + skinSize,
        b + skinSize,
        a + skinSize,
        a + 1 + skinSize,
        b + 1 + skinSize
      );
    }
  }
  const joinRim = (a: number, b: number) => {
    indices.push(a, b, b + skinSize, a, b + skinSize, a + skinSize);
  };
  for (let row = 0; row < rows; row++) {
    joinRim(row * stride, (row + 1) * stride);
    joinRim((row + 1) * stride + columns, row * stride + columns);
  }
  for (let col = 0; col < columns; col++) joinRim(rows * stride + col + 1, rows * stride + col);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals?.();
  return geometry;
}
