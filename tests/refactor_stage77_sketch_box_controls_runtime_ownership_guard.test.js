import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  REFACTOR_COMPLETED_STAGE_LABELS,
  REFACTOR_INTEGRATION_ANCHORS,
} from '../tools/wp_refactor_stage_catalog.mjs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const GUARD_FILE = 'tests/refactor_stage77_sketch_box_controls_runtime_ownership_guard.test.js';

test('stage 77 sketch box controls runtime ownership split is anchored', () => {
  const progress = read('docs/REFACTOR_WORKMAP_PROGRESS.md');
  const workmap = read('refactor_workmap.md');
  const nextPlan = read('docs/REFACTOR_NEXT_STAGE_PLAN.md');
  const integrationAudit = read('tools/wp_refactor_integration_audit.mjs');
  const pkg = JSON.parse(read('package.json'));

  assert.ok(REFACTOR_COMPLETED_STAGE_LABELS.includes('Stage 77'));
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 77 sketch box controls runtime ownership split is anchored')
    ),
    'stage 77 must be registered in the shared refactor stage catalog anchors'
  );
  assert.ok(
    pkg.scripts['test:refactor-stage-guards'].includes(GUARD_FILE),
    'stage 77 guard must be wired into the stage guard lane'
  );
  assert.ok(integrationAudit.includes(GUARD_FILE), 'integration audit must require the stage 77 guard');
  assert.match(progress, /Stage 77/);
  assert.match(workmap, /Stage 77/);
  assert.match(nextPlan, /Stage 77 — UI sketch-box controls controller\/view review — completed/);

  const section = read('esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx');
  const facade = read('esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime.ts');
  const types = read('esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_types.ts');
  const sync = read('esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_sync.ts');
  const dimensions = read(
    'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_dimensions.ts'
  );
  const panels = read('esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_panels.ts');
  const base = read('esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_base.ts');
  const cornice = read('esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_cornice.ts');
  const state = read('esm/native/ui/react/tabs/interior_layout_sketch_box_controls_state.ts');
  const options = read('esm/native/ui/react/tabs/interior_layout_sketch_box_controls_options.ts');
  const components = read('esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx');

  assert.match(section, /readSketchBoxControlsViewState\(props\)/);
  assert.match(section, /interior_layout_sketch_box_controls_options\.js/);
  assert.match(section, /from '\.\/interior_layout_sketch_box_controls_runtime\.js';/);
  assert.doesNotMatch(
    section,
    /interior_layout_sketch_box_controls_runtime_(types|sync|dimensions|panels|base|cornice)\.js/,
    'sketch-box controls section must use the runtime facade instead of private runtime owners'
  );
  assert.doesNotMatch(
    section,
    /isSketchBoxTool\(|startsWith\(SKETCH_TOOL_BOX_(BASE|CORNICE)_PREFIX\)/,
    'sketch-box controls section must not own active-tool state derivation'
  );

  assert.match(facade, /from '\.\/interior_layout_sketch_box_controls_runtime_dimensions\.js';/);
  assert.match(facade, /from '\.\/interior_layout_sketch_box_controls_runtime_panels\.js';/);
  assert.match(facade, /from '\.\/interior_layout_sketch_box_controls_runtime_base\.js';/);
  assert.match(facade, /from '\.\/interior_layout_sketch_box_controls_runtime_cornice\.js';/);
  assert.doesNotMatch(
    facade,
    /props\.setSketchBox|normalizeBaseLeg|enterSketchBoxTool\(|function /,
    'sketch-box controls runtime facade must re-export owners without owning UI mutations'
  );

  assert.match(types, /export type OptionalDimensionField = 'width' \| 'depth';/);
  assert.match(types, /export type SketchBoxToolId = 'divider' \| 'door' \| 'doorHinge' \| 'doubleDoor';/);
  assert.doesNotMatch(types, /InteriorSketchBoxControlsSectionProps|props\.|export function/);

  assert.match(sync, /export function syncSketchBoxTool\(/);
  assert.match(sync, /props\.enterSketchBoxTool\(heightCm, widthCm, depthCm\);/);
  assert.match(sync, /export function syncSketchBoxBaseTool\(/);
  assert.doesNotMatch(sync, /setSketchShelvesOpen|normalizeBaseLeg|SKETCH_BOX_HEIGHT_MAX_CM/);

  assert.match(dimensions, /export function updateSketchBoxHeightDraft\(/);
  assert.match(dimensions, /export function updateSketchBoxOptionalDimensionDraft\(/);
  assert.match(dimensions, /setOptionalDimensionDraft\(props, field, raw\);/);
  assert.match(dimensions, /syncSketchBoxTool\(/);
  assert.doesNotMatch(dimensions, /normalizeBaseLeg|enterSketchBoxCorniceTool|toggleSketchBoxBasePanel/);

  assert.match(panels, /export function toggleSketchBoxControlsPanel\(/);
  assert.match(panels, /export function toggleSketchBoxTool\(/);
  assert.match(panels, /export function toggleSketchBoxBasePanel\(/);
  assert.match(panels, /export function toggleSketchBoxCornicePanel\(/);
  assert.doesNotMatch(panels, /normalizeBaseLeg|setOptionalDimensionDraft|SKETCH_BOX_OPTIONAL_DIM/);

  assert.match(base, /export function selectSketchBoxBaseType\(/);
  assert.match(base, /export function selectSketchBoxLegStyle\(/);
  assert.match(base, /export function updateSketchBoxLegHeightDraft\(/);
  assert.match(base, /normalizeBaseLegHeightCm\(/);
  assert.match(base, /normalizeBaseLegWidthCm\(/);
  assert.doesNotMatch(base, /enterSketchBoxCorniceTool|SKETCH_BOX_OPTIONAL_DIM|setSketchBoxCornicePanelOpen/);

  assert.match(cornice, /export function selectSketchBoxCorniceType\(/);
  assert.match(cornice, /props\.enterSketchBoxCorniceTool\(type\);/);
  assert.doesNotMatch(cornice, /normalizeBaseLeg|syncSketchBoxTool|setSketchBoxBaseType/);

  assert.match(state, /export function readSketchBoxControlsViewState\(/);
  assert.match(state, /isSketchBoxTool\(props\.manualToolRaw\)/);
  assert.match(state, /startsWith\(SKETCH_TOOL_BOX_BASE_PREFIX\)/);
  assert.match(state, /startsWith\(SKETCH_TOOL_BOX_CORNICE_PREFIX\)/);
  assert.doesNotMatch(state, /<\/?[A-Za-z]|props\.setSketchBox|activateManualToolId/);

  assert.match(options, /export const SKETCH_BOX_BASE_OPTIONS/);
  assert.match(options, /export const SKETCH_BOX_CORNICE_OPTIONS/);
  assert.match(options, /export const SKETCH_BOX_LEG_STYLE_OPTIONS/);
  assert.match(options, /export const SKETCH_BOX_LEG_COLOR_OPTIONS/);
  assert.doesNotMatch(options, /props\.|onClick|ReactElement|export function/);

  assert.match(components, /export function SketchBoxNumericField\(/);
  assert.match(components, /export function SketchBoxToolButton\(/);
  assert.match(components, /export function SketchBoxChoicePanel/);

  assert.doesNotMatch(
    [facade, types, sync, dimensions, panels, base, cornice, state, options, components].join('\n'),
    /export default\s+/,
    'sketch-box controls owners must stay named-export only'
  );
});
