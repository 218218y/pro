import test from 'node:test';
import assert from 'node:assert/strict';

import { applySketchPlacementMeasurements } from '../esm/native/builder/render_preview_sketch_measurements.ts';
import { createRenderPreviewSketchShared } from '../esm/native/builder/render_preview_sketch_shared.ts';

type AnyRecord = Record<string, any>;

class FakeVector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class FakeBufferGeometry {
  points: FakeVector3[] = [];

  setFromPoints(points: FakeVector3[]) {
    this.points = points;
    return this;
  }
}

class FakeLineBasicMaterial {
  userData: AnyRecord = {};
  constructor(public opts: AnyRecord) {}
}

class FakeMeshBasicMaterial {
  userData: AnyRecord = {};
  constructor(public opts: AnyRecord) {}
}

class FakePlaneGeometry {
  constructor(
    public width = 1,
    public height = 1
  ) {}
}

class FakeNode {
  parent: FakeGroup | null = null;
  userData: AnyRecord = {};
  visible = false;
  renderOrder = 0;
  raycast() {}
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
  scale = {
    x: 1,
    y: 1,
    z: 1,
    set: (x: number, y: number, z: number) => {
      this.scale.x = x;
      this.scale.y = y;
      this.scale.z = z;
    },
  };
}

class FakeLine extends FakeNode {
  constructor(
    public geometry: unknown,
    public material: unknown
  ) {
    super();
  }
}

class FakeMesh extends FakeNode {
  constructor(
    public geometry: unknown,
    public material: unknown
  ) {
    super();
  }
  add() {}
}

class FakeGroup extends FakeNode {
  isGroup = true;
  children: unknown[] = [];

  add(...objs: any[]) {
    for (const obj of objs) {
      if (!obj) continue;
      obj.parent = this;
      this.children.push(obj);
    }
  }
}

class FakeCanvasTexture {
  userData: AnyRecord = {};
  constructor(public canvas: unknown) {}
}

class FakeSpriteMaterial {
  userData: AnyRecord = {};
  constructor(public opts: AnyRecord) {}
}

function createCanvasLike() {
  return {
    width: 0,
    height: 0,
    getContext(kind: '2d') {
      if (kind !== '2d') return null;
      return {
        fillStyle: '',
        font: '',
        textAlign: 'center' as const,
        textBaseline: 'middle' as const,
        fillRect() {},
        fillText() {},
      };
    },
  };
}

function createApp() {
  return {
    deps: {
      THREE: {
        CanvasTexture: FakeCanvasTexture,
        SpriteMaterial: FakeSpriteMaterial,
      },
    },
    services: {
      builder: {
        renderOps: {},
      },
      platform: {
        util: {},
        createCanvas: () => createCanvasLike(),
      },
    },
  } as AnyRecord;
}

test('sketch placement measurements keep label flags fixed on the cabinet front plane instead of billboarding sprites', () => {
  const shared = createRenderPreviewSketchShared({
    asObject<T extends object = AnyRecord>(value: unknown): T | null {
      return value && typeof value === 'object' ? (value as T) : null;
    },
  });
  const g = new FakeGroup();
  const THREE = {
    BufferGeometry: FakeBufferGeometry,
    Group: FakeGroup,
    Line: FakeLine,
    LineBasicMaterial: FakeLineBasicMaterial,
    Mesh: FakeMesh,
    MeshBasicMaterial: FakeMeshBasicMaterial,
    PlaneGeometry: FakePlaneGeometry,
    Vector3: FakeVector3,
    DoubleSide: 'double-side',
  };

  applySketchPlacementMeasurements({
    App: createApp() as never,
    input: {
      clearanceMeasurements: [
        {
          startX: 0,
          startY: 0,
          endX: 0,
          endY: 0.8,
          z: 0.02,
          label: '80 ס"מ',
          styleKey: 'cell',
          textScale: 0.9,
        },
      ],
    } as never,
    THREE,
    g: g as never,
    shared,
  });

  assert.equal(g.children.length, 1);
  const measurementGroup = g.children[0] as FakeGroup;
  assert.equal(measurementGroup.children.length, 2);
  assert.equal(measurementGroup.userData.__keepMaterialSubtree, true);

  const line = measurementGroup.children[0] as FakeLine;
  const label = measurementGroup.children[1] as FakeMesh;

  assert.ok(line.geometry instanceof FakeBufferGeometry);
  assert.ok(label.geometry instanceof FakePlaneGeometry);
  assert.equal((label.material as FakeMeshBasicMaterial).opts.side, 'double-side');
  assert.equal('map' in (label.material as FakeMeshBasicMaterial).opts, true);
  assert.equal(label.userData.__keepMaterial, true);
  assert.equal(label.position.z > line.position.z, true);
  assert.deepEqual([label.scale.x, label.scale.y, label.scale.z], [0.432, 0.216, 1]);
});

