import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleCanvasManualSketchFreeBoxClick } from '../esm/native/services/canvas_picking_click_manual_sketch_free_box.ts';
import { createSketchFreePlacementBoxHoverRecord } from '../esm/native/services/canvas_picking_sketch_free_commit.ts';
import { SKETCH_BOX_SHELL_GEOMETRY_POLICY } from '../esm/shared/dimensions/sketch_box_geometry_policy.ts';
import { cmToM, mToCm } from '../esm/shared/dimensions/units.ts';
import {
  DEFAULT_SKETCH_BOX_DEPTH_CM,
  DEFAULT_SKETCH_BOX_HEIGHT_CM,
  DEFAULT_SKETCH_BOX_WIDTH_CM,
  mkSketchBoxTool,
  parseSketchBoxTool,
} from '../esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts';
import { readSketchBoxFrontsBundle, readSourceFiles } from './sketch_box_runtime_helpers.ts';

type RecordMap = Record<string, unknown>;

function createFreeBoxClickHarness(overrides: RecordMap = {}) {
  const cfg: RecordMap = {};
  const calls: {
    placements: number;
    patches: number;
    placementArgs: RecordMap | null;
    planeZ: number | null;
  } = {
    placements: 0,
    patches: 0,
    placementArgs: null,
    planeZ: null,
  };
  const App = {
    actions: {
      modules: {
        patchForStack(_side: string, _moduleKey: unknown, patcher: (cfg: RecordMap) => void) {
          calls.patches += 1;
          patcher(cfg);
        },
      },
    },
  } as never;

  return {
    cfg,
    calls,
    args: {
      App,
      tool: 'sketch_box:40@45',
      ndcX: 0,
      ndcY: 0,
      foundModuleIndex: null,
      host: { moduleKey: 0, isBottom: false },
      wardrobeBox: { centerX: 0, centerY: 1, centerZ: 0, width: 2, height: 2, depth: 0.6 },
      raycaster: {},
      mouse: {},
      floorY: 0,
      __wp_readSketchHover: () => null,
      __wp_writeSketchHover: () => undefined,
      __wp_clearSketchHover: () => undefined,
      __wp_parseSketchBoxToolSpec: () => ({ heightCm: 40, widthCm: 45, depthCm: null }),
      __wp_getViewportRoots: () => ({ camera: {}, wardrobeGroup: {} }),
      __wp_intersectScreenWithLocalZPlane: (planeArgs: { planeZ: number }) => {
        calls.planeZ = planeArgs.planeZ;
        return { x: 0.1, y: 0.7, z: -0.3 };
      },
      __wp_readInteriorModuleConfigRef: () => cfg,
      __wp_resolveSketchFreeBoxHoverPlacement: (placementArgs: RecordMap) => {
        calls.placements += 1;
        calls.placementArgs = placementArgs;
        return {
          op: 'add',
          previewX: 0.1,
          previewY: 0.7,
          previewH: 0.4,
          previewW: 0.45,
          previewD: 0.45,
        };
      },
      ...overrides,
    } as never,
  };
}

test('free-box click uses canonical units and Shell Geometry minimums without changing numeric behavior', () => {
  const { args, calls } = createFreeBoxClickHarness({
    __wp_parseSketchBoxToolSpec: () => ({ heightCm: 1, widthCm: 45, depthCm: 30 }),
  });

  assert.equal(tryHandleCanvasManualSketchFreeBoxClick(args), true);
  assert.equal(calls.planeZ, -0.3);
  assert.ok(calls.placementArgs);
  assert.equal(calls.placementArgs.boxH, SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterHeightM);
  assert.equal(calls.placementArgs.widthOverrideM, cmToM(45));
  assert.equal(calls.placementArgs.depthOverrideM, cmToM(30));
});

test('free-box click preserves missing and invalid optional-dimension handling', () => {
  for (const spec of [
    { heightCm: 80, widthCm: null, depthCm: null },
    { heightCm: 0, widthCm: -10, depthCm: Number.NaN },
    { heightCm: '80', widthCm: '45', depthCm: Number.POSITIVE_INFINITY },
  ]) {
    const { args, calls } = createFreeBoxClickHarness({
      __wp_parseSketchBoxToolSpec: () => spec,
    });
    assert.equal(tryHandleCanvasManualSketchFreeBoxClick(args), true);
    assert.ok(calls.placementArgs);
    const expectedHeight =
      typeof spec.heightCm === 'number' && Number.isFinite(spec.heightCm) && spec.heightCm > 0
        ? Math.max(SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterHeightM, cmToM(spec.heightCm))
        : SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterHeightM;
    assert.equal(calls.placementArgs.boxH, expectedHeight);
    assert.equal(calls.placementArgs.widthOverrideM, null);
    assert.equal(calls.placementArgs.depthOverrideM, null);
  }
});

