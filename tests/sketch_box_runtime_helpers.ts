import { readFile } from 'node:fs/promises';

import { createBuilderRenderInteriorSketchOps } from '../esm/native/builder/render_interior_sketch_ops.ts';

export async function readSourceFiles(paths: string[]): Promise<string> {
  return (await Promise.all(paths.map(path => readFile(new URL(path, import.meta.url), 'utf8')))).join('\n');
}

export async function readSketchBoxFrontsBundle(): Promise<string> {
  return readSourceFiles([
    '../esm/native/builder/render_interior_sketch_boxes_fronts.ts',
    '../esm/native/builder/render_interior_sketch_boxes_fronts_support.ts',
    '../esm/native/builder/render_interior_sketch_boxes_fronts_door_contracts.ts',
    '../esm/native/builder/render_interior_sketch_boxes_fronts_door_layout.ts',
    '../esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts',
    '../esm/native/builder/render_interior_sketch_boxes_fronts_door_visuals.ts',
    '../esm/native/builder/render_interior_sketch_boxes_fronts_doors.ts',
    '../esm/native/builder/render_interior_sketch_boxes_fronts_drawers.ts',
  ]);
}

export class FakeBoxGeometry {
  parameters: { width: number; height: number; depth: number };
  boundingBox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } | null;
  constructor(width: number, height: number, depth: number) {
    this.parameters = { width, height, depth };
    this.boundingBox = null;
  }
  computeBoundingBox() {
    const { width, height, depth } = this.parameters;
    this.boundingBox = {
      min: { x: -width / 2, y: -height / 2, z: -depth / 2 },
      max: { x: width / 2, y: height / 2, z: depth / 2 },
    };
  }
  translate(..._args: number[]) {}
}

export class FakeCylinderGeometry extends FakeBoxGeometry {}

export class FakePositionAttribute {
  needsUpdate = false;
  readonly xs: number[];
  readonly ys: number[];
  readonly zs: number[];
  constructor(xs: number[], ys: number[], zs: number[]) {
    this.xs = xs;
    this.ys = ys;
    this.zs = zs;
  }
  get count() {
    return this.xs.length;
  }
  getX(index: number) {
    return this.xs[index] ?? 0;
  }
  getY(index: number) {
    return this.ys[index] ?? 0;
  }
  getZ(index: number) {
    return this.zs[index] ?? 0;
  }
  setZ(index: number, value: number) {
    this.zs[index] = value;
  }
  translate(dx: number, dy: number, dz: number) {
    for (let i = 0; i < this.xs.length; i++) {
      this.xs[i] += dx;
      this.ys[i] += dy;
      this.zs[i] += dz;
    }
  }
}

export class FakeExtrudeGeometry extends FakeBoxGeometry {
  positionAttr: FakePositionAttribute;
  index: { array: number[] };
  constructor(shape: FakeShape, opts: { depth?: number }) {
    const depth = Math.max(0.001, Number(opts?.depth) || 0.001);
    const points =
      shape.points.length >= 3
        ? shape.points
        : [
            { x: 0, y: 0 },
            { x: 0.02, y: 0 },
            { x: 0.02, y: 0.02 },
            { x: 0, y: 0.02 },
          ];
    const xs = points.map(point => point.x).concat(points.map(point => point.x));
    const ys = points.map(point => point.y).concat(points.map(point => point.y));
    const zs = new Array(points.length).fill(-depth / 2).concat(new Array(points.length).fill(depth / 2));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    super(Math.max(0.001, maxX - minX), Math.max(0.001, maxY - minY), depth);
    this.positionAttr = new FakePositionAttribute(xs, ys, zs);
    this.index = {
      array:
        points.length >= 3
          ? [0, 1, 2, points.length, points.length + 1, points.length + 2, 0, points.length, 1]
          : [0, 1, 2],
    };
  }
  translate(x: number, y: number, z: number) {
    this.positionAttr.translate(x, y, z);
  }
  getAttribute(name: string) {
    return name === 'position' ? this.positionAttr : null;
  }
  getIndex() {
    return this.index;
  }
  setIndex(value: number[]) {
    this.index = { array: value.slice() };
  }
  computeVertexNormals() {}
  computeBoundingBox() {
    const xs = this.positionAttr.xs;
    const ys = this.positionAttr.ys;
    const zs = this.positionAttr.zs;
    this.boundingBox = {
      min: { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) },
      max: { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) },
    };
  }
}

export class FakeShape {
  points: Array<{ x: number; y: number }> = [];
  moveTo(x: number, y: number) {
    this.points.push({ x, y });
  }
  lineTo(x: number, y: number) {
    this.points.push({ x, y });
  }
}

export class FakeMaterial {
  __keepMaterial?: boolean;
  readonly options: Record<string, unknown>;
  constructor(options: Record<string, unknown> = {}) {
    this.options = options;
  }
}

