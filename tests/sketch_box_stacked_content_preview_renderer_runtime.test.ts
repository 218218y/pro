import test from 'node:test';
import assert from 'node:assert/strict';

import { applyStackedBoxContentSketchPlacementPreview } from '../esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts';
import type { SketchPlacementPreviewContext } from '../esm/native/builder/render_preview_sketch_pipeline_shared.ts';
import {
  DRAWER_SKETCH_PREVIEW_RENDER_POLICY,
  DRAWER_SKETCH_SIZING_POLICY,
} from '../esm/shared/dimensions/drawer_sketch_policy.ts';
import { SKETCH_BOX_DOOR_PREVIEW_POLICY } from '../esm/shared/dimensions/sketch_box_preview_policy.ts';

type RecordMap = Record<string, unknown>;
type TestMesh = { name: string; visible: boolean };
type Placement = {
  mesh: TestMesh;
  sx: number;
  sy: number;
  sz: number;
  px: number;
  py: number;
  pz: number;
  material?: unknown;
  lineMaterial?: unknown;
};
type OverlayCall = { x: number; y: number; w: number; h: number; t: number };

const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const positive = (value: unknown): number | null => {
  const number = finite(value);
  return number != null && number > 0 ? number : null;
};

function makeMesh(name: string): TestMesh {
  return { name, visible: true };
}

function createHarness(
  kind: string,
  input: RecordMap = {},
  overrides: {
    x?: number;
    y?: number;
    z?: number;
    w?: number;
    h?: number;
    d?: number;
    woodThick?: number;
    isRemove?: boolean;
    ud?: RecordMap;
    noFrontOverlay?: boolean;
  } = {}
) {
  const shelfA = makeMesh('shelfA');
  const boxTop = makeMesh('boxTop');
  const boxBottom = makeMesh('boxBottom');
  const boxLeft = makeMesh('boxLeft');
  const boxRight = makeMesh('boxRight');
  const boxBack = makeMesh('boxBack');
  const placements: Placement[] = [];
  const overlayCalls: OverlayCall[] = [];
  const g = { visible: true };
  const ud: RecordMap = {
    __matRemove: 'mat-remove',
    __lineRemove: 'line-remove',
    __matShelf: 'mat-shelf',
    __lineShelf: 'line-shelf',
    __matBox: 'mat-box',
    __lineBox: 'line-box',
    __matBrace: 'mat-brace',
    __lineBrace: 'line-brace',
    ...overrides.ud,
  };
  const x = overrides.x ?? 1;
  const y = overrides.y ?? 2;
  const z = overrides.z ?? 3;
  const w = overrides.w ?? 0.8;
  const h = overrides.h ?? 0.6;
  const d = overrides.d ?? 0.1;
  const woodThick = overrides.woodThick ?? 0.018;

  const ctx = {
    kind,
    input,
    g,
    ud,
    isRemove: overrides.isRemove ?? false,
    x,
    y,
    z,
    w,
    h,
    d,
    woodThick,
    shelfA,
    boxTop,
    boxBottom,
    boxLeft,
    boxRight,
    boxBack,
    readPreviewDrawerList(value: unknown) {
      return Array.isArray(value) ? value : [];
    },
    asObject<T>(value: unknown): T | null {
      return value != null && typeof value === 'object' ? (value as T) : null;
    },
    readFrontOverlay(
      fallbackX: number,
      fallbackY: number,
      fallbackW: number,
      fallbackH: number,
      fallbackT: number
    ) {
      overlayCalls.push({ x: fallbackX, y: fallbackY, w: fallbackW, h: fallbackH, t: fallbackT });
      if (overrides.noFrontOverlay) return null;
      const overlayZ = finite(input.frontOverlayZ) ?? 7;
      return {
        x: finite(input.frontOverlayX) ?? fallbackX,
        y: finite(input.frontOverlayY) ?? fallbackY,
        z: overlayZ,
        w: positive(input.frontOverlayW) ?? fallbackW,
        h: positive(input.frontOverlayH) ?? fallbackH,
        t: positive(input.frontOverlayThickness) ?? fallbackT,
      };
    },
    setVisible(mesh: TestMesh | null, on: boolean) {
      if (mesh) mesh.visible = on;
    },
    placePreviewBoxMesh(args: Placement) {
      args.mesh.visible = true;
      placements.push(args);
    },
  } as unknown as SketchPlacementPreviewContext;

  return {
    ctx,
    g,
    ud,
    placements,
    overlayCalls,
    meshes: { shelfA, boxTop, boxBottom, boxLeft, boxRight, boxBack },
  };
}

