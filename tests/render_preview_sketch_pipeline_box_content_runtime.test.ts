import test from 'node:test';
import assert from 'node:assert/strict';

import { applyBoxContentSketchPlacementPreview } from '../esm/native/builder/render_preview_sketch_pipeline_box_content.ts';

class FakeVector3 {
  x = 0;
  y = 0;
  z = 0;
  set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class FakeScale {
  x = 1;
  y = 1;
  z = 1;
  set(x = 1, y = 1, z = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class FakeMesh {
  visible = false;
  position = new FakeVector3();
  scale = new FakeScale();
  material: unknown = null;
  renderOrder = 0;
  outline = { visible: false, material: null as unknown, renderOrder: 0 };
}

function createCtx(overrides: Record<string, unknown> = {}) {
  const shelfA = new FakeMesh();
  const boxTop = new FakeMesh();
  const boxBottom = new FakeMesh();
  const boxLeft = new FakeMesh();
  const boxRight = new FakeMesh();
  const boxBack = new FakeMesh();
  const ctx: any = {
    kind: 'drawers',
    input: { drawerH: 0.2, drawerGap: 0.04 },
    g: { visible: true },
    ud: {
      __matShelf: { id: 'shelf' },
      __matBox: { id: 'box' },
      __matBrace: { id: 'brace' },
      __lineShelf: { id: 'line-shelf' },
      __lineBox: { id: 'line-box' },
      __lineBrace: { id: 'line-brace' },
      __matRemove: { id: 'remove' },
      __lineRemove: { id: 'line-remove' },
      __matBoxOverlay: { id: 'box-overlay' },
      __lineBoxOverlay: { id: 'line-box-overlay' },
      __matRemoveOverlay: { id: 'remove-overlay' },
      __lineRemoveOverlay: { id: 'line-remove-overlay' },
    },
    isRemove: false,
    x: 0.5,
    y: 1,
    z: 0.25,
    w: 0.8,
    h: 0.6,
    d: 0.5,
    woodThick: 0.02,
    shelfA,
    boxTop,
    boxBottom,
    boxLeft,
    boxRight,
    boxBack,
    asObject: (value: unknown) => (typeof value === 'object' && value ? (value as any) : null),
    readPreviewDrawerList: (value: unknown) => (Array.isArray(value) ? value : []),
    setVisible(mesh: FakeMesh | null, on: boolean) {
      if (!mesh) return;
      mesh.visible = on;
      mesh.outline.visible = on;
    },
    resetMeshOrientation: () => {},
    applyPreviewStyle(
      mesh: FakeMesh | null,
      material: unknown,
      lineMaterial: unknown,
      renderOrder?: number,
      outlineRenderOrder?: number
    ) {
      if (!mesh) return;
      mesh.material = material;
      mesh.outline.material = lineMaterial;
      if (typeof renderOrder === 'number') mesh.renderOrder = renderOrder;
      if (typeof outlineRenderOrder === 'number') mesh.outline.renderOrder = outlineRenderOrder;
    },
    placePreviewBoxMesh({
      mesh,
      sx,
      sy,
      sz,
      px,
      py,
      pz,
      material,
      lineMaterial,
      renderOrder,
      outlineRenderOrder,
    }: any) {
      if (!mesh) return;
      mesh.visible = true;
      mesh.position.set(px, py, pz);
      mesh.scale.set(sx, sy, sz);
      mesh.material = material;
      mesh.outline.material = lineMaterial;
      if (typeof renderOrder === 'number') mesh.renderOrder = renderOrder;
      if (typeof outlineRenderOrder === 'number') mesh.outline.renderOrder = outlineRenderOrder;
    },
    readFrontOverlay(
      _fallbackX: number,
      fallbackY: number,
      fallbackW: number,
      fallbackH: number,
      fallbackT: number
    ) {
      return {
        x: 0.51,
        y: fallbackY + 0.01,
        z: 0.42,
        w: fallbackW - 0.02,
        h: fallbackH,
        t: fallbackT,
      };
    },
    ...overrides,
  };
  return ctx;
}

test('preview box-content drawers use front overlays and hide unused box faces', () => {
  const ctx = createCtx();
  const handled = applyBoxContentSketchPlacementPreview(ctx);
  assert.equal(handled, true);
  assert.equal(ctx.shelfA.visible, true);
  assert.equal(ctx.shelfA.position.z, 0.42);
  assert.equal(ctx.boxTop.visible, true);
  assert.equal(ctx.boxBottom.visible, true);
  assert.equal(ctx.boxLeft.visible, false);
  assert.equal(ctx.boxRight.visible, false);
  assert.equal(ctx.boxBack.visible, false);
  assert.ok(Math.abs(ctx.boxTop.position.y - 1.34) < 1e-9);
  assert.ok(Math.abs(ctx.boxBottom.position.y - 1.11) < 1e-9);
});

test('preview box-content box mode renders full frame and center marker when snapping to center', () => {
  const ctx = createCtx({
    kind: 'box',
    input: {
      boxH: 0.6,
      fillFront: false,
      fillBack: true,
      snapToCenter: true,
      overlayThroughScene: true,
    },
    readFrontOverlay: () => null,
  });

  const handled = applyBoxContentSketchPlacementPreview(ctx);
  assert.equal(handled, true);
  assert.equal(ctx.shelfA.visible, true);
  assert.ok(Math.abs(ctx.shelfA.scale.x - 0.012) < 1e-9);
  assert.ok(Math.abs(ctx.shelfA.scale.y - 0.6) < 1e-9);
  assert.equal(ctx.shelfA.renderOrder, 10022);
  assert.equal(ctx.boxBack.visible, true);
  assert.equal(ctx.boxTop.visible, true);
  assert.equal(ctx.boxBottom.visible, true);
  assert.equal(ctx.boxLeft.visible, true);
  assert.equal(ctx.boxRight.visible, true);
});