test('Interior-tab Sketch Box defaults remain plain integer centimeters with stable tool parsing', () => {
  assert.equal(typeof DEFAULT_SKETCH_BOX_HEIGHT_CM, 'number');
  assert.equal(typeof DEFAULT_SKETCH_BOX_WIDTH_CM, 'number');
  assert.equal(typeof DEFAULT_SKETCH_BOX_DEPTH_CM, 'number');
  assert.equal(
    DEFAULT_SKETCH_BOX_HEIGHT_CM,
    Math.round(mToCm(SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterHeightM))
  );
  assert.equal(
    DEFAULT_SKETCH_BOX_WIDTH_CM,
    Math.round(mToCm(SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterWidthM))
  );
  assert.equal(
    DEFAULT_SKETCH_BOX_DEPTH_CM,
    Math.round(mToCm(SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterDepthM))
  );
  assert.equal(DEFAULT_SKETCH_BOX_HEIGHT_CM, 40);
  assert.equal(DEFAULT_SKETCH_BOX_WIDTH_CM, 60);
  assert.equal(DEFAULT_SKETCH_BOX_DEPTH_CM, 55);

  const tool = mkSketchBoxTool(40, 60, 55);
  assert.equal(tool, 'sketch_box:40@60@55');
  assert.deepEqual(parseSketchBoxTool(tool), { heightCm: 40, widthCm: 60, depthCm: 55 });
  assert.deepEqual(parseSketchBoxTool('sketch_box:40@@55'), {
    heightCm: 40,
    widthCm: null,
    depthCm: 55,
  });
  assert.equal(parseSketchBoxTool('sketch_box:not-a-number'), null);
});

test('free-box click fallback does not turn a module hit into a free-placement box', () => {
  const { args, cfg, calls } = createFreeBoxClickHarness({ foundModuleIndex: 0 });

  const handled = tryHandleCanvasManualSketchFreeBoxClick(args);

  assert.equal(handled, false);
  assert.equal(calls.placements, 0);
  assert.equal(calls.patches, 0);
  assert.deepEqual(cfg, {});
});

test('free-box click fallback still creates a free-placement box when no module was hit', () => {
  const { args, cfg, calls } = createFreeBoxClickHarness();

  const handled = tryHandleCanvasManualSketchFreeBoxClick(args);

  assert.equal(handled, true);
  assert.equal(calls.placements, 1);
  assert.equal(calls.patches, 1);
  const boxes = ((cfg.sketchExtras as RecordMap | undefined)?.boxes as RecordMap[] | undefined) ?? [];
  assert.equal(boxes.length, 1);
  assert.equal(boxes[0]?.freePlacement, true);
  assert.equal(boxes[0]?.absY, 0.7);
  assert.equal(boxes[0]?.widthM, 0.45);
});

test('free-box click fallback rejects string-encoded plane-hit geometry', () => {
  const { args, cfg, calls } = createFreeBoxClickHarness({
    __wp_intersectScreenWithLocalZPlane: () => ({ x: '0.1', y: '0.7', z: -0.3 }),
  });

  const handled = tryHandleCanvasManualSketchFreeBoxClick(args);

  assert.equal(handled, false);
  assert.equal(calls.placements, 0);
  assert.equal(calls.patches, 0);
  assert.deepEqual(cfg, {});
});

test('free-box click preserves a real recent free-placement hover even when a module is behind it', () => {
  const recentHover = createSketchFreePlacementBoxHoverRecord({
    tool: 'sketch_box:40@45',
    host: { moduleKey: 0, isBottom: false },
    op: 'add',
    previewX: 0.2,
    previewY: 0.8,
    previewH: 0.4,
    previewW: 0.45,
    previewD: 0.45,
  });
  assert.ok(recentHover);
  const { args, cfg, calls } = createFreeBoxClickHarness({
    foundModuleIndex: 0,
    __wp_readSketchHover: () => recentHover,
  });

  const handled = tryHandleCanvasManualSketchFreeBoxClick(args);

  assert.equal(handled, true);
  assert.equal(calls.placements, 0);
  assert.equal(calls.patches, 1);
  const boxes = ((cfg.sketchExtras as RecordMap | undefined)?.boxes as RecordMap[] | undefined) ?? [];
  assert.equal(boxes.length, 1);
  assert.equal(boxes[0]?.freePlacement, true);
  assert.equal(boxes[0]?.absX, 0.2);
  assert.equal(boxes[0]?.absY, 0.8);
});

test('sketch external drawers hover context loads persisted module stacks for remove/overlap handling', async () => {
  const src = await readSourceFiles([
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_flow.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_config.ts',
  ]);
  assert.match(src, /resolveManualLayoutSketchHoverModuleContext/);
  assert.match(src, /extDrawers = readRecordList\(extra, 'extDrawers'\);/);
});

test('free-box content click stays on the free box even when a wardrobe module is behind it', async () => {
  const bundle = await readSourceFiles([
    '../esm/native/services/canvas_picking_click_manual_sketch_free_flow.ts',
    '../esm/native/services/canvas_picking_click_manual_sketch_free_content.ts',
  ]);
  assert.match(bundle, /if \(!hoverOk && foundModuleIndex !== null\) return false;/);
});

