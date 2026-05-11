import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll } from './_source_bundle.js';

const interiorOwner = readSource('../esm/native/ui/react/tabs/InteriorTab.view.tsx', import.meta.url);
const interiorBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/InteriorTab.view.tsx',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state_contracts.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state_state.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state_sync.ts',
    '../esm/native/ui/react/tabs/interior_tab_local_state_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_local_state_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_bindings_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_contracts.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_sketch.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_trim.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_runtime.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_workflows.tsx',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_contracts.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_manual.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_drawers.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_handles.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_trim.ts',
    '../esm/native/ui/react/tabs/interior_tab_helpers.tsx',
    '../esm/native/ui/react/tabs/interior_tab_helpers_core.ts',
    '../esm/native/ui/react/tabs/interior_tab_helpers_buttons.tsx',
    '../esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts',
    '../esm/native/ui/react/tabs/interior_tab_helpers_types.ts',
    '../esm/native/ui/react/tabs/interior_tab_sections.tsx',
    '../esm/native/ui/react/tabs/interior_tab_sections_contracts.ts',
    '../esm/native/ui/react/tabs/interior_tab_sections_controls.tsx',
    '../esm/native/ui/react/tabs/interior_tab_sections_layout.tsx',
    '../esm/native/ui/react/tabs/interior_tab_sections_drawers.tsx',
    '../esm/native/ui/react/tabs/interior_tab_sketch_drawer_height_field.tsx',
    '../esm/native/ui/react/tabs/interior_tab_sections_handles.tsx',
    '../esm/native/ui/react/tabs/interior_layout_manual_controls.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_controls.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_sections.tsx',
    '../esm/native/ui/react/tabs/interior_layout_door_trim_section.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_drawers_section.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_section_types.ts',
    '../esm/native/ui/react/tabs/interior_tab_sections_shared.ts',
  ],
  import.meta.url
);

test('[stageAL-interiortab] InteriorTab owner keeps heavy layout/drawers/handles JSX behind stable section seams', () => {
  assertMatchesAll(
    assert,
    interiorOwner,
    [
      /interior_tab_sections\.js/,
      /<InteriorLayoutSection/,
      /<InteriorExternalDrawersSection/,
      /<InteriorInternalDrawersSection/,
      /<InteriorDividerSection/,
      /<InteriorHandlesSection/,
    ],
    'interior owner'
  );

  assertMatchesAll(
    assert,
    interiorBundle,
    [
      /export function InteriorLayoutSection\(/,
      /export function InteriorExternalDrawersSection\(/,
      /export function InteriorInternalDrawersSection\(/,
      /export function InteriorDividerSection\(/,
      /export function InteriorHandlesSection\(/,
      /export function InteriorToolCardHeader\(/,
      /export function InteriorEdgeHandleVariantRow\(/,
      /export function parseSketchBoxTool\(/,
      /export function SketchDrawerHeightField\(/,
    ],
    'interior bundle'
  );

  assertMatchesAll(
    assert,
    interiorBundle,
    [
      /export function InteriorLayoutManualControls\(/,
      /export function InteriorLayoutSketchControls\(/,
      /export function InteriorSketchShelvesSection\(/,
      /export function InteriorSketchBoxControlsSection\(/,
      /export function InteriorDoorTrimSection\(/,
      /export function InteriorSketchDrawersSection\(/,
      /export type InteriorLayoutSectionProps = \{/,
    ],
    'interior layout owners'
  );
});
