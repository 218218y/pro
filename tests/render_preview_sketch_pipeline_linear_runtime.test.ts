import test from 'node:test';
import assert from 'node:assert/strict';

import { applyLinearSketchPlacementPreview } from '../esm/native/builder/render_preview_sketch_pipeline_linear.ts';

class FakeMesh {
  visible = false;
  material: unknown = null;
  renderOrder = 0;
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

function createRodContext() {
  const shelfA = new FakeMesh();
  const boxTop = new FakeMesh();
  const boxLeft = new FakeMesh();
  const hidden = new FakeMesh();

  return {
    kind: 'rod',
    input: {
      showCenterXGuide: true,
      showCenterYGuide: true,
      guideWidth: 2,
      guideHeight: 3,
      guideVerticalX: 0.22,
      guideVerticalY: 0,
      guideHorizontalX: 0.22,
      guideHorizontalY: 0.41,
    },
    ud: {},
    isRemove: false,
    h: 0.12,
    d: 0.03,
    w: 0.04,
    x: 0.22,
    y: 0.41,
    z: 0.02,
    shelfA,
    boxTop,
    boxLeft,
    boxBottom: hidden,
    boxRight: hidden,
    boxBack: hidden,
    setVisible(mesh: FakeMesh | null, on: boolean) {
      if (mesh) mesh.visible = on;
    },
    placePreviewBoxMesh(args: {
      mesh: FakeMesh | null;
      sx: number;
      sy: number;
      sz: number;
      px: number;
      py: number;
      pz: number;
      material?: unknown;
      renderOrder?: number;
    }) {
      if (!args.mesh) return;
      args.mesh.visible = true;
      args.mesh.position.set(args.px, args.py, args.pz);
      args.mesh.scale.set(args.sx, args.sy, args.sz);
      if (args.material) args.mesh.material = args.material;
      if (typeof args.renderOrder === 'number') args.mesh.renderOrder = args.renderOrder;
    },
  };
}

test('rod sketch preview guide lines can be anchored to the intended handle center', () => {
  const ctx = createRodContext();

  assert.equal(applyLinearSketchPlacementPreview(ctx as never), true);

  assert.equal(ctx.boxTop.visible, true);
  assert.equal(ctx.boxTop.position.x, 0.22);
  assert.equal(ctx.boxTop.position.y, 0.41);
  assert.equal(ctx.boxTop.scale.x, 2);

  assert.equal(ctx.boxLeft.visible, true);
  assert.equal(ctx.boxLeft.position.x, 0.22);
  assert.equal(ctx.boxLeft.position.y, 0);
  assert.equal(ctx.boxLeft.scale.y, 3);
});