export class FakeVector3 {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

export class FakeNode {
  parent: FakeNode | null = null;
  children: FakeNode[] = [];
  userData: Record<string, unknown> = {};
  position = new FakeVector3();
  rotation = new FakeVector3();
  scale = new FakeVector3(1, 1, 1);
  visible = true;
  renderOrder = 0;
  add(child: FakeNode) {
    child.parent = this;
    this.children.push(child);
  }
  remove(child: FakeNode) {
    this.children = this.children.filter(it => it !== child);
    child.parent = null;
  }
  traverse(fn: (node: unknown) => void) {
    fn(this);
    for (const child of this.children) child.traverse(fn);
  }
  updateWorldMatrix() {}
  updateMatrixWorld() {}
  worldToLocal<T>(vec: T) {
    return vec;
  }
}

export class FakeMesh extends FakeNode {
  isMesh = true;
  geometry: FakeBoxGeometry;
  material: FakeMaterial;
  constructor(geometry: FakeBoxGeometry, material: FakeMaterial) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

export class FakeGroup extends FakeNode {}

export class FakeBox3 {
  min = { x: Infinity, y: Infinity, z: Infinity };
  max = { x: -Infinity, y: -Infinity, z: -Infinity };
  makeEmpty() {
    this.min = { x: Infinity, y: Infinity, z: Infinity };
    this.max = { x: -Infinity, y: -Infinity, z: -Infinity };
    return this;
  }
  copy(box: FakeBox3) {
    this.min = { ...box.min };
    this.max = { ...box.max };
    return this;
  }
  union(box: FakeBox3) {
    this.min.x = Math.min(this.min.x, box.min.x);
    this.min.y = Math.min(this.min.y, box.min.y);
    this.min.z = Math.min(this.min.z, box.min.z);
    this.max.x = Math.max(this.max.x, box.max.x);
    this.max.y = Math.max(this.max.y, box.max.y);
    this.max.z = Math.max(this.max.z, box.max.z);
    return this;
  }
  setFromObject(obj: unknown) {
    const node = obj as FakeMesh;
    const geometry = node?.geometry;
    if (!geometry) return this.makeEmpty();
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    if (!bounds) return this.makeEmpty();
    this.min = {
      x: bounds.min.x + node.position.x,
      y: bounds.min.y + node.position.y,
      z: bounds.min.z + node.position.z,
    };
    this.max = {
      x: bounds.max.x + node.position.x,
      y: bounds.max.y + node.position.y,
      z: bounds.max.z + node.position.z,
    };
    return this;
  }
}

export function getWorldY(node: FakeNode): number {
  let y = node.position.y;
  let current = node.parent;
  while (current) {
    y += current.position.y;
    current = current.parent;
  }
  return y;
}

export const THREE = {
  Box3: FakeBox3,
  Vector3: FakeVector3,
  Group: FakeGroup,
  Mesh: FakeMesh,
  BoxGeometry: FakeBoxGeometry,
  CylinderGeometry: FakeCylinderGeometry,
  ExtrudeGeometry: FakeExtrudeGeometry,
  Shape: FakeShape,
  MeshStandardMaterial: FakeMaterial,
  MeshBasicMaterial: FakeMaterial,
};

type HarnessOptions = {
  bodyWidth?: number;
  bodyHeight?: number;
  bodyDepth?: number;
  bodyCenterY?: number;
  ops?: Record<string, unknown>;
  applyInternalDrawersOps?: (args: unknown) => unknown;
};

export function createSketchInteriorHarness(options: HarnessOptions = {}) {
  const wardrobeGroup = new FakeGroup();
  const body = new FakeMesh(
    new FakeBoxGeometry(options.bodyWidth ?? 1.4, options.bodyHeight ?? 2.4, options.bodyDepth ?? 0.6),
    new FakeMaterial()
  );
  body.position.set(0, options.bodyCenterY ?? 1.2, 0);
  body.userData.partId = 'wardrobe_body';
  wardrobeGroup.add(body);

  const boards: FakeMesh[] = [];
  const renderedPartIds: string[] = [];
  const { applyInteriorSketchExtras } = createBuilderRenderInteriorSketchOps({
    app: (ctx: unknown) => (ctx as Record<string, unknown>).App as never,
    ops: () => options.ops ?? {},
    wardrobeGroup: () => wardrobeGroup as never,
    doors: () => [],
    markSplitHoverPickablesDirty: () => {},
    isFn: (v: unknown): v is (...args: never[]) => unknown => typeof v === 'function',
    asObject: <T extends object = Record<string, unknown>>(x: unknown) =>
      x && typeof x === 'object' ? (x as T) : null,
    matCache: () => ({}),
    three: (value: unknown) => value,
    renderOpsHandleCatch: (_app, _op, err) => {
      throw err;
    },
    assertTHREE: () => THREE,
    applyInternalDrawersOps: options.applyInternalDrawersOps ?? (() => undefined),
  });

  const createBoard = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: FakeMaterial,
    partId: string
  ) => {
    const mesh = new FakeMesh(new FakeBoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.userData.partId = partId;
    boards.push(mesh);
    renderedPartIds.push(partId);
    wardrobeGroup.add(mesh);
    return mesh;
  };

  function makeArgs(overrides: Record<string, unknown> = {}) {
    return {
      App: {},
      THREE,
      cfg: {},
      createBoard,
      wardrobeGroup,
      effectiveBottomY: 0,
      effectiveTopY: 2.3,
      innerW: 1.2,
      woodThick: 0.018,
      internalDepth: 0.6,
      internalCenterX: 0,
      internalZ: 0,
      moduleIndex: 0,
      modulesLength: 1,
      moduleKey: '0',
      currentShelfMat: new FakeMaterial(),
      bodyMat: new FakeMaterial(),
      getPartMaterial: () => new FakeMaterial(),
      addOutlines: () => {},
      showContentsEnabled: false,
      ...overrides,
    };
  }

  return {
    wardrobeGroup,
    boards,
    renderedPartIds,
    applyInteriorSketchExtras,
    createBoard,
    makeArgs,
  };
}
