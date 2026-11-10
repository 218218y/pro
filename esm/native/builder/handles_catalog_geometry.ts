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

  function roundedPrism(width: number, height: number, depth: number, radius: number): Geometry {
    const x = width / 2;
    const y = height / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-x + radius, -y);
    shape.lineTo(x - radius, -y);
    shape.quadraticCurveTo(x, -y, x, -y + radius);
    shape.lineTo(x, y - radius);
    shape.quadraticCurveTo(x, y, x - radius, y);
    shape.lineTo(-x + radius, y);
    shape.quadraticCurveTo(-x, y, -x, y - radius);
    shape.lineTo(-x, -y + radius);
    shape.quadraticCurveTo(-x, -y, -x + radius, -y);
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 5 });
  }

  function roundGrip(): Geometry {
    const radius = height / 2;
    const end = width / 2;
    const chamfer = 0.0008;
    return revolveHandleProfile(
      THREE,
      [
        [0, -end],
        [radius - chamfer, -end],
        [radius, -end + chamfer],
        [radius, end - chamfer],
        [radius - chamfer, end],
        [0, end],
      ],
      28
    );
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
          geometryFor('post', () => new THREE.BoxGeometry(0.016, height - 0.002, depth - 0.005)),
          x,
          0,
          (depth - 0.005) / 2
        );
      }
      mesh(
        geometryFor('grip', () => roundedPrism(width, height, 0.006, 0.002)),
        0,
        0,
        depth - 0.006
      );
      break;
    case 'bar_round':
      for (const x of [-spacing / 2, spacing / 2]) post(x, height / 2, depth - height / 2);
      mesh(geometryFor('grip', roundGrip), 0, 0, depth - height / 2, 0, Math.PI / 2);
      break;
    case 'bow': {
      const arch = geometryFor('grip', () => {
        const half = width / 2;
        const shape = new THREE.Shape();
        shape.moveTo(-half, 0);
        shape.quadraticCurveTo(0, depth * 2, half, 0);
        const innerFoot = spacing - half;
        shape.lineTo(innerFoot, 0);
        shape.quadraticCurveTo(0, (depth - 0.008) * 2, -innerFoot, 0);
        shape.closePath();
        return new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 16 });
      });
      mesh(arch, 0, height / 2, 0, Math.PI / 2);
      break;
    }
    case 'knob_round': {
      const rounded = geometryFor('grip', () => {
        const capDepth = 0.008;
        const startAngle = -Math.PI / 3;
        const rootZ = depth - capDepth;
        const points: ProfilePoint[] = [
          [0, 0],
          [0.008, 0],
          [0.0055, 0.005],
          [0.0055, rootZ + capDepth * Math.sin(startAngle) - 0.002],
        ];
        for (let i = 0; i <= 25; i++) {
          const angle = startAngle + ((Math.PI / 2 - startAngle) * i) / 25;
          points.push([(width / 2) * Math.cos(angle), rootZ + capDepth * Math.sin(angle)]);
        }
        return revolveHandleProfile(THREE, points, 32);
      });
      mesh(rounded, 0, 0, 0, Math.PI / 2);
      break;
    }
    case 'knob_square':
      post(0, 0.008, depth - 0.009);
      mesh(
        geometryFor('grip', () => roundedPrism(width, height, 0.01, 0.002)),
        0,
        0,
        depth - 0.01
      );
      break;
    case 'knob_t':
      post(0, 0.0048, depth - height / 2);
      mesh(geometryFor('grip', roundGrip), 0, 0, depth - height / 2, 0, Math.PI / 2);
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

type ProfilePoint = readonly [radius: number, axis: number];

function revolveHandleProfile(
  THREE: ThreeLike,
  profile: readonly ProfilePoint[],
  segments: number
): Geometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const [radius, axis] of profile) {
    for (let col = 0; col < segments; col++) {
      const angle = (2 * Math.PI * col) / segments;
      positions.push(radius * Math.sin(angle), axis, radius * Math.cos(angle));
    }
  }
  for (let row = 0; row < profile.length - 1; row++) {
    for (let col = 0; col < segments; col++) {
      const a = row * segments + col;
      const next = row * segments + ((col + 1) % segments);
      indices.push(a, next, a + segments, a + segments, next, next + segments);
    }
  }
  return buildHandleGeometry(THREE, positions, indices);
}

function buildHandleGeometry(THREE: ThreeLike, positions: number[], indices: number[]): Geometry {
  const geometry = new THREE.BufferGeometry();
  if (typeof geometry.setAttribute !== 'function' || typeof geometry.setIndex !== 'function') {
    throw new TypeError('[handles] curved handles require indexed buffer geometry');
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals?.();
  return geometry;
}

/** Hollow half-dome. The bottom remains open for fingers and the rim meets the front. */
function createCupGeometry(THREE: ThreeLike, width: number, height: number, depth: number): Geometry {
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
  return buildHandleGeometry(THREE, positions, indices);
}
