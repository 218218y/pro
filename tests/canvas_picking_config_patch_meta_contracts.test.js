import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

const configPatchMeta = read('esm/native/services/canvas_picking_config_patch_meta.ts');
const layoutFlow = read('esm/native/services/canvas_picking_layout_edit_flow.ts');
const layoutFlowManual = read('esm/native/services/canvas_picking_layout_edit_flow_manual.ts');
const layoutFlowBrace = read('esm/native/services/canvas_picking_layout_edit_flow_brace.ts');
const drawerFlowExternal = read('esm/native/services/canvas_picking_drawer_mode_flow_external.ts');
const drawerCrossFamily = read('esm/native/services/canvas_picking_drawer_cross_family.ts');
const sketchHoverApply = read('esm/native/services/canvas_picking_manual_layout_sketch_click_hover_apply.ts');
const sketchModeClick = read('esm/native/services/canvas_picking_manual_layout_sketch_click_mode_flow.ts');
const sketchDirectHitDrawer = read('esm/native/services/canvas_picking_sketch_direct_hit_workflow_drawer.ts');
const sketchDirectHitShelf = read('esm/native/services/canvas_picking_sketch_direct_hit_workflow_shelf.ts');

test('canvas picking config patches use one immediate-build structural meta owner', () => {
  assert.match(
    configPatchMeta,
    /export function createCanvasPickingConfigStructuralPatchMeta\(source: string\): ActionMetaLike/
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
    drawerCrossFamily,
    sketchHoverApply,
    sketchModeClick,
    sketchDirectHitDrawer,
    sketchDirectHitShelf,
  ];
  for (const source of structuralWriteFiles) {
    assert.match(source, helperImportPattern);
    assert.doesNotMatch(source, /\{\s*source:\s*[^}]*immediate:\s*true\s*\}/);
    assert.doesNotMatch(source, /noBuild:/);
    assert.doesNotMatch(source, /noHistory:/);
  }

  assert.match(layoutFlow, /createCanvasPickingConfigStructuralPatchMeta\('layoutPreset'\)/);
  assert.match(
    layoutFlowManual,
    /createCanvasPickingConfigStructuralPatchMeta\('manualLayout\.fillAllShelves'\)/
  );
  assert.match(
    layoutFlowManual,
    /createCanvasPickingConfigStructuralPatchMeta\('manualLayout\.toggleItem'\)/
  );
  assert.match(layoutFlowBrace, /createCanvasPickingConfigStructuralPatchMeta\('braceShelves\.toggle'\)/);
  assert.match(drawerFlowExternal, /createCanvasPickingConfigStructuralPatchMeta\('extDrawers\.toggle'\)/);
  assert.match(drawerCrossFamily, /createCanvasPickingConfigStructuralPatchMeta\(args\.source\)/);
  assert.match(
    sketchHoverApply,
    /createCanvasPickingConfigStructuralPatchMeta\(getSketchModuleBoxContentSource\(contentKind\)\)/
  );
  assert.match(sketchHoverApply, /createCanvasPickingConfigStructuralPatchMeta\('sketch\.hoverRemoveRod'\)/);
  assert.match(
    sketchHoverApply,
    /createCanvasPickingConfigStructuralPatchMeta\('sketch\.hoverRemoveStorage'\)/
  );
  assert.match(sketchHoverApply, /createCanvasPickingConfigStructuralPatchMeta\('sketch\.hoverAddShelf'\)/);
  assert.match(
    sketchHoverApply,
    /createCanvasPickingConfigStructuralPatchMeta\('sketch\.hoverRemoveShelf'\)/
  );
  assert.match(sketchModeClick, /createCanvasPickingConfigStructuralPatchMeta\('sketch\.place'\)/);
  assert.match(
    sketchDirectHitDrawer,
    /createCanvasPickingConfigStructuralPatchMeta\('sketch\.removeExternalDrawerByCrossHit'\)/
  );
  assert.match(
    sketchDirectHitDrawer,
    /createCanvasPickingConfigStructuralPatchMeta\('sketch\.removeInternalDrawerByHit\.guardY'\)/
  );
  assert.match(
    sketchDirectHitDrawer,
    /createCanvasPickingConfigStructuralPatchMeta\('sketch\.removeInternalDrawerByCrossHit'\)/
  );
  assert.match(
    sketchDirectHitDrawer,
    /createCanvasPickingConfigStructuralPatchMeta\('sketch\.removeStandardExternalDrawerByHit'\)/
  );
  assert.match(
    sketchDirectHitDrawer,
    /createCanvasPickingConfigStructuralPatchMeta\('sketch\.removeExternalDrawerByHit'\)/
  );
  assert.match(
    sketchDirectHitShelf,
    /createCanvasPickingConfigStructuralPatchMeta\('sketch\.toggleBaseShelf'\)/
  );
});