function placementFor(placements: Placement[], name: string): Placement {
  const placement = placements.find(entry => entry.mesh.name === name);
  assert.ok(placement, `expected placement for ${name}`);
  return placement;
}

function assertClose(actual: unknown, expected: number, message: string): void {
  assert.equal(typeof actual, 'number', message);
  assert.ok(Math.abs((actual as number) - expected) < 1e-12, message);
}

test('stacked drawers preserve validation, gap fallback, geometry, overlay clamps, materials, and mesh visibility', () => {
  const invalid = createHarness('drawers', { drawerH: 0 });
  assert.equal(applyStackedBoxContentSketchPlacementPreview(invalid.ctx), true);
  assert.equal(invalid.g.visible, false);
  assert.equal(invalid.placements.length, 0);

  const explicit = createHarness(
    'drawers',
    {
      drawerH: 0.12,
      drawerGap: 0.04,
      frontOverlayH: 0.4,
      frontOverlayZ: 9,
      frontOverlayThickness: 0.007,
    },
    { d: 0.5 }
  );
  assert.equal(applyStackedBoxContentSketchPlacementPreview(explicit.ctx), true);
  assert.deepEqual(
    explicit.placements.map(entry => entry.mesh.name),
    ['shelfA', 'boxTop', 'boxBottom']
  );
  assert.deepEqual(explicit.overlayCalls[0], {
    x: 1,
    y: 2 + 0.12 + 0.04 / 2 + 0.12 / 2,
    w: 0.8,
    h: 0.4,
    t: DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewOverlayThicknessMaxM,
  });
  assert.deepEqual(placementFor(explicit.placements, 'shelfA'), {
    mesh: explicit.meshes.shelfA,
    sx: 0.8,
    sy: 0.4,
    sz: 0.007,
    px: 1,
    py: 2 + 0.12 + 0.04 / 2 + 0.12 / 2,
    pz: 9,
    material: 'mat-shelf',
    lineMaterial: 'line-shelf',
  });
  assert.equal(
    placementFor(explicit.placements, 'boxBottom').py,
    2 + 0.12 / 2 + DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewDrawerBottomLiftM
  );
  assert.equal(placementFor(explicit.placements, 'boxTop').py, 2 + 0.12 + 0.04 + 0.12 / 2);
  assert.equal(explicit.meshes.boxLeft.visible, false);
  assert.equal(explicit.meshes.boxRight.visible, false);
  assert.equal(explicit.meshes.boxBack.visible, false);

  const fallback = createHarness(
    'drawers',
    { drawerH: 0.1, drawerGap: 'invalid' },
    { d: 0.001, isRemove: true }
  );
  assert.equal(applyStackedBoxContentSketchPlacementPreview(fallback.ctx), true);
  assert.equal(fallback.overlayCalls[0]?.y, 2 + 0.1 + DRAWER_SKETCH_SIZING_POLICY.internalGapM / 2 + 0.1 / 2);
  assert.equal(
    fallback.overlayCalls[0]?.h,
    0.1 * DRAWER_SKETCH_SIZING_POLICY.internalStackCount +
      DRAWER_SKETCH_SIZING_POLICY.internalGapM +
      DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewStackExtraHeightM
  );
  assert.equal(fallback.overlayCalls[0]?.t, DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewOverlayThicknessMinM);
  assert.equal(placementFor(fallback.placements, 'boxTop').material, 'mat-remove');
  assert.equal(placementFor(fallback.placements, 'boxTop').lineMaterial, 'line-remove');
});

