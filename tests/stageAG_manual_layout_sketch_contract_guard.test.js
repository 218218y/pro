import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

test('[stageAG] manual-layout sketch helpers share explicit contracts instead of broad AnyRecord helper signatures', () => {
  const hoverOwner = read('esm/native/services/canvas_picking_manual_layout_sketch_hover_tools.ts');
  const hoverShared = read('esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_shared.ts');
  const hoverSelector = read(
    'esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_selector.ts'
  );
  const hoverRouter = read('esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_router.ts');
  const hoverFree = read('esm/native/services/canvas_picking_manual_layout_sketch_hover_free_flow.ts');
  const hoverModule = read('esm/native/services/canvas_picking_manual_layout_sketch_hover_module_flow.ts');
  const hoverModuleContext = read(
    'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context.ts'
  );
  const hoverModuleDivider = read(
    'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_divider_flow.ts'
  );
  const hoverModulePreview = read(
    'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_flow.ts'
  );
  const hoverModuleContracts = read(
    'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_contracts.ts'
  );
  const clickOwner = read('esm/native/services/canvas_picking_manual_layout_sketch_tools.ts');
  const clickMode = read('esm/native/services/canvas_picking_manual_layout_sketch_click_mode_flow.ts');
  const contracts = read('esm/native/services/canvas_picking_manual_layout_sketch_contracts.ts');

  assert.match(hoverOwner, /canvas_picking_manual_layout_sketch_hover_tools_router\.js/);
  assert.match(hoverShared, /canvas_picking_manual_layout_sketch_contracts\.js/);
  assert.match(hoverSelector, /canvas_picking_manual_layout_sketch_contracts\.js/);
  assert.match(hoverRouter, /canvas_picking_manual_layout_sketch_hover_tools_shared\.js/);
  assert.match(hoverFree, /canvas_picking_manual_layout_sketch_contracts\.js/);
  assert.match(hoverModule, /canvas_picking_manual_layout_sketch_hover_module_contracts\.js/);
  assert.match(hoverModuleContext, /canvas_picking_manual_layout_sketch_hover_module_contracts\.js/);
  assert.match(hoverModuleDivider, /canvas_picking_manual_layout_sketch_hover_module_contracts\.js/);
  assert.match(hoverModulePreview, /canvas_picking_manual_layout_sketch_hover_module_contracts\.js/);
  assert.match(hoverModuleContracts, /canvas_picking_manual_layout_sketch_contracts\.js/);
  assert.match(hoverModuleContracts, /export type ManualLayoutSketchHoverModuleFlowArgs = \{/);
  assert.match(clickOwner, /canvas_picking_manual_layout_sketch_contracts\.js/);
  assert.match(clickMode, /canvas_picking_manual_layout_sketch_contracts\.js/);

  assert.match(contracts, /export type ModuleKey = number \| 'corner' \| `corner:\$\{number\}`;/);
  assert.match(contracts, /export type SketchBoxGeometryArgs = \{/);
  assert.match(contracts, /export type ResolveSketchFreeBoxHoverPlacementArgs = \{/);

  assert.doesNotMatch(hoverFree, /__wp_resolveSketchFreeBoxGeometry: \(args: AnyRecord\) => any/);
  assert.doesNotMatch(hoverFree, /__wp_resolveSketchBoxSegments: \(args: AnyRecord\) => AnyRecord\[]/);
  assert.doesNotMatch(hoverModulePreview, /__wp_resolveSketchBoxGeometry: \(args: AnyRecord\) => any/);
  assert.doesNotMatch(clickMode, /__wp_resolveSketchBoxGeometry: \(args: AnyRecord\) => AnyRecord/);
});
