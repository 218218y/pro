import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 52 interior tab helpers ownership split is anchored', () => {
  const facade = read('esm/native/ui/react/tabs/interior_tab_helpers.tsx');
  const core = read('esm/native/ui/react/tabs/interior_tab_helpers_core.ts');
  const buttons = read('esm/native/ui/react/tabs/interior_tab_helpers_buttons.tsx');
  const sketchTools = read('esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts');
  const types = read('esm/native/ui/react/tabs/interior_tab_helpers_types.ts');
  const optionButtonContract = read('tools/wp_ui_option_button_contract.mjs');
  const interiorViewState = read('esm/native/ui/react/tabs/interior_tab_view_state_shared.ts');
  const sketchControls = read('esm/native/ui/react/tabs/interior_layout_sketch_controls.tsx');

  assert.ok(
    lineCount(facade) <= 20,
    'interior_tab_helpers.tsx must stay a small public facade instead of regrowing UI/core/sketch internals'
  );
  for (const owner of [
    'interior_tab_helpers_core.js',
    'interior_tab_helpers_buttons.js',
    'interior_tab_helpers_sketch_tools.js',
    'interior_tab_helpers_types.js',
  ]) {
    assert.match(facade, new RegExp(owner.replace(/[.]/g, '\\.')), `facade must compose ${owner}`);
  }
  assert.doesNotMatch(
    facade,
    /<OptionButton|readModulesConfigurationListFromConfigSnapshot|parseSketchBoxTool\(|SKETCH_TOOL_BOX_DOOR|normalizeBaseLegStyle/,
    'facade must not own option button JSX, config probes, sketch tool parsing, or base-leg policy'
  );

  assert.match(core, /export function cx\(/);
  assert.match(core, /export function asStr\(/);
  assert.match(core, /export function asNum\(/);
  assert.match(core, /export function hasInternalDrawersDataInCfg\(/);
  assert.match(core, /readModulesConfigurationListFromConfigSnapshot/);
  assert.match(core, /readCornerConfigurationFromConfigSnapshot/);
  assert.doesNotMatch(core, /<OptionButton|SKETCH_TOOL_BOX_DOOR|normalizeBaseLegStyle/);

  assert.match(buttons, /export function OptionBtn\(/);
  assert.match(buttons, /export function CountBtn\(/);
  assert.match(buttons, /<OptionButton[\s\S]*density="compact"/);
  assert.match(buttons, /from '\.\/interior_tab_helpers_core\.js';/);
  assert.doesNotMatch(buttons, /readModulesConfigurationListFromConfigSnapshot|parseSketchBoxTool\(/);

  assert.match(sketchTools, /export const SKETCH_TOOL_BOX_DOOR = 'sketch_box_door'/);
  assert.match(sketchTools, /export const SKETCH_TOOL_BOX_DOUBLE_DOOR = 'sketch_box_double_door'/);
  assert.match(sketchTools, /export function parseSketchBoxTool\(/);
  assert.match(sketchTools, /export function isSketchBoxTool\(tool: string\): boolean \{/);
  assert.match(sketchTools, /createSketchExternalDrawersTool/);
  assert.match(sketchTools, /normalizeBaseLegStyle/);
  assert.doesNotMatch(sketchTools, /<OptionButton|readModulesConfigurationListFromConfigSnapshot/);

  for (const exportedType of [
    'LayoutTypeId',
    'ManualToolId',
    'SketchBoxBaseType',
    'HandleType',
    'DoorTrimUiSpan',
    'OptionBtnProps',
    'CountBtnProps',
    'InteriorTabViewProps',
  ]) {
    assert.match(types, new RegExp(`export type ${exportedType}`), `types owner must expose ${exportedType}`);
  }
  assert.doesNotMatch(
    types,
    /function |<OptionButton|readModulesConfigurationListFromConfigSnapshot|parseSketchBoxTool\(/
  );

  assert.match(
    optionButtonContract,
    /interior_tab_helpers_buttons\.tsx/,
    'UI option-button audit must target the concrete button owner, not the helper facade'
  );
  assert.match(interiorViewState, /from '\.\/interior_tab_helpers\.js';/);
  assert.match(sketchControls, /from '\.\/interior_tab_helpers\.js';/);
  assert.doesNotMatch(
    interiorViewState + sketchControls,
    /interior_tab_helpers_(core|buttons|sketch_tools|types)\.js/,
    'interior tab consumers must keep using the public helper facade instead of coupling to private owners'
  );
  assert.doesNotMatch(facade + core + buttons + sketchTools + types, /export default\s+/);
});
