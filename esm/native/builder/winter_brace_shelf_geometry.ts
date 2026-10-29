export function resolveWinterBraceShelfFrame(width: number, depth: number, frameWidthCm: number) {
  const requested = frameWidthCm / 100;
  if (![width, depth, requested].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Winter brace shelf requires positive finite dimensions and frame width');
  }
  // Small cells retain an opening rather than becoming a solid shelf.
  const rim = Math.min(requested, width / 4, depth / 4);
  return [
    { w: width, d: rim, x: 0, z: -(depth - rim) / 2 },
    { w: width, d: rim, x: 0, z: (depth - rim) / 2 },
    { w: rim, d: depth - 2 * rim, x: -(width - rim) / 2, z: 0 },
    { w: rim, d: depth - 2 * rim, x: (width - rim) / 2, z: 0 },
  ];
}

type FrameGeometry = {
  setAttribute(name: string, attribute: unknown): unknown;
  addGroup(start: number, count: number, materialIndex: number): unknown;
  computeBoundingBox(): unknown;
  computeBoundingSphere(): unknown;
};

type FrameThree = {
  BufferGeometry: new () => unknown;
  Float32BufferAttribute: new (array: number[], itemSize: number) => unknown;
};

// Emit only the boundary of the ring. Joined closed boxes leave coincident
// internal faces, and side caps flush with cabinet walls cause z-fighting.
// Outer faces retain BoxGeometry's +X, -X, +Y, -Y, +Z, -Z material indices.
// The opening always uses the shelf body material (+Y), so front-edge color
// and exposed-side edge banding cannot leak into the inner walls.
export function createWinterBraceShelfGeometry(
  THREE: FrameThree,
  w: number,
  h: number,
  d: number,
  frameWidthCm: number,
  exposedSide: 'left' | 'right' | 'both' | null = 'both'
) {
  const rim = resolveWinterBraceShelfFrame(w, d, frameWidthCm)[0]!.d;
  if (!Number.isFinite(h) || h <= 0) throw new Error('Winter brace shelf requires positive finite thickness');
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const geometry = new THREE.BufferGeometry() as FrameGeometry;
  type Point = readonly [number, number, number];
  const quad = (points: readonly Point[], normal: Point, materialIndex: number) => {
    const start = positions.length / 3;
    for (const index of [0, 1, 2, 0, 2, 3]) {
      const point = points[index]!;
      positions.push(...point);
      normals.push(...normal);
      // Continuous planar UVs avoid texture seams between the four top/bottom rims.
      uvs.push((point[0] + w / 2) / w, (point[2] + d / 2) / d);
    }
    geometry.addGroup(start, 6, materialIndex);
  };
  const outer: readonly (readonly [number, number])[] = [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ];
  const inner: readonly (readonly [number, number])[] = [
    [-w / 2 + rim, -d / 2 + rim],
    [w / 2 - rim, -d / 2 + rim],
    [w / 2 - rim, d / 2 - rim],
    [-w / 2 + rim, d / 2 - rim],
  ];
  const edgeNormals: readonly Point[] = [
    [0, 0, -1],
    [1, 0, 0],
    [0, 0, 1],
    [-1, 0, 0],
  ];
  const outerMaterials = [5, 0, 4, 1];
  const shelfBodyMaterialIndex = 2;
  const at = (point: readonly [number, number], y: number): Point => [point[0], y, point[1]];
  for (let edge = 0; edge < 4; edge++) {
    const next = (edge + 1) % 4;
    const oa = outer[edge]!,
      ob = outer[next]!,
      ia = inner[edge]!,
      ib = inner[next]!;
    quad([at(oa, h / 2), at(ia, h / 2), at(ib, h / 2), at(ob, h / 2)], [0, 1, 0], 2);
    quad([at(oa, -h / 2), at(ob, -h / 2), at(ib, -h / 2), at(ia, -h / 2)], [0, -1, 0], 3);
    const normal = edgeNormals[edge]!;
    const attachedRight = edge === 1 && exposedSide !== 'right' && exposedSide !== 'both';
    const attachedLeft = edge === 3 && exposedSide !== 'left' && exposedSide !== 'both';
    if (!attachedRight && !attachedLeft) {
      quad([at(oa, h / 2), at(ob, h / 2), at(ob, -h / 2), at(oa, -h / 2)], normal, outerMaterials[edge]!);
    }
    quad(
      [at(ia, h / 2), at(ia, -h / 2), at(ib, -h / 2), at(ib, h / 2)],
      [-normal[0], 0, -normal[2]],
      shelfBodyMaterialIndex
    );
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