test('sketch placement measurements render neighbor labels with their own style and honor explicit edge anchor positions', () => {
  const shared = createRenderPreviewSketchShared({
    asObject<T extends object = AnyRecord>(value: unknown): T | null {
      return value && typeof value === 'object' ? (value as T) : null;
    },
  });
  const g = new FakeGroup();
  const THREE = {
    BufferGeometry: FakeBufferGeometry,
    Group: FakeGroup,
    Line: FakeLine,
    LineBasicMaterial: FakeLineBasicMaterial,
    Mesh: FakeMesh,
    MeshBasicMaterial: FakeMeshBasicMaterial,
    PlaneGeometry: FakePlaneGeometry,
    Vector3: FakeVector3,
    DoubleSide: 'double-side',
  };

  applySketchPlacementMeasurements({
    App: createApp() as never,
    input: {
      clearanceMeasurements: [
        {
          startX: 0.62,
          startY: 0.45,
          endX: 0.62,
          endY: 1.45,
          z: 0.02,
          label: '100 ס"מ',
          labelX: 0.62,
          labelY: 1.45,
          styleKey: 'cell',
          textScale: 0.82,
        },
        {
          startX: 0.54,
          startY: 0.8,
          endX: 0.54,
          endY: 1.08,
          z: 0.02,
          label: '28 ס"מ',
          labelX: 0.54,
          labelY: 1.08,
          styleKey: 'neighbor',
          textScale: 0.72,
        },
      ],
    } as never,
    THREE,
    g: g as never,
    shared,
  });

  const measurementGroup = g.children[0] as FakeGroup;
  const cellLine = measurementGroup.children[0] as FakeLine;
  const cellLabel = measurementGroup.children[1] as FakeMesh;
  const neighborLine = measurementGroup.children[2] as FakeLine;
  const neighborLabel = measurementGroup.children[3] as FakeMesh;

  assert.equal(cellLabel.position.x, 0.62);
  assert.equal(cellLabel.position.y, 1.45);
  assert.equal(neighborLabel.position.x, 0.54);
  assert.equal(neighborLabel.position.y, 1.08);
  assert.ok(Math.abs(cellLabel.scale.x - 0.3936) < 1e-12);
  assert.ok(Math.abs(cellLabel.scale.y - 0.1968) < 1e-12);
  assert.equal(cellLabel.scale.z, 1);
  assert.ok(Math.abs(neighborLabel.scale.x - 0.324) < 1e-12);
  assert.ok(Math.abs(neighborLabel.scale.y - 0.162) < 1e-12);
  assert.equal(neighborLabel.scale.z, 1);
  assert.notEqual(cellLine.material, neighborLine.material);
  assert.equal((cellLine.material as FakeLineBasicMaterial).opts.color, 0x2b7dbb);
  assert.equal((neighborLine.material as FakeLineBasicMaterial).opts.color, 0x000000);
});
