import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const structureOwner = readSource('../esm/native/ui/react/tabs/StructureTab.view.tsx', import.meta.url);
const structureSectionsEntry = readSource(
  '../esm/native/ui/react/tabs/structure_tab_sections.tsx',
  import.meta.url
);
const structureActions = readSource(
  '../esm/native/ui/react/tabs/use_structure_tab_actions.ts',
  import.meta.url
);
const structureActionsController = readSource(
  '../esm/native/ui/react/tabs/structure_tab_actions_controller_runtime.ts',
  import.meta.url
);
const structureViewStateBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/use_structure_tab_view_state.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state_contracts.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state_state.ts',
    '../esm/native/ui/react/tabs/structure_tab_view_state_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_view_state_contracts.ts',
  ],
  import.meta.url
);
const structureStructuralController = bundleSources(
  [
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_sync.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_writes.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_sync.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_writes.ts',
  ],
  import.meta.url
);
const savedModelsPanel = readSource(
  '../esm/native/ui/react/tabs/structure_tab_saved_models_panel.tsx',
  import.meta.url
);
const structureBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/StructureTab.view.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state_contracts.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state_state.ts',
    '../esm/native/ui/react/tabs/structure_tab_view_state_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_view_state_contracts.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_contracts.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_shared.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_controllers.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_effects.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_render.tsx',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_library.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_cell_dims.ts',
    '../esm/native/ui/react/tabs/structure_tab_sections.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dimensions_section.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dimensions_section_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_dimensions_section_main.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dimensions_section_stack_split.tsx',
    '../esm/native/ui/react/tabs/structure_tab_body_section.tsx',
    '../esm/native/ui/react/tabs/structure_tab_body_section_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_body_section_controls.tsx',
    '../esm/native/ui/react/tabs/structure_tab_body_section_base.tsx',
    '../esm/native/ui/react/tabs/structure_tab_body_section_structure.tsx',
    '../esm/native/ui/react/tabs/structure_tab_body_section_single_door.tsx',
    '../esm/native/ui/react/tabs/structure_tab_body_section_hinge.tsx',
    '../esm/native/ui/react/tabs/structure_tab_aux_sections.tsx',
    '../esm/native/ui/react/tabs/structure_tab_aux_sections_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_aux_sections_corner.tsx',
    '../esm/native/ui/react/tabs/structure_tab_aux_sections_chest.tsx',
    '../esm/native/ui/react/tabs/structure_tab_aux_sections_library.tsx',
    '../esm/native/ui/react/tabs/structure_tab_controls.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dim_field.tsx',
    '../esm/native/ui/react/tabs/structure_tab_optional_dim_field.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dimension_field_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_dimension_field_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_panel.tsx',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_patterns.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_command_flows.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_commands.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_command_results.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_command_prompts.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback_failure.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback_success.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_saved_models_commands.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_saved_models_commands_contracts.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_saved_models_commands_state.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_saved_models_commands_controller.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_saved_models_dnd.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_dnd_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_dnd_events_controller_runtime.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_saved_models_controller.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_saved_models_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_view.tsx',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_view_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_view_sections.tsx',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_list.tsx',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_list_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
    '../esm/native/ui/react/tabs/structure_tab_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_library_helpers.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_actions.ts',
    '../esm/native/ui/react/tabs/structure_tab_actions_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_actions_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_hinge_actions_controller.ts',
    '../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller.ts',
    '../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_corner.ts',
    '../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_chest.ts',
  ],
  import.meta.url
);

