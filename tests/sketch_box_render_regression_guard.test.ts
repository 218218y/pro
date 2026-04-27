import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuilderRenderInteriorSketchOps } from '../esm/native/builder/render_interior_sketch_ops.ts';

class FakeBoxGeometry {
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
}

class FakeCylinderGeometry extends FakeBoxGeometry {}

class FakeMaterial {
  __keepMaterial?: boolean;
  constructor(public readonly options: Record<string, unknown> = {}) {}
}

class FakeNode {
  children: FakeNode[] = [];
  userData: Record<string, unknown> = {};
  position = {
    x: 0,
    y: 0,
    z: 0,
    set: (x: number, y: number, z: number) => {
      this.position.x = x;
      this.position.y = y;
      this.position.z = z;
    },
  };
  rotation = { x: 0, y: 0, z: 0 };
  renderOrder = 0;
  add(child: FakeNode) {
    this.children.push(child);
  }
  traverse(fn: (node: unknown) => void) {
    fn(this);
    for (const child of this.children) child.traverse(fn);
  }
}

class FakeMesh extends FakeNode {
  constructor(
    public geometry: FakeBoxGeometry,
    public material: FakeMaterial
  ) {
    super();
  }
}

class FakeGroup extends FakeNode {}

const THREE = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  BoxGeometry: FakeBoxGeometry,
  CylinderGeometry: FakeCylinderGeometry,
  MeshStandardMaterial: FakeMaterial,
  MeshBasicMaterial: FakeMaterial,
};

test('sketch box render stays alive when special door helpers are enabled', () => {
  const wardrobeGroup = new FakeGroup();
  const boards: FakeMesh[] = [];
  const doorVisualCalls: unknown[][] = [];
  const doorsRuntime: unknown[] = [];

  const { applyInteriorSketchExtras } = createBuilderRenderInteriorSketchOps({
    app: (ctx: unknown) => (ctx as Record<string, unknown>).App as Record<string, unknown>,
    ops: () => ({}),
    wardrobeGroup: () => wardrobeGroup,
    doors: () => doorsRuntime,
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
    applyInternalDrawersOps: () => undefined,
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
    wardrobeGroup.add(mesh);
    return mesh;
  };

  const createDoorVisual = (...args: unknown[]) => {
    doorVisualCalls.push(args);
    return new FakeGroup();
  };

  const App = {} as Record<string, unknown>;
  const ok = applyInteriorSketchExtras({
    App,
    THREE,
    cfg: { isMultiColorMode: true },
    sketchExtras: {
      boxes: [
        {
          id: 'b1',
          heightM: 0.6,
          widthM: 0.7,
          depthM: 0.5,
          yNorm: 0.5,
          xNorm: 0.5,
          doors: [{ enabled: true, id: 'doorA', hinge: 'left' }],
        },
      ],
    },
    createBoard,
    wardrobeGroup,
    effectiveBottomY: 0,
    effectiveTopY: 2,
    innerW: 1,
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
    getPartColorValue: () => 'mirror',
    createDoorVisual,
    addOutlines: () => {},
    showContentsEnabled: false,
  });

  assert.equal(ok, true);
  assert.ok(boards.length >= 5, 'expected sketch box boards to render');
  assert.equal(doorVisualCalls.length, 1, 'expected special door visual to render once');
  assert.equal(doorsRuntime.length, 1, 'expected hinged door runtime entry');
});