test('free-box external drawers use the box bottom directly and sketch hover blocks drawer collisions across internal and external stacks', async () => {
  const builderSrc = [
    await readSourceFiles([
      '../esm/native/builder/render_interior_sketch_ops.ts',
      '../esm/native/builder/render_interior_sketch_boxes.ts',
      '../esm/native/builder/render_interior_sketch_boxes_contents.ts',
      '../esm/native/builder/render_interior_sketch_boxes_contents_parts.ts',
      '../esm/native/builder/render_interior_sketch_boxes_contents_drawers.ts',
    ]),
    await readSketchBoxFrontsBundle(),
  ].join('\n');
  assert.match(builderSrc, /const lo = innerBottomY \+ stackH \/ 2;/);
  const stackPreviewSrc = await readSourceFiles([
    '../esm/native/services/canvas_picking_sketch_box_stack_preview.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_contracts.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_records.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_shared.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_context.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_overlay.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts',
  ]);
  assert.match(
    stackPreviewSrc,
    /if \(args\.activeSegment && itemSegment && itemSegment\.index !== args\.activeSegment\.index\) return false;/
  );
  assert.match(stackPreviewSrc, /blockers: buildManualLayoutSketchExternalDrawerBlockers\(/);
  assert.match(stackPreviewSrc, /blockers: buildManualLayoutSketchInternalDrawerBlockers\(/);
});

test('module sketch hover blocks collisions between internal and external drawer stacks', async () => {
  const bundle = await readSourceFiles([
    '../esm/native/services/canvas_picking_sketch_module_stack_preview.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_preview_drawers.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_preview_ext_drawers.ts',
  ]);
  assert.match(bundle, /resolveManualLayoutSketchInternalDrawerPlacement\(/);
  assert.match(bundle, /buildManualLayoutSketchExternalDrawerBlockers\(/);
  assert.match(bundle, /buildManualLayoutSketchInternalDrawerBlockers\(/);
});

test('free-box sketch drawer clicks refresh hover state instead of dropping straight through to the module behind', async () => {
  const bundle = await readSourceFiles([
    '../esm/native/services/canvas_picking_click_manual_sketch_free_flow.ts',
    '../esm/native/services/canvas_picking_click_manual_sketch_free_content.ts',
    '../esm/native/services/canvas_picking_click_manual_sketch_free_box.ts',
  ]);
  const shared = await readSourceFiles(['../esm/native/services/canvas_picking_sketch_free_commit.ts']);
  const boxContentCommit = await readSourceFiles([
    '../esm/native/services/canvas_picking_sketch_box_content_commit.ts',
    '../esm/native/services/canvas_picking_sketch_box_content_commit_drawers.ts',
  ]);
  assert.match(bundle, /commitSketchFreePlacementHoverRecord\(/);
  assert.match(shared, /let nextHover: RecordMap \| null = null;/);
  assert.match(boxContentCommit, /contentKind: 'drawers'/);
  assert.match(boxContentCommit, /contentKind: 'ext_drawers'/);
});

test('module sketch drawer click flow enforces cross-blocking and keeps immediate remove hover after commit', async () => {
  const shared = await readSourceFiles([
    '../esm/native/services/canvas_picking_sketch_module_stack_commit.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_commit_contracts.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_commit_shared.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_commit_drawers.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_commit_ext_drawers.ts',
  ]);
  const stackApplySrc = await readSourceFiles([
    '../esm/native/services/canvas_picking_sketch_module_stack_apply.ts',
  ]);
  assert.match(shared, /buildManualLayoutSketchExternalDrawerBlockers\(/);
  assert.match(shared, /buildManualLayoutSketchInternalDrawerBlockers\(/);
  assert.match(shared, /createManualLayoutSketchStackHoverRecord\(\{[\s\S]*kind: 'drawers'/);
  assert.match(shared, /createManualLayoutSketchStackHoverRecord\(\{[\s\S]*kind: 'ext_drawers'/);
  assert.match(stackApplySrc, /commitSketchModuleInternalDrawerStack\(\{/);
  assert.match(stackApplySrc, /commitSketchModuleExternalDrawerStack\(\{/);
});

test('module sketch external drawers preview reads the selector front envelope instead of the inner cavity only', async () => {
  const bundle = await readSourceFiles([
    '../esm/native/services/canvas_picking_sketch_module_stack_preview.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_preview_ext_drawers.ts',
  ]);
  assert.match(bundle, /function readSelectorFrontEnvelope\(hitSelectorObj: unknown\):/);
  assert.match(
    bundle,
    /const faceEnvelope = selectorFrontEnvelope \?\? readSelectorFrontEnvelope\(hitSelectorObj\);/
  );
  assert.match(bundle, /DRAWER_DIMENSIONS\.sketch\.externalPreviewMinWidthM/);
  assert.match(bundle, /const outerW = Math\.max\([\s\S]*faceEnvelope\?\.outerW \?\? innerW\);/);
  assert.match(bundle, /const frontPlaneZ =[\s\S]*faceEnvelope\?\.centerZ[\s\S]*faceEnvelope\?\.outerD/);
});
