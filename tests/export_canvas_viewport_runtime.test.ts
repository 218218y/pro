import test from 'node:test';
import assert from 'node:assert/strict';

import {
  _captureCameraPvInfo,
  _captureExportRefPoints,
  _cloneRefTargetLike,
  _computeNotesRefZ,
  _getRenderCore,
  getCameraControlsOrNull,
  getCameraOrNull,
} from '../esm/native/ui/export/export_canvas_viewport.ts';

class FakeVector3 {
  x: number;
  y: number;
  z: number;
  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  clone(): FakeVector3 {
    return new FakeVector3(this.x, this.y, this.z);
  }
  add(v: FakeVector3): FakeVector3 {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  project(): FakeVector3 {
    return this;
  }
}

class FakeMatrix4 {
  elements: number[];
  constructor() {
    this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  }
  multiplyMatrices(a: { elements?: unknown }, _b: unknown): FakeMatrix4 {
    this.elements = Array.isArray(a?.elements) ? (a.elements as number[]).slice(0, 16) : this.elements;
    return this;
  }
  clone(): FakeMatrix4 {
    const next = new FakeMatrix4();
    next.elements = this.elements.slice();
    return next;
  }
  invert(): FakeMatrix4 {
    return this;
  }
}

class FakeBox3 {
  min = { z: Number.POSITIVE_INFINITY };
  max = { z: Number.NEGATIVE_INFINITY };
  copy(box: { min?: { z?: number }; max?: { z?: number } }): FakeBox3 {
    this.min.z = Number(box?.min?.z ?? this.min.z);
    this.max.z = Number(box?.max?.z ?? this.max.z);
    return this;
  }
  union(box: { min?: { z?: number }; max?: { z?: number } }): FakeBox3 {
    this.min.z = Math.min(this.min.z, Number(box?.min?.z ?? this.min.z));
    this.max.z = Math.max(this.max.z, Number(box?.max?.z ?? this.max.z));
    return this;
  }
  applyMatrix4(): FakeBox3 {
    return this;
  }
}

function createApp() {
  const camera = {
    fov: 45,
    position: { x: 0, y: 2, z: 6 },
    projectionMatrix: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
    matrixWorldInverse: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
    updateMatrixWorld: () => undefined,
    updateProjectionMatrix: () => undefined,
    lookAt: () => undefined,
  };
  const controls = {
    target: { x: 0, y: 1.4, z: 0 },
    update: () => undefined,
  };
  const wardrobeGroup = {
    traverse(fn: (node: unknown) => void) {
      fn({ geometry: { boundingBox: { min: { z: -1 }, max: { z: 2 } } }, matrixWorld: {}, userData: {} });
    },
    updateWorldMatrix: () => undefined,
  };

  return {
    render: {
      renderer: { domElement: {} },
      scene: {},
      camera,
      controls,
      wardrobeGroup,
    },
    services: {
      platform: {
        getDimsM: () => ({ w: 2, h: 3, d: 4 }),
      },
    },
    deps: {
      THREE: {
        Vector3: FakeVector3,
        Matrix4: FakeMatrix4,
        Box3: FakeBox3,
      },
    },
  } as any;
}

test('export canvas viewport surface exposes stable camera/render seams and captures projection info', () => {
  const App = createApp();

  assert.ok(_getRenderCore(App));
  assert.ok(getCameraOrNull(App));
  assert.ok(getCameraControlsOrNull(App));

  const target = _cloneRefTargetLike({ x: 1, y: 2, z: 3 });
  assert.deepEqual(target, { x: 1, y: 2, z: 3 });

  const notesRefZ = _computeNotesRefZ(App, App.render.camera, { x: 0, y: 0, z: 0 });
  assert.equal(notesRefZ, 2);

  App.render.wardrobeGroup.traverse = (fn: (node: unknown) => void) => {
    fn({ geometry: { boundingBox: { min: { z: -10 }, max: { z: 9 } } }, matrixWorld: {}, userData: {} });
  };
  assert.equal(_computeNotesRefZ(App, App.render.camera, { x: 0, y: 0, z: 0 }), 2);
  assert.equal(
    _computeNotesRefZ(App, { ...App.render.camera, position: { x: 0, y: 2, z: -6 } }, { x: 0, y: 0, z: 0 }),
    -2
  );

  const refPoints = _captureExportRefPoints(
    App,
    { left: 0, top: 0, width: 200, height: 100 } as DOMRectReadOnly,
    400,
    200,
    target
  );
  assert.ok(refPoints);
  assert.deepEqual(Object.keys(refPoints || {}).sort(), ['p0', 'p1', 'p2']);

  const pvInfo = _captureCameraPvInfo(App, App.render.camera);
  assert.equal(pvInfo.pv?.length, 16);
  assert.equal(pvInfo.pvInv?.length, 16);
  assert.deepEqual(pvInfo.camPos, { x: 0, y: 2, z: 6 });
});