test('external drawers preserve default height, valid-height sum, five-mesh order, invalid-entry hiding, and overlay thickness', () => {
  const empty = createHarness('ext_drawers', { drawers: [] }, { d: 0.001 });
  assert.equal(applyStackedBoxContentSketchPlacementPreview(empty.ctx), true);
  assert.equal(empty.overlayCalls[0]?.h, DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewExternalDefaultHeightM);
  assert.equal(empty.overlayCalls[0]?.t, DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewOverlayThicknessMinM);
  assert.deepEqual(
    empty.placements.map(entry => entry.mesh.name),
    ['shelfA']
  );
  for (const mesh of [
    empty.meshes.boxTop,
    empty.meshes.boxBottom,
    empty.meshes.boxLeft,
    empty.meshes.boxRight,
    empty.meshes.boxBack,
  ]) {
    assert.equal(mesh.visible, false);
  }

  const drawers = [{ y: 1, h: 0.1 }, { y: 'invalid', h: 0.2 }, { y: 3, h: 0 }, null, { y: 5, h: 0.3 }];
  const populated = createHarness(
    'ext_drawers',
    { drawers, frontOverlayZ: 8, frontOverlayThickness: 0.009 },
    { d: 0.5 }
  );
  assert.equal(applyStackedBoxContentSketchPlacementPreview(populated.ctx), true);
  assert.equal(
    populated.overlayCalls[0]?.h,
    0.1 + 0.2 + 0.3 + DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewStackExtraHeightM
  );
  assert.equal(populated.overlayCalls[0]?.t, DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewOverlayThicknessMaxM);
  assert.deepEqual(
    populated.placements.map(entry => entry.mesh.name),
    ['shelfA', 'boxTop', 'boxBack']
  );
  assert.deepEqual(placementFor(populated.placements, 'boxTop'), {
    mesh: populated.meshes.boxTop,
    sx: 0.8,
    sy: 0.1,
    sz: 0.5,
    px: 1,
    py: 1,
    pz: 3,
    material: 'mat-shelf',
    lineMaterial: 'line-shelf',
  });
  assert.equal(populated.meshes.boxBottom.visible, false);
  assert.equal(populated.meshes.boxLeft.visible, false);
  assert.equal(populated.meshes.boxRight.visible, false);
  assert.equal(populated.meshes.boxBack.visible, true);
  assert.equal(placementFor(populated.placements, 'shelfA').sz, 0.009);
});

