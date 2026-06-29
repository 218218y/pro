import test from 'node:test';
import assert from 'node:assert/strict';

import { applyObjectBoxesSketchPlacementPreview } from '../esm/native/builder/render_preview_sketch_pipeline_object_boxes.ts';

class FakeVector3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0
  ) {}

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  applyMatrix4() {
    return this;
  }
}

class FakeMatrix4 {
  constructor(private readonly scaleValue: { x: unknown; y: unknown; z: unknown }) {}

  copy() {
    return this;
  }

  invert() {
    return this;
  }

  multiplyMatrices() {
    return this;
  }

  decompose(_pos: FakeVector3, _quat: Record<string, unknown>, scale: FakeVector3) {
    (scale as unknown as Record<string, unknown>).x = this.scaleValue.x;
    (scale as unknown as Record<string, unknown>).y = this.scaleValue.y;
    (scale as unknown as Record<string, unknown>).z = this.scaleValue.z;
    return this;
  }
}

type FakeObjectBoxCtxOptions = {
  min?: Record<string, unknown>;
  max?: Record<string, unknown>;
  scaleValue?: { x: unknown; y: unknown; z: unknown };
};

function createObjectBoxCtx(options: FakeObjectBoxCtxOptions = {}) {
  const parent = { matrixWorld: {}, updateMatrixWorld() {} };
  const helper = {
    visible: false,
    position: new FakeVector3(),
    scale: new FakeVector3(1, 1, 1),
    quaternion: { copy() {} },
  };
  const obj = {
    geometry: {
      boundingBox: {
        min: options.min || { x: -0.5, y: -0.25, z: -0.1 },
        max: options.max || { x: 0.5, y: 0.25, z: 0.1 },
      },
    },
    matrixWorld: {},
    updateMatrixWorld() {},
  };
  const scaleValue = options.scaleValue || { x: 1, y: 1, z: 1 };

  return {
    helper,
    ctx: {
      App: {},
      THREE: {},
      kind: 'object_boxes',
      input: { previewObjects: [obj] },
      helperMeshes: [helper],
      g: { visible: false, parent },
      ud: { __matBox: {}, __lineBox: {} },
      isRemove: false,
      woodThick: 0.02,
      readPreviewObjectList: (value: unknown) => (Array.isArray(value) ? value : []),
      asPreviewGroup: (value: unknown) => (value && typeof value === 'object' ? value : null),
      wardrobeGroup: () => parent,
      makeCtorValue: (_THREE: unknown, name: string, args?: unknown[]) => {
        if (name === 'Matrix4') return new FakeMatrix4(scaleValue);
        if (name === 'Vector3') {
          const values = Array.isArray(args) ? args : [];
          return new FakeVector3(Number(values[0] ?? 0), Number(values[1] ?? 0), Number(values[2] ?? 0));
        }
        if (name === 'Quaternion') return {};
        return null;
      },
      readMatrix4: (value: unknown) => value,
      readVector3: (value: unknown) => value,
      readQuaternion: (value: unknown) => value,
      readValueRecord: (value: unknown) => (value && typeof value === 'object' ? value : null),
      callMethod(target: unknown, method: string, args: unknown[]) {
        const fn = (target as Record<string, unknown>)[method];
        if (typeof fn === 'function') return fn.apply(target, args);
        return undefined;
      },
      isFn: (value: unknown) => typeof value === 'function',
      hideAll() {},
      setVisible(target: { visible?: boolean } | null, visible: boolean) {
        if (target) target.visible = visible;
      },
      resetMeshOrientation() {},
      applyPreviewStyle() {},
    },
  };
}

test('object-box preview rejects string encoded runtime bounding boxes', () => {
  const { ctx, helper } = createObjectBoxCtx({ min: { x: '-0.5', y: -0.25, z: -0.1 } });

  assert.equal(applyObjectBoxesSketchPlacementPreview(ctx as never), true);
  assert.equal(helper.visible, false);
});

test('object-box preview rejects string encoded runtime scale decomposition', () => {
  const { ctx, helper } = createObjectBoxCtx({ scaleValue: { x: '1', y: 1, z: 1 } });

  assert.equal(applyObjectBoxesSketchPlacementPreview(ctx as never), true);
  assert.equal(helper.visible, false);
});

test('object-box preview preserves numeric zero scale as a real runtime value', () => {
  const { ctx, helper } = createObjectBoxCtx({ scaleValue: { x: 0, y: 1, z: 1 } });

  assert.equal(applyObjectBoxesSketchPlacementPreview(ctx as never), true);
  assert.equal(helper.visible, true);
  assert.equal(helper.scale.x, 0.0001);
});
