import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const lineCount = rel =>
  fs
    .readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')
    .trim()
    .split(/\r?\n/).length;

const layoutFlow = read('esm/native/services/canvas_picking_layout_edit_flow.ts');
const layoutFlowManual = read('esm/native/services/canvas_picking_layout_edit_flow_manual.ts');
const sketchTools = read('esm/native/services/canvas_picking_manual_layout_sketch_tools.ts');
const hoverTools = read('esm/native/services/canvas_picking_manual_layout_sketch_hover_tools.ts');
const hoverToolsShared = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_shared.ts'
);
const hoverToolsSelector = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_selector.ts'
);
const hoverToolsRouter = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_router.ts'
);
const hoverApply = read('esm/native/services/canvas_picking_manual_layout_sketch_click_hover_apply.ts');
const directHit = read('esm/native/services/canvas_picking_manual_layout_sketch_click_direct_hit_actions.ts');
const directHitWorkflow = normalizeWhitespace(
  [
    read('esm/native/services/canvas_picking_sketch_direct_hit_workflow.ts'),
    read('esm/native/services/canvas_picking_sketch_direct_hit_workflow_drawer.ts'),
    read('esm/native/services/canvas_picking_sketch_direct_hit_workflow_shelf.ts'),
  ].join('\n')
);
const modeFlow = read('esm/native/services/canvas_picking_manual_layout_sketch_click_mode_flow.ts');
const audit = read('docs/layering_completion_audit.md');

test('manual-layout sketch click and hover owners stay thin and route through dedicated helper families', () => {
  assert.ok(lineCount('esm/native/services/canvas_picking_manual_layout_sketch_tools.ts') < 350);
  assert.ok(lineCount('esm/native/services/canvas_picking_manual_layout_sketch_hover_tools.ts') < 20);
  assert.ok(lineCount('esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_router.ts') < 220);

  assert.ok(lineCount('esm/native/services/canvas_picking_layout_edit_flow.ts') < 80);
  assert.match(
    layoutFlow,
    /import \{\s*tryHandleCanvasManualLayoutClick\s*,?\s*\} from '\.\/canvas_picking_layout_edit_flow_manual\.js';/
  );
  assert.match(layoutFlow, /tryHandleCanvasManualLayoutClick\(args\)/);
  assert.match(
    layoutFlowManual,
    /import \{\s*tryHandleManualLayoutSketchToolClick\s*,?\s*\} from '\.\/canvas_picking_manual_layout_sketch_tools\.js';/
  );
  assert.match(layoutFlowManual, /tryHandleManualLayoutSketchToolClick\(\{/);

  assert.match(
    sketchTools,
    /import \{\s*tryApplyManualLayoutSketchHoverClick\s*,?\s*\} from '\.\/canvas_picking_manual_layout_sketch_click_hover_apply\.js';/
  );
  assert.match(
    sketchTools,
    /import \{\s*tryApplyManualLayoutSketchDirectHitActions\s*,?\s*\} from '\.\/canvas_picking_manual_layout_sketch_click_direct_hit_actions\.js';/
  );
  assert.match(
    sketchTools,
    /import \{\s*tryApplyManualLayoutSketchModeClick\s*,?\s*\} from '\.\/canvas_picking_manual_layout_sketch_click_mode_flow\.js';/
  );
  assert.match(sketchTools, /tryApplyManualLayoutSketchHoverClick\(\{/);
  assert.match(sketchTools, /tryApplyManualLayoutSketchDirectHitActions\(\{/);
  assert.match(sketchTools, /tryApplyManualLayoutSketchModeClick\(\{/);
  assert.doesNotMatch(sketchTools, /if \(__mt === 'sketch_int_drawers'\) \{/);
  assert.doesNotMatch(sketchTools, /const isBox = __mt\.startsWith\(__SKETCH_BOX_TOOL_PREFIX\);/);

  assert.match(hoverTools, /canvas_picking_manual_layout_sketch_hover_tools_router\.js/);
  assert.match(hoverToolsRouter, /tryHandleManualLayoutSketchHoverFreeFlow\(\{/);
  assert.match(hoverToolsRouter, /tryHandleManualLayoutSketchHoverModuleFlow\(\{/);
  assert.match(hoverToolsRouter, /resolvePreferredManualLayoutSketchSelectorHit\(\{/);
  assert.match(hoverToolsShared, /export function readManualLayoutSketchHoverRuntime\(/);
  assert.match(hoverToolsShared, /const tool = readActiveManualTool\(App\) \|\| '';/);
  assert.match(hoverToolsSelector, /export function resolvePreferredManualLayoutSketchSelectorHit\(/);
  assert.match(hoverToolsSelector, /preferModuleSelectorCandidate\(/);
  assert.match(hoverToolsSelector, /readModuleSelectorHit\(intersects\[i\], toModuleKey\)/);
  assert.match(hoverApply, /export function tryApplyManualLayoutSketchHoverClick/);
  assert.match(directHit, /export function tryApplyManualLayoutSketchDirectHitActions/);
  assert.match(directHit, /tryApplySketchDirectHitDrawerActions\(args\)/);
  assert.match(directHit, /tryApplySketchDirectHitShelfActions\(args\)/);
  assert.match(directHitWorkflow, /tryApplySketchDirectHitDrawerActions/);
  assert.match(directHitWorkflow, /tryApplySketchDirectHitShelfActions/);
  assert.match(modeFlow, /export function tryApplyManualLayoutSketchModeClick/);

  assert.ok(
    audit.includes(
      '`canvas_picking_manual_layout_sketch_tools.ts` now routes through dedicated click helpers for hover-backed actions, direct-hit toggles, and placement mode writes'
    )
  );
  assert.ok(
    audit.includes(
      '`services/canvas_picking_layout_edit_flow.ts` now stays a thin routing seam while manual-layout grid/toggle/sketch-tool policy lives in `services/canvas_picking_layout_edit_flow_manual.ts`, brace-shelf hit/validation/toggle policy lives in `services/canvas_picking_layout_edit_flow_brace.ts`, and shared grid/config record helpers live in `services/canvas_picking_layout_edit_flow_shared.ts`'
    )
  );
  assert.ok(
    audit.includes(
      '`canvas_picking_manual_layout_sketch_hover_tools.ts` now routes through a dedicated free-placement helper plus a thin canonical module-hover owner backed by focused context/divider/preview services.'
    )
  );
});
