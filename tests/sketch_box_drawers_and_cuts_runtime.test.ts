import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FakeNode,
  FakeMaterial,
  createSketchInteriorHarness,
  getWorldY,
  readSketchBoxFrontsBundle,
  readSourceFiles,
} from './sketch_box_runtime_helpers.ts';

test('free-placement sketch box internal drawers render through internal drawer ops', () => {
  const capturedOps: Array<Record<string, unknown>> = [];
  const { applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness({
    applyInternalDrawersOps: (args: unknown) => {
      const rec = args as Record<string, unknown>;
      const ops = Array.isArray(rec.ops) ? (rec.ops as Array<Record<string, unknown>>) : [];
      capturedOps.push(...ops);
    },
  });

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'freeDrawerBox',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 0.72,
            widthM: 0.78,
            depthM: 0.5,
            drawers: [{ id: 'fd1', yNormC: 0.55 }],
          },
        ],
      },
      createInternalDrawerBox: () => null,
    })
  );

  assert.equal(ok, true);
  assert.equal(capturedOps.length, 2);
  assert.ok(capturedOps.every(op => String(op.partId || '').includes('freeDrawerBox_int_drawers_fd1')));
  assert.ok(capturedOps.every(op => Math.abs(Number(op.height) - 0.165) < 1e-9));
});

test('sketch external drawers render at free Y positions with per-stack metadata', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        extDrawers: [{ id: 'ed1', yNormC: 0.5, count: 3 }],
      },
    })
  );

  assert.equal(ok, true);
  const drawerGroups = wardrobeGroup.children.filter(
    node => (node as FakeNode).userData?.__wpSketchExtDrawer === true
  ) as FakeNode[];
  assert.equal(drawerGroups.length, 3);
  const ids = new Set(drawerGroups.map(node => String(node.userData.partId || '')));
  assert.equal(ids.size, 3);
  for (const node of drawerGroups) {
    assert.equal(node.userData.__wpSketchModuleKey, '0');
    assert.equal(node.userData.__wpSketchExtDrawerId, 'ed1');
  }
  const ys = drawerGroups.map(node => Number(getWorldY(node))).sort((a, b) => a - b);
  assert.ok(Math.abs(ys[1] - ys[0] - 0.22) < 1e-6);
  assert.ok(Math.abs(ys[2] - ys[1] - 0.22) < 1e-6);
  assert.ok(Math.abs((ys[0] + ys[2]) / 2 - ys[1]) < 1e-6);
});

test('sketch box external drawers render with custom per-drawer height', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'boxCustomExt',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 1.2,
            widthM: 0.78,
            depthM: 0.5,
            extDrawers: [{ id: 'edCustom', yNormC: 0.5, count: 2, drawerHeightM: 0.3 }],
          },
        ],
      },
    })
  );

  assert.equal(ok, true);
  const drawerGroups = wardrobeGroup.children.filter(
    node => (node as FakeNode).userData?.__wpSketchExtDrawer === true
  ) as FakeNode[];
  assert.equal(drawerGroups.length, 2);
  const ys = drawerGroups.map(node => Number(getWorldY(node))).sort((a, b) => a - b);
  assert.ok(Math.abs(ys[1] - ys[0] - 0.3) < 1e-6);
});

test('sketch external drawer cut envelope matches drawer front envelope', async () => {
  const src = await readSourceFiles([
    '../esm/native/builder/post_build_sketch_door_cuts.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_modules.ts',
  ]);
  const mod = await import('../esm/native/builder/post_build_extras_pipeline.ts');
  assert.match(src, /const frontInset = 0\.004;/);
  assert.match(src, /const surroundingGap = 0\.006;/);
  assert.match(src, /const faceMinY = baseY \+ frontInset - surroundingGap;/);
  assert.match(src, /const faceMaxY = baseY \+ stackH - frontInset \+ surroundingGap;/);
  assert.equal(typeof mod.applyPostBuildExtras, 'function');
});

