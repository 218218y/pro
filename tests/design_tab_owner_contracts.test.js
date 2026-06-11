import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll } from './_source_bundle.js';

const designOwner = readSource('../esm/native/ui/react/tabs/DesignTab.view.tsx', import.meta.url);
const designController = readSource(
  '../esm/native/ui/react/tabs/use_design_tab_controller.ts',
  import.meta.url
);
const designControllerState = readSource(
  '../esm/native/ui/react/tabs/use_design_tab_controller_state.ts',
  import.meta.url
);
const designControllerSections = readSource(
  '../esm/native/ui/react/tabs/use_design_tab_controller_sections.ts',
  import.meta.url
);
const designControllerContracts = readSource(
  '../esm/native/ui/react/tabs/use_design_tab_controller_contracts.ts',
  import.meta.url
);
const designSections = readSource('../esm/native/ui/react/tabs/design_tab_sections.tsx', import.meta.url);
const designSectionsControls = readSource(
  '../esm/native/ui/react/tabs/design_tab_sections_controls.tsx',
  import.meta.url
);
const designDoorStyleSection = readSource(
  '../esm/native/ui/react/tabs/design_tab_sections_door_style.tsx',
  import.meta.url
);
const designDoorFeaturesSection = readSource(
  '../esm/native/ui/react/tabs/design_tab_sections_door_features.tsx',
  import.meta.url
);
const designCorniceSection = readSource(
  '../esm/native/ui/react/tabs/design_tab_sections_cornice.tsx',
  import.meta.url
);
const designColorSection = readSource(
  '../esm/native/ui/react/tabs/design_tab_color_section.tsx',
  import.meta.url
);
const designBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/DesignTab.view.tsx',
    '../esm/native/ui/react/tabs/use_design_tab_controller.ts',
    '../esm/native/ui/react/tabs/use_design_tab_controller_contracts.ts',
    '../esm/native/ui/react/tabs/use_design_tab_controller_state.ts',
    '../esm/native/ui/react/tabs/use_design_tab_controller_sections.ts',
    '../esm/native/ui/react/tabs/design_tab_view_state_runtime.ts',
    '../esm/native/ui/react/tabs/design_tab_controller_runtime.ts',
    '../esm/native/ui/react/tabs/use_design_tab_color_manager.ts',
    '../esm/native/ui/react/tabs/use_design_tab_saved_swatches.ts',
    '../esm/native/ui/react/tabs/design_tab_saved_swatches_controller_runtime.ts',
    '../esm/native/ui/react/tabs/design_tab_saved_swatches_dnd_controller_runtime.ts',
    '../esm/native/ui/react/tabs/use_design_tab_custom_color_workflow.ts',
    '../esm/native/ui/react/tabs/design_tab_custom_color_workflow_controller_runtime.ts',
    '../esm/native/ui/react/tabs/design_tab_color_command_flows.ts',
    '../esm/native/ui/react/tabs/design_tab_color_command_flows_contracts.ts',
    '../esm/native/ui/react/tabs/design_tab_color_command_flows_saved.ts',
    '../esm/native/ui/react/tabs/design_tab_color_command_flows_custom.ts',
    '../esm/native/ui/react/tabs/design_tab_color_command_flows_texture.ts',
    '../esm/native/ui/react/tabs/design_tab_color_action_feedback.ts',
    '../esm/native/ui/react/tabs/use_design_tab_edit_modes.ts',
    '../esm/native/ui/react/tabs/design_tab_edit_modes_controller_runtime.ts',
    '../esm/native/ui/react/tabs/design_tab_multicolor_panel.tsx',
    '../esm/native/ui/react/tabs/design_tab_multicolor_panel_state.ts',
    '../esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
    '../esm/native/ui/react/tabs/design_tab_multicolor_controller_runtime.ts',
    '../esm/native/ui/react/tabs/design_tab_multicolor_shared.ts',
    '../esm/native/ui/react/tabs/design_tab_sections.tsx',
    '../esm/native/ui/react/tabs/design_tab_sections_controls.tsx',
    '../esm/native/ui/react/tabs/design_tab_sections_door_style.tsx',
    '../esm/native/ui/react/tabs/design_tab_sections_door_features.tsx',
    '../esm/native/ui/react/tabs/design_tab_sections_cornice.tsx',
    '../esm/native/ui/react/tabs/design_tab_color_section.tsx',
  ],
  import.meta.url
);