test('drawer divider preserves axes, clamps, material precedence, depth extra, and resilient motion cache lifecycle', () => {
  const vertical = createHarness(
    'drawer_divider',
    {
      dividerAxis: 'vertical',
      snapToCenter: true,
      highlightX: 1.2,
      highlightY: 2.3,
      drawerMotionPreview: true,
      drawerMotionDrawerId: 'drawer-7',
      drawerMotionClosedX: 10,
      drawerMotionClosedY: 20,
      drawerMotionClosedZ: 30,
      drawerMotionOffsetX: 0.2,
      drawerMotionOffsetY: 0.3,
      drawerMotionOffsetZ: 0.4,
    },
    { w: 0.1, h: 0.2, d: 0.3 }
  );
  assert.equal(applyStackedBoxContentSketchPlacementPreview(vertical.ctx), true);
  const expectedVerticalT = Math.max(
    DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewDividerMinM,
    Math.min(
      Math.max(
        SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDepthM,
        0.1 * DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewDividerWidthRatio
      ),
      DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewDividerMaxM
    )
  );
  assert.deepEqual(placementFor(vertical.placements, 'shelfA'), {
    mesh: vertical.meshes.shelfA,
    sx: expectedVerticalT,
    sy: 0.2,
    sz: 0.3 + DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewDividerDepthExtraM,
    px: 1,
    py: 2,
    pz: 3,
    material: 'mat-brace',
    lineMaterial: 'line-brace',
  });
  assert.equal(placementFor(vertical.placements, 'boxTop').px, 1.2);
  assert.equal(placementFor(vertical.placements, 'boxTop').py, 2.3);
  const motion = vertical.ud.__drawerDividerMotionPreview as RecordMap;
  assert.equal(motion.drawerId, 'drawer-7');
  assert.equal(motion.closedX, 10);
  assert.equal(motion.closedY, 20);
  assert.equal(motion.closedZ, 30);
  assertClose(motion.boxBaseX, 1.2 - 0.2, 'boxBaseX must preserve the motion offset');
  assertClose(motion.boxBaseY, 2.3 - 0.3, 'boxBaseY must preserve the motion offset');
  assertClose(motion.boxBaseZ, 3 - 0.4, 'boxBaseZ must preserve the motion offset');
  assertClose(motion.shelfBaseX, 1 - 0.2, 'shelfBaseX must preserve the motion offset');
  assertClose(motion.shelfBaseY, 2 - 0.3, 'shelfBaseY must preserve the motion offset');
  assertClose(motion.shelfBaseZ, 3 - 0.4, 'shelfBaseZ must preserve the motion offset');

  const horizontal = createHarness(
    'drawer_divider',
    { dividerAxis: 'horizontal', snapToCenter: false },
    { h: 1, d: 0.2, isRemove: true }
  );
  assert.equal(applyStackedBoxContentSketchPlacementPreview(horizontal.ctx), true);
  const divider = placementFor(horizontal.placements, 'shelfA');
  assert.equal(divider.sx, 0.8);
  assert.equal(divider.sy, DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewDividerMaxM);
  assert.equal(divider.material, 'mat-remove');
  assert.equal(divider.lineMaterial, 'line-remove');

  const missingMetadata = createHarness(
    'drawer_divider',
    { drawerMotionPreview: true, drawerMotionDrawerId: 'missing-coordinates' },
    { ud: { __drawerDividerMotionPreview: { stale: true } } }
  );
  assert.equal(applyStackedBoxContentSketchPlacementPreview(missingMetadata.ctx), true);
  assert.equal('__drawerDividerMotionPreview' in missingMetadata.ud, false);

  const resilient = createHarness('drawer_divider', { drawerMotionPreview: false });
  Object.defineProperty(resilient.ud, '__drawerDividerMotionPreview', {
    value: { stale: true },
    configurable: false,
    writable: true,
  });
  assert.doesNotThrow(() => applyStackedBoxContentSketchPlacementPreview(resilient.ctx));
  assert.deepEqual(resilient.ud.__drawerDividerMotionPreview, { stale: true });
});

test('storage preserves body and front-overlay placement, wood precedence, fallback clamp, visibility, and public return shape', () => {
  const wood = createHarness('storage', { frontOverlayZ: 11 }, { d: 0.5, woodThick: 0.015 });
  assert.equal(applyStackedBoxContentSketchPlacementPreview(wood.ctx), true);
  assert.equal(wood.overlayCalls[0]?.t, 0.015);
  assert.deepEqual(
    wood.placements.map(entry => entry.mesh.name),
    ['shelfA', 'boxBack']
  );
  assert.deepEqual(placementFor(wood.placements, 'shelfA'), {
    mesh: wood.meshes.shelfA,
    sx: 0.8,
    sy: 0.6,
    sz: 0.5,
    px: 1,
    py: 2,
    pz: 3,
    material: 'mat-shelf',
    lineMaterial: 'line-shelf',
  });
  assert.equal(placementFor(wood.placements, 'boxBack').sz, 0.015);
  for (const mesh of [wood.meshes.boxTop, wood.meshes.boxBottom, wood.meshes.boxLeft, wood.meshes.boxRight]) {
    assert.equal(mesh.visible, false);
  }

  const fallback = createHarness('storage', {}, { d: 0.5, woodThick: 0, noFrontOverlay: true });
  assert.equal(applyStackedBoxContentSketchPlacementPreview(fallback.ctx), true);
  assert.equal(fallback.overlayCalls[0]?.t, DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewOverlayThicknessMaxM);
  assert.equal(fallback.meshes.boxBack.visible, false);
  assert.equal(fallback.meshes.shelfA.visible, true);

  const minClamp = createHarness('storage', {}, { d: 0.001, woodThick: 0 });
  assert.equal(applyStackedBoxContentSketchPlacementPreview(minClamp.ctx), true);
  assert.equal(minClamp.overlayCalls[0]?.t, DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewOverlayThicknessMinM);

  const unrelated = createHarness('unrelated');
  assert.equal(applyStackedBoxContentSketchPlacementPreview(unrelated.ctx), false);
});
