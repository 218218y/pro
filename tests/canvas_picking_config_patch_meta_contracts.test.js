import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';
import { getCallFacts, getFunctionSignatureFact } from './_semantic_source_contracts.js';

const readRaw = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const read = rel => normalizeWhitespace(readRaw(rel));

const configPatchMeta = read('esm/native/services/canvas_picking_config_patch_meta.ts');
const configPatchMetaRaw = readRaw('esm/native/services/canvas_picking_config_patch_meta.ts');
const layoutFlow = read('esm/native/services/canvas_picking_layout_edit_flow.ts');
const layoutFlowRaw = readRaw('esm/native/services/canvas_picking_layout_edit_flow.ts');
const layoutFlowManual = read('esm/native/services/canvas_picking_layout_edit_flow_manual.ts');
const layoutFlowManualRaw = readRaw('esm/native/services/canvas_picking_layout_edit_flow_manual.ts');
const layoutFlowBrace = read('esm/native/services/canvas_picking_layout_edit_flow_brace.ts');
const layoutFlowBraceRaw = readRaw('esm/native/services/canvas_picking_layout_edit_flow_brace.ts');
const drawerFlowExternal = read('esm/native/services/canvas_picking_drawer_mode_flow_external.ts');
const drawerFlowExternalRaw = readRaw('esm/native/services/canvas_picking_drawer_mode_flow_external.ts');
const drawerRemovePlan = read('esm/native/services/canvas_picking_drawer_cross_family_remove_plan.ts');
const drawerRemovePlanRaw = readRaw('esm/native/services/canvas_picking_drawer_cross_family_remove_plan.ts');
const sketchHoverApply = read('esm/native/services/canvas_picking_manual_layout_sketch_click_hover_apply.ts');
const sketchHoverApplyRaw = readRaw(
  'esm/native/services/canvas_picking_manual_layout_sketch_click_hover_apply.ts'
);
const sketchModeClick = read('esm/native/services/canvas_picking_manual_layout_sketch_click_mode_flow.ts');
const sketchModeClickRaw = readRaw(
  'esm/native/services/canvas_picking_manual_layout_sketch_click_mode_flow.ts'
);
const sketchDirectHitDrawer = read('esm/native/services/canvas_picking_sketch_direct_hit_workflow_drawer.ts');
const sketchDirectHitShelf = read('esm/native/services/canvas_picking_sketch_direct_hit_workflow_shelf.ts');
const sketchDirectHitShelfRaw = readRaw(
  'esm/native/services/canvas_picking_sketch_direct_hit_workflow_shelf.ts'
);

test('canvas picking config patches use one immediate-build structural meta owner', () => {
  assert.deepEqual(
    getFunctionSignatureFact(
      configPatchMetaRaw,
      'createCanvasPickingConfigStructuralPatchMeta',
      'esm/native/services/canvas_picking_config_patch_meta.ts'
    ),
    {
      name: 'createCanvasPickingConfigStructuralPatchMeta',
      async: false,
      params: [{ name: 'source', optional: false, type: 'string' }],
      returnType: 'ActionMetaLike',
    }
  );
  assert.match(configPatchMeta, /Canvas picking config structural patch requires a source/);
  assert.match(configPatchMeta, /immediate: true/);
  assert.doesNotMatch(configPatchMeta, /noBuild:/);
  assert.doesNotMatch(configPatchMeta, /noHistory:/);

  const helperImportPattern =
    /import \{ createCanvasPickingConfigStructuralPatchMeta \} from '\.\/canvas_picking_config_patch_meta\.js';/;
  const structuralWriteFiles = [
    layoutFlow,
    layoutFlowManual,
    layoutFlowBrace,
    drawerFlowExternal,
    drawerRemovePlan,
    sketchHoverApply,
    sketchModeClick,
    sketchDirectHitShelf,
  ];
  for (const source of structuralWriteFiles) {
    assert.match(source, helperImportPattern);
    assert.doesNotMatch(source, /\{\s*source:\s*[^}]*immediate:\s*true\s*\}/);
    assert.doesNotMatch(source, /noBuild:/);
    assert.doesNotMatch(source, /noHistory:/);
  }

  const sourceTags = source =>
    getCallFacts(source, 'createCanvasPickingConfigStructuralPatchMeta').map(call => call.args[0]);
  assert.deepEqual(sourceTags(layoutFlowRaw), [{ kind: 'literal', value: 'layoutPreset' }]);
  assert.deepEqual(sourceTags(layoutFlowManualRaw), [
    { kind: 'literal', value: 'manualLayout.fillAllShelves' },
    { kind: 'literal', value: 'manualLayout.toggleItem' },
  ]);
  assert.ok(
    sourceTags(layoutFlowBraceRaw).some(
      fact => fact.kind === 'literal' && fact.value === 'braceShelves.toggle'
    )
  );
  assert.deepEqual(sourceTags(drawerFlowExternalRaw), [{ kind: 'literal', value: 'extDrawers.toggle' }]);
  assert.deepEqual(sourceTags(drawerRemovePlanRaw), [{ kind: 'member', path: 'args.source' }]);
  const sketchHoverMetaFacts = sourceTags(sketchHoverApplyRaw);
  assert.ok(
    sketchHoverMetaFacts.some(
      fact =>
        fact.kind === 'call' &&
        fact.callee === 'getSketchModuleBoxContentSource' &&
        fact.args[0]?.kind === 'identifier' &&
        fact.args[0].name === 'contentKind'
    )
  );
  for (const expectedSource of [
    'sketch.hoverRemoveRod',
    'sketch.hoverRemoveStorage',
    'sketch.hoverAddShelf',
    'sketch.hoverRemoveShelf',
  ]) {
    assert.ok(
      sketchHoverMetaFacts.some(fact => fact.kind === 'literal' && fact.value === expectedSource),
      `missing structural meta source ${expectedSource}`
    );
  }
  assert.deepEqual(sourceTags(sketchModeClickRaw), [{ kind: 'literal', value: 'sketch.place' }]);
  assert.match(sketchDirectHitDrawer, /source: 'sketch\.removeExternalDrawerByCrossHit'/);
  assert.match(sketchDirectHitDrawer, /source: 'sketch\.removeInternalDrawerByHit\.guardY'/);
  assert.match(sketchDirectHitDrawer, /source: 'sketch\.removeInternalDrawerByCrossHit'/);
  assert.match(sketchDirectHitDrawer, /source: 'sketch\.removeStandardExternalDrawerByHit'/);
  assert.match(sketchDirectHitDrawer, /source: 'sketch\.removeExternalDrawerByHit'/);
  assert.deepEqual(sourceTags(sketchDirectHitShelfRaw), [
    { kind: 'literal', value: 'sketch.toggleBaseShelf' },
  ]);
});