test('[contracts-design-owner] DesignTab owner delegates section orchestration to controller, color, and edit-mode seams', () => {
  assertMatchesAll(
    assert,
    designOwner,
    [
      /use_design_tab_controller\.js/,
      /DoorStyleSection/,
      /DesignTabColorSection/,
      /DoorFeaturesSection/,
      /CorniceSection/,
      /<DoorStyleSection model=\{controller\.doorStyleSection\} \/>/,
      /<DesignTabColorSection model=\{controller\.colorSection\} \/>/,
      /<DoorFeaturesSection model=\{controller\.doorFeaturesSection\} \/>/,
      /<CorniceSection model=\{controller\.corniceSection\} \/>/,
    ],
    'design owner'
  );

  assertMatchesAll(
    assert,
    designController,
    [
      /export function useDesignTabController\(/,
      /useDesignTabControllerState\(/,
      /useDesignTabControllerSections\(/,
    ],
    'design controller'
  );

  assertMatchesAll(
    assert,
    designControllerState,
    [
      /export function useDesignTabControllerState\(/,
      /readDesignTabCfgState\(/,
      /readDesignTabUiState\(/,
      /deriveDesignTabDoorFeaturesState\(/,
      /readDesignTabModeState\(/,
    ],
    'design controller state'
  );

  assertMatchesAll(
    assert,
    designControllerSections,
    [
      /export function useDesignTabControllerSections\(/,
      /useDesignTabColorManager\(/,
      /useDesignTabEditModes\(/,
      /createDesignTabControllerRuntime\(/,
      /doorStyleSection/,
      /colorSection/,
      /doorFeaturesSection/,
      /corniceSection/,
      /setFeatureToggle: controllerRuntime\.setFeatureToggle/,
      /toggleSplitCustomEdit: editModes\.toggleSplitCustomEdit/,
    ],
    'design controller sections'
  );

  assertMatchesAll(
    assert,
    designControllerContracts,
    [
      /export type DesignTabDoorStyleSectionModel =/,
      /export type DesignTabColorSectionModel =/,
      /export type DesignTabDoorFeaturesSectionModel =/,
      /export type DesignTabCorniceSectionModel =/,
      /export type DesignTabControllerModel =/,
      /export type DesignTabControllerState =/,
    ],
    'design controller contracts'
  );

  assertMatchesAll(
    assert,
    designSections,
    [
      /design_tab_sections_door_style\.js/,
      /design_tab_sections_door_features\.js/,
      /design_tab_sections_cornice\.js/,
    ],
    'design sections seam'
  );

  assertMatchesAll(
    assert,
    designSectionsControls,
    [
      /export function DesignTabTypeOption\(/,
      /<button/,
      /type=\"button\"/,
      /aria-pressed=\{props\.selected\}/,
      /className=\{props\.selected \? 'type-option selected' : 'type-option'\}/,
    ],
    'design sections controls'
  );

  assertMatchesAll(
    assert,
    designDoorStyleSection,
    [
      /export function DoorStyleSection/,
      /DesignTabTypeOption/,
      /model\.setDoorStyle\('flat'\)/,
      /model\.setDoorStyle\('profile'\)/,
      /model\.setDoorStyle\('tom'\)/,
    ],
    'design door style section'
  );

  assertMatchesAll(
    assert,
    designDoorFeaturesSection,
    [
      /export function DoorFeaturesSection/,
      /model\.setFeatureToggle\('groovesEnabled', checked\)/,
      /model\.toggleSplitCustomEdit/,
      /model\.toggleRemoveDoorEdit/,
    ],
    'design door features section'
  );

  assertMatchesAll(
    assert,
    designCorniceSection,
    [
      /export function CorniceSection/,
      /DesignTabTypeOption/,
      /model\.setCorniceType\('classic'\)/,
      /model\.setCorniceType\('wave'\)/,
    ],
    'design cornice section'
  );

  assertMatchesAll(
    assert,
    designColorSection,
    [
      /export function DesignTabColorSection/,
      /toggleColorLockById/,
      /onSwatchDragStart/,
      /onSwatchEndDrop/,
      /deleteSelectedColor/,
      /toggleSelectedColorLock/,
      /onPickTextureFile/,
      /saveCustom/,
      /<MultiColorPanel embedded \/>/,
    ],
    'design color section'
  );

  assertMatchesAll(
    assert,
    designBundle,
    [
      /useDesignTabSavedSwatches/,
      /useDesignTabCustomColorWorkflow/,
      /design_tab_saved_swatches_dnd_controller_runtime/,
      /design_tab_custom_color_workflow_controller_runtime/,
      /design_tab_multicolor_controller_runtime/,
      /design_tab_multicolor_panel_state/,
      /design_tab_multicolor_panel_view/,
      /design_tab_sections_controls/,
      /design_tab_sections_door_style/,
      /design_tab_sections_door_features/,
      /design_tab_sections_cornice/,
      /design_tab_multicolor_shared/,
      /createDesignTabMulticolorController\(/,
      /design_tab_color_command_flows/,
      /design_tab_color_command_flows_saved/,
      /design_tab_color_command_flows_custom/,
      /design_tab_color_command_flows_texture/,
      /design_tab_color_action_feedback/,
      /useDesignTabEditModes/,
      /design_tab_view_state_runtime/,
      /design_tab_controller_runtime/,
      /design_tab_edit_modes_controller_runtime/,
    ],
    'design bundle'
  );
});