test('custom segmented sketch door handles are preserved by generic handles pass', async () => {
  const src = await readSourceFiles([
    '../esm/native/builder/handles.ts',
    '../esm/native/builder/handles_apply.ts',
    '../esm/native/builder/handles_apply_shared.ts',
    '../esm/native/builder/handles_apply_doors.ts',
    '../esm/native/builder/handles_apply_drawers.ts',
  ]);
  assert.match(src, /__wpSketchCustomHandles === true/);
});

test('generic drawer handles target only root drawer groups so sketch profile fronts do not get a second handle', async () => {
  const src = await readSourceFiles([
    '../esm/native/builder/handles_apply.ts',
    '../esm/native/builder/handles_apply_drawers.ts',
  ]);
  assert.match(src, /function isDrawerLikeGroup\(node: NodeLike \| null \| undefined\): boolean \{/);
  assert.match(src, /function hasDrawerAncestor\(node: NodeLike \| null \| undefined\): boolean \{/);
  assert.match(src, /if \(!isDrawerLikeGroup\(c\) \|\| hasDrawerAncestor\(c\)\) return;/);
});

test('sketch external drawers source keeps module faces aligned to real door span and free boxes enabled', async () => {
  const src = [
    await readSourceFiles([
      '../esm/native/builder/render_interior_sketch_ops.ts',
      '../esm/native/builder/render_interior_sketch_ops_input.ts',
      '../esm/native/builder/render_interior_sketch_module_geometry.ts',
      '../esm/native/builder/render_interior_sketch_drawers.ts',
      '../esm/native/builder/render_interior_sketch_drawers_shared.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_apply.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_context.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_plan.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_group.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_visual.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_box.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_motion.ts',
      '../esm/native/builder/render_interior_sketch_drawers_internal.ts',
      '../esm/native/builder/render_interior_sketch_boxes.ts',
    ]),
    await readSketchBoxFrontsBundle(),
  ].join('\n');
  const sketchPickMeta = await readSourceFiles(['../esm/native/builder/render_interior_sketch_pick_meta.ts']);
  const shared = await readSourceFiles([
    '../esm/native/builder/render_interior_sketch_shared.ts',
    '../esm/native/builder/render_interior_sketch_shared_external_drawers.ts',
  ]);
  assert.match(src, /const moduleDoorFaceSpan = resolveSketchModuleDoorFaceSpan\(\{/);
  assert.match(src, /const drawerFaceW = context\.moduleDoorFaceSpan\?\.spanW \?\? context\.outerW;/);
  assert.match(
    src,
    /const drawerFaceOffsetX =\s*\(context\.moduleDoorFaceSpan\?\.centerX \?\? context\.internalCenterX\) - context\.internalCenterX;/
  );
  assert.match(
    src,
    /applySketchExternalDrawerFaceOverrides\(drawerOps, drawerFaceW, drawerFaceOffsetX, context\.frontZ\);/
  );
  assert.match(shared, /drawer\.faceW = faceW;/);
  assert.match(sketchPickMeta, /export function applySketchModulePickMeta\(/);
  assert.match(src, /const faceW = Math\.max\(0\.05, toFiniteNumber\(op\.faceW\) \?\? visualW\);/);
  assert.match(src, /visualObj\.position\?\.set\?\.\(opPlan\.faceOffsetX, opPlan\.faceOffsetY, 0\);/);
  assert.match(src, /const doorStyle = resolveSketchDoorStyle\(App, input\);/);
  assert.match(
    src,
    /resolveSketchFrontVisualState\(context\.input, opPlan\.partId\)[\s\S]*context\.input\.createDoorVisual\([\s\S]*materialSet\.frontFaceMat,[\s\S]*frontVisualState\.isGlass[\s\S]*resolveEffectiveDoorStyle\(context\.doorStyle, context\.doorStyleMap, opPlan\.partId\),[\s\S]*frontVisualState\.mirrorLayout,[\s\S]*opPlan\.partId/
  );
  assert.match(src, /const boxExtDrawers = asRecordArray<InteriorValueRecord>\(box\.extDrawers\);/);
});

test('sketch box drawers and external drawers source use divider-aware spans', async () => {
  const src = [
    await readSourceFiles([
      '../esm/native/builder/render_interior_sketch_ops.ts',
      '../esm/native/builder/render_interior_sketch_ops_input.ts',
      '../esm/native/builder/render_interior_sketch_boxes.ts',
      '../esm/native/builder/render_interior_sketch_boxes_contents.ts',
      '../esm/native/builder/render_interior_sketch_boxes_contents_parts.ts',
      '../esm/native/builder/render_interior_sketch_boxes_contents_drawers.ts',
    ]),
    await readSketchBoxFrontsBundle(),
  ].join('\n');
  assert.match(src, /return \(item: InteriorValueRecord \| null\) => \{/);
  assert.match(src, /const boxDrawers = asRecordArray<SketchDrawerExtra>\(box\.drawers\);/);
  assert.match(src, /const spanSource = readRecord\(drawer\);/);
  assert.match(src, /const span = resolveBoxDrawerSpan\(spanSource\);/);
  assert.match(src, /const drawerFaceW = span\.faceW;/);
  assert.match(src, /const drawerFaceOffsetX = span\.faceCenterX - span\.outerCenterX;/);
});

test('sketch box external drawer cuts rebuild segmented box doors from drawer runtime bounds', async () => {
  const src = await readSourceFiles([
    '../esm/native/builder/post_build_sketch_door_cuts.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_box.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_shared.ts',
  ]);
  const applySrc = await readSourceFiles(['../esm/native/builder/post_build_sketch_door_cuts_apply.ts']);
  const orchestratorSrc = await readSourceFiles(['../esm/native/builder/post_build_visual_overlays.ts']);
  const bundle = `${src}\n${applySrc}`;
  assert.match(
    src,
    /function collectSketchBoxExternalDrawerStackBounds\(App: AppContainer\): SketchBoxDrawerStackBounds\[]/
  );
  assert.match(src, /ud\.__wpSketchExtDrawer !== true/);
  assert.match(
    bundle,
    /const overlap = Math\.min\(doorXMax, stack\.xMax\) - Math\.max\(doorXMin, stack\.xMin\);/
  );
  assert.match(
    orchestratorSrc,
    /applySketchBoxExternalDrawerDoorCuts\([\s\S]*applyFrontRevealFrames\(ctx\);/
  );
});

test('sketch external drawers source matches regular width span, floor alignment, and segmented door frames', async () => {
  const sketchSrc = await readSourceFiles([
    '../esm/native/builder/render_interior_sketch_module_geometry.ts',
    '../esm/native/builder/render_interior_sketch_drawers.ts',
    '../esm/native/builder/render_interior_sketch_drawers_shared.ts',
    '../esm/native/builder/render_interior_sketch_drawers_external.ts',
    '../esm/native/builder/render_interior_sketch_drawers_external_plan.ts',
    '../esm/native/builder/render_interior_sketch_boxes.ts',
  ]);
  assert.match(
    sketchSrc,
    /const startDoorId = Math\.max\(1, Math\.floor\(toFiniteNumber\(input\.startDoorId\) \?\? 1\)\);/
  );
  assert.match(
    sketchSrc,
    /const moduleDoors = Math\.max\(1, Math\.floor\(toFiniteNumber\(input\.moduleDoors\) \?\? 1\)\);/
  );
  assert.match(sketchSrc, /const pivotMap = readObject<InteriorValueRecord>\(input\.hingedDoorPivotMap\);/);
  assert.match(sketchSrc, /startY: baseY - context\.woodThick,/);
});

test('sketch external drawer cuts and reveal frames use visible face envelope and segmented door frames', async () => {
  const sketchCutsSrc = await readSourceFiles([
    '../esm/native/builder/post_build_sketch_door_cuts.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_modules.ts',
  ]);
  const revealSrc = await readSourceFiles([
    '../esm/native/builder/post_build_front_reveal_frames.ts',
    '../esm/native/builder/post_build_front_reveal_frames_doors.ts',
  ]);
  const orchestratorSrc = await readSourceFiles(['../esm/native/builder/post_build_visual_overlays.ts']);
  assert.match(sketchCutsSrc, /const faceMinY = baseY \+ frontInset - surroundingGap;/);
  assert.match(sketchCutsSrc, /const faceMaxY = baseY \+ stackH - frontInset \+ surroundingGap;/);
  assert.match(revealSrc, /if \(g\.userData\.__wpSketchSegmentedDoor\) \{/);
  assert.match(revealSrc, /segUd\.__wpSketchDoorSegment/);
  assert.match(orchestratorSrc, /applySketchExternalDrawerDoorCuts\([\s\S]*applyFrontRevealFrames\(ctx\);/);
});

test('module sketch external drawer cuts use runtime drawer bounds so corner cells follow the real drawer front envelope', async () => {
  const src = await readSourceFiles([
    '../esm/native/builder/post_build_sketch_door_cuts.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_modules.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_shared.ts',
  ]);
  const applySrc = await readSourceFiles(['../esm/native/builder/post_build_sketch_door_cuts_apply.ts']);
  const bundle = `${src}\n${applySrc}`;
  assert.match(
    src,
    /function collectSketchModuleExternalDrawerStackBounds\(App: AppContainer\): SketchModuleDrawerStackBounds\[]/
  );
  assert.match(
    src,
    /const runtimeBounds = collectSketchModuleExternalDrawerStackBounds\(App\)[\s\S]*item => item\.stackKey === stackKey[\s\S]*\);/
  );
  assert.match(
    src,
    /const moduleKeyRaw =[\s\S]*readStringOrNull\(ud\.__wpSketchModuleKey\) \|\| readStringOrNull\(ud\.moduleIndex\);/
  );
  assert.match(
    bundle,
    /const overlap = Math\.min\(doorXMax, stack\.xMax\) - Math\.max\(doorXMin, stack\.xMin\);/
  );
});

test('stack-split upper sketch external drawer face bounds are shifted with moved drawer groups', async () => {
  const src = await readSourceFiles(['../esm/native/builder/build_stack_shift_runtime.ts']);
  assert.match(src, /const userData = readRecord\(readRecord\(drawer\.group\)\?\.userData\);/);
  assert.match(src, /userData\.__wpFaceMinY \+= dy;/);
  assert.match(src, /userData\.__wpFaceMaxY \+= dy;/);
});

test('stack-split lower module sketch external drawer cuts run bottom pass and keep fallback stack-local', async () => {
  const overlaySrc = await readSourceFiles(['../esm/native/builder/post_build_visual_overlays.ts']);
  const cutsSrc = await readSourceFiles([
    '../esm/native/builder/post_build_sketch_door_cuts_modules.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_runtime.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_contracts.ts',
  ]);

  assert.match(overlaySrc, /const moduleCutStackKeys: Array<'top' \| 'bottom'> =[\s\S]*\['top', 'bottom'\]/);
  assert.match(overlaySrc, /stackKey: moduleCutStackKeys\[i\]/);
  assert.match(overlaySrc, /allowConfigFallback: moduleCutStackKeys\[i\] === stackKey/);
  assert.match(cutsSrc, /function normalizeSketchModuleCutKey\(/);
  assert.match(
    cutsSrc,
    /if \(stackKey === 'bottom'\) return key\.startsWith\('lower_'\) \? key : `lower_\$\{key\}`;/
  );
  assert.match(
    cutsSrc,
    /const moduleKey = normalizeSketchModuleCutKey\([\s\S]*readStringOrNull\(ud\.moduleIndex\),[\s\S]*stackKey[\s\S]*\);/
  );
  assert.match(cutsSrc, /getHandleType \? getHandleType\(partId, stackKey\) : null/);
  assert.match(cutsSrc, /stackKey\?: 'top' \| 'bottom';/);
  assert.match(cutsSrc, /allowConfigFallback\?: boolean;/);
  assert.match(cutsSrc, /const allowConfigFallback = args\.allowConfigFallback !== false;/);
  assert.match(cutsSrc, /if \(!stacksByModule\.size && allowConfigFallback\) \{/);
  assert.match(
    cutsSrc,
    /if \(!stacksByModule\.size\) return;[\s\S]*const runtime = createSketchDoorCutsRuntime\(\{/
  );
});