test('[contracts-structure-owner] StructureTab owner delegates sections, actions, and saved-model workflows to focused seams', () => {
  assertMatchesAll(
    assert,
    structureOwner,
    [
      /structure_tab_sections\.js/,
      /structure_tab_saved_models_panel\.js/,
      /use_structure_tab_actions\.js/,
      /use_structure_tab_view_state\.js/,
      /use_structure_tab_workflows\.js/,
      /useStructureTabViewState\(/,
      /useStructureTabWorkflows\(/,
      /useStructureTabHingeActions\(/,
      /useStructureTabCornerChestActions\(/,
      /<SavedModelsPanel\s*\/>/,
      /<StructureDimensionsSection/,
      /<StructureBodySection/,
      /<StructureCornerSection/,
      /<StructureChestSection/,
      /<StructureLibrarySection/,
    ],
    'structure owner'
  );

  assertLacksAll(
    assert,
    structureOwner,
    [/STRUCTURE_PATTERNS\s*}\s*from '\.\/structure_tab_saved_models_panel\.js'/],
    'structure owner saved-model imports'
  );

  assertMatchesAll(
    assert,
    structureSectionsEntry,
    [
      /structure_tab_dimensions_section\.js/,
      /structure_tab_body_section\.js/,
      /structure_tab_aux_sections\.js/,
    ],
    'structure sections barrel'
  );

  assertMatchesAll(
    assert,
    structureActions,
    [
      /export function useStructureTabHingeActions\(/,
      /export function useStructureTabCornerChestActions\(/,
      /createStructureTabHingeActionsController\(/,
      /createStructureTabCornerChestActionsController\(/,
      /(?:React\.useMemo|useMemo)\(/,
    ],
    'structure action hooks'
  );

  assertMatchesAll(
    assert,
    structureStructuralController,
    [
      /export function createStructureTabStructuralController\(/,
      /export function readUiRawNumberFromApp\(/,
      /commitStructureRawValue\(/,
      /toggleStackSplitState\(/,
      /setStackSplitLowerLinkModeValue\(/,
    ],
    'structure structural controller'
  );

  assertMatchesAll(
    assert,
    structureViewStateBundle,
    [
      /export function readStructureTabBaseUiState\(/,
      /export function deriveStructureTabStackSplitState\(/,
      /export function deriveStructureTabSelectionState\(/,
    ],
    'structure view-state runtime'
  );

  assertMatchesAll(
    assert,
    structureActionsController,
    [
      /structure_tab_hinge_actions_controller\.js/,
      /structure_tab_corner_chest_actions_controller\.js/,
      /export \{ createStructureTabHingeActionsController \}/,
      /export \{ createStructureTabCornerChestActionsController \}/,
    ],
    'structure action controller seam'
  );

  assertMatchesAll(
    assert,
    savedModelsPanel,
    [
      /use_structure_tab_saved_models_controller\.js/,
      /structure_tab_saved_models_view\.js/,
      /<StructureTabSavedModelsView \{\.\.\.controller\} \/>/,
    ],
    'saved models panel owner'
  );

  assertMatchesAll(
    assert,
    structureBundle,
    [
      /export function StructureDimensionsSection\(/,
      /export function StructureDimensionsContent\(/,
      /export function DimField\(/,
      /export function OptionalDimField\(/,
      /export function useStructureDraft\(/,
      /export function StructureBodySection\(/,
      /export function StructureBodyBaseControls\(/,
      /export function StructureBodyStructureControls\(/,
      /export function StructureBodySingleDoorControls\(/,
      /export function StructureBodyHingeControls\(/,
      /export function StructureBodyTypeOptionButton\(/,
      /export function StructureCornerSection\(/,
      /export function StructureChestSection\(/,
      /export function StructureLibrarySection\(/,
      /export const STRUCTURE_CORNER_DIMENSION_FIELDS/,
      /export const STRUCTURE_CHEST_DIMENSION_FIELDS/,
      /export const STRUCTURE_LIBRARY_NOTICE_ACTIVE/,
      /export function useStructureTabSavedModelsCommands\(/,
      /export function useStructureTabSavedModelsCommandState\(/,
      /export function useStructureTabSavedModelsCommandController\(/,
      /export function useStructureTabSavedModelsDnd\(/,
      /export function createSavedModelsDndController\(/,
      /export function createSavedModelsDndEventsController\(/,
      /export function resolveSavedModelsDropPos\(/,
      /export function useStructureTabSavedModelsController\(/,
      /export type StructureTabSavedModelsController = UseStructureTabSavedModelsCommandsResult & UseStructureTabSavedModelsDndResult;/,
      /export function StructureTabSavedModelsView\(/,
      /export function SavedModelsPresetSection\(/,
      /export function SavedModelsUserSection\(/,
      /export function SavedModelsPrimaryActions\(/,
      /export function StructureTabSavedModelsList\(/,
      /export function buildSavedModelsListRowModel\(/,
      /export function StructureTabSavedModelsListRow\(/,
      /export function useStructureTabWorkflowControllers\(/,
      /export function useStructureTabWorkflowControllerEffects\(/,
      /export function useStructureTabRenderStackLinkBadge\(/,
      /export function createStructureTabWorkflowController\(/,
      /export function createStructureTabWorkflowLibraryApi\(/,
      /export function createStructureTabWorkflowCellDimsApi\(/,
      /export function createStructureTabStructuralController\(/,
      /export function clearStructureCellDimsOverrides\(/,
      /export function createStructureTabHingeActionsController\(/,
      /export function createStructureTabCornerChestActionsController\(/,
      /export const STRUCTURE_PATTERNS/,
      /export function getTransferFn\(/,
      /export function buildDnDReorderPlan\(/,
      /export function applySavedModel\(/,
      /export async function runSaveCurrentModelFlow\(/,
      /export function getSavedModelsActionToast\(/,
    ],
    'structure bundle'
  );
});
