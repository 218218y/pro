import test from 'node:test';
import assert from 'node:assert/strict';

import { assertLacksAll, assertMatchesAll, bundleSources, readSource } from './_source_bundle.js';

const structureControlsOwner = readSource(
  '../esm/native/ui/react/tabs/structure_tab_controls.tsx',
  import.meta.url
);
const structureCoreOwner = readSource('../esm/native/ui/react/tabs/structure_tab_core.ts', import.meta.url);
const structureDimensionsOwner = readSource(
  '../esm/native/ui/react/tabs/structure_tab_dimensions_section.tsx',
  import.meta.url
);
const interiorPipelineOwner = readSource('../esm/native/builder/interior_pipeline.ts', import.meta.url);
const interiorSketchBoxOwner = readSource(
  '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx',
  import.meta.url
);
const savedModelsControllerOwner = readSource(
  '../esm/native/ui/react/tabs/structure_tab_saved_models_controller_runtime.ts',
  import.meta.url
);
const savedModelsDndOwner = readSource(
  '../esm/native/ui/react/tabs/structure_tab_saved_models_dnd_controller_runtime.ts',
  import.meta.url
);
const workflowsOwner = readSource(
  '../esm/native/ui/react/tabs/structure_tab_workflows_controller_runtime.ts',
  import.meta.url
);

const structureNotesBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/StructureTab.view.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_shared.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_controllers.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_effects.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_render.tsx',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_sync.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_writes.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_library.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_cell_dims.ts',
    '../esm/native/ui/notes_export.ts',
  ],
  import.meta.url
);

const structureChestActionsBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/structure_tab_actions_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller.ts',
    '../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_chest.ts',
  ],
  import.meta.url,
  { stripNoise: false }
);

const structureBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/structure_tab_controls.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dim_field.tsx',
    '../esm/native/ui/react/tabs/structure_tab_optional_dim_field.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dimension_field_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_dimension_field_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_core.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_models.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_numbers.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_recompute.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_edit_mode.ts',
    '../esm/native/ui/react/tabs/structure_tab_dimensions_section.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dimensions_section_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_dimensions_section_main.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dimensions_section_stack_split.tsx',
  ],
  import.meta.url
);

const interiorBundle = bundleSources(
  [
    '../esm/native/builder/interior_pipeline.ts',
    '../esm/native/builder/interior_pipeline_custom.ts',
    '../esm/native/builder/interior_pipeline_preset.ts',
    '../esm/native/builder/interior_pipeline_shared.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_types.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_sync.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_dimensions.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_panels.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_base.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_cornice.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_state.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_options.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
  ],
  import.meta.url
);

const savedModelsNamedOnlyPaths = [
  '../esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback.ts',
  '../esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback_failure.ts',
  '../esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback_shared.ts',
  '../esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback_success.ts',
  '../esm/native/ui/react/tabs/structure_tab_saved_models_controller_mutations.ts',
  '../esm/native/ui/react/tabs/structure_tab_saved_models_controller_runtime.ts',
  '../esm/native/ui/react/tabs/structure_tab_saved_models_controller_selection.ts',
  '../esm/native/ui/react/tabs/structure_tab_saved_models_controller_shared.ts',
  '../esm/native/ui/react/tabs/structure_tab_saved_models_dnd_controller_runtime.ts',
  '../esm/native/ui/react/tabs/structure_tab_saved_models_dnd_events_controller_runtime.ts',
  '../esm/native/ui/react/tabs/structure_tab_saved_models_mutation_singleflight.ts',
  '../esm/native/ui/react/tabs/structure_tab_workflows_controller_runtime.ts',
];

const savedModelsBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback_failure.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback_success.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_controller_selection.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_controller_mutations.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_mutation_singleflight.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_dnd_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_dnd_events_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_shared.ts',
  ],
  import.meta.url,
  { stripNoise: false }
);

test('[structure-tab-family] structure owners stay thin over canonical field/core/dimensions seams', () => {
  assertMatchesAll(
    assert,
    structureControlsOwner,
    [
      /export \{ DimField \} from '\.\/structure_tab_dim_field\.js';/,
      /export \{ OptionalDimField \} from '\.\/structure_tab_optional_dim_field\.js';/,
      /useCfgSelectorShallow\(cfg => \(\{/,
      /function readStructureTypeOptionClassName\(/,
    ],
    'structure controls owner'
  );

  assertLacksAll(
    assert,
    structureControlsOwner,
    [
      /export function DimField\(/,
      /export function OptionalDimField\(/,
      /getBoundingClientRect\(/,
      /onMouseDown=\{handleNativeSpinMouseDown\}/,
    ],
    'structure controls owner'
  );

  assertMatchesAll(
    assert,
    structureCoreOwner,
    [
      /structure_tab_core_contracts\.js/,
      /structure_tab_core_models\.js/,
      /structure_tab_core_numbers\.js/,
      /structure_tab_core_recompute\.js/,
      /structure_tab_core_edit_mode\.js/,
      /export \{ getModelsService \}/,
      /export \{[\s\S]*enterStructureEditMode/,
    ],
    'structure core owner'
  );

  assertLacksAll(
    assert,
    structureCoreOwner,
    [
      /const __emptyModelsService/,
      /function readModelsServiceSource\(/,
      /function readEditStateToastFn\(/,
      /console\.error\(`\[WardrobePro\]\[StructureTab\]/,
      /runHistoryBatch\(/,
    ],
    'structure core owner'
  );

  assertMatchesAll(
    assert,
    structureDimensionsOwner,
    [
      /structure_tab_dimensions_section_contracts\.js/,
      /structure_tab_dimensions_section_main\.js/,
      /structure_tab_dimensions_section_cell_dims\.js/,
      /structure_tab_dimensions_section_stack_split\.js/,
      /export function StructureDimensionsContent\(/,
      /<StructureDimensionsMainFields/,
    ],
    'structure dimensions owner'
  );

  assertLacksAll(
    assert,
    structureDimensionsOwner,
    [/export type StructureSetRaw = \(/, /activeId="stackSplitLowerHeight"/, /activeId="cellDimsWidth"/],
    'structure dimensions owner'
  );

  assertMatchesAll(
    assert,
    structureBundle,
    [
      /export function DimField\(/,
      /export function OptionalDimField\(/,
      /export function useStructureDraft\(/,
      /export function readStructureRequiredCommit\(/,
      /export type StructureDimFieldProps = \{/,
      /export function createStructureRecomputeOpts\(/,
      /(?:runStructuralModulesRecompute|runAppStructuralModulesRecompute)\(/,
      /export function applyStructureTemplateRecomputeBatch<.*>\(/,
      /export function enterStructureEditMode\(/,
      /export function StructureDimensionsMainFields\(/,
      /export function StructureCellDimsControls\(/,
      /export function StructureStackSplitControls\(/,
    ],
    'structure bundle'
  );
});

test('[structure-tab-family] interior owners stay thin over pipeline + sketch-box runtime/component seams', () => {
  assertMatchesAll(
    assert,
    interiorPipelineOwner,
    [
      /from '\.\/interior_pipeline_custom\.js'/,
      /from '\.\/interior_pipeline_preset\.js'/,
      /from '\.\/interior_pipeline_shared\.js'/,
      /return config\.isCustom\s*\? applyCustomInteriorLayout\(input, config\)\s*:\s*applyPresetInteriorLayout\(input, config\);/,
    ],
    'interior pipeline owner'
  );

  assertLacksAll(
    assert,
    interiorPipelineOwner,
    [/computeInteriorCustomOps\(/, /computeInteriorPresetOps\(/, /applyInteriorSketchExtras/],
    'interior pipeline owner'
  );

  assertMatchesAll(
    assert,
    interiorSketchBoxOwner,
    [
      /interior_layout_sketch_box_controls_runtime\.js/,
      /interior_layout_sketch_box_controls_components\.js/,
      /toggleSketchBoxControlsPanel\(props, isSketchBoxControlsOpen, isSketchBoxToolActive\);/,
      /updateSketchBoxOptionalDimensionDraft\(props, 'width', raw\);/,
      /toggleSketchBoxBasePanel\(props, isBaseToolActive\);/,
      /selectSketchBoxCorniceType\(props, next\);/,
    ],
    'interior sketch-box owner'
  );

  assertMatchesAll(
    assert,
    interiorBundle,
    [
      /export function applyCustomInteriorLayout\(/,
      /export function applyPresetInteriorLayout\(/,
      /export function maybeApplySketchExtras\(/,
      /export function buildSketchExtrasArgs\(/,
      /export function resolveActiveDrawerSlots\(/,
      /export function SketchBoxNumericField\(/,
      /export function SketchBoxToolButton\(/,
      /export function SketchBoxChoicePanel/,
      /export function toggleSketchBoxControlsPanel\(/,
      /export function updateSketchBoxOptionalDimensionDraft\(/,
      /export function selectSketchBoxBaseType\(/,
    ],
    'interior bundle'
  );
});

test('[structure-tab-family] saved-models/workflow seams stay named-only and canonical', () => {
  for (const rel of savedModelsNamedOnlyPaths) {
    const source = readSource(rel, import.meta.url);
    assertLacksAll(assert, source, [/export default\s+/], rel);
  }

  assertMatchesAll(
    assert,
    savedModelsBundle,
    [
      /export function getSavedModelsActionToast\(/,
      /export function reportSavedModelsActionResult\(/,
      /export function emitSavedModelsActionToast\(/,
      /export function createSavedModelsCommandController\(/,
      /export function createSavedModelsSelectionCommands\(/,
      /export function createSavedModelsMutationCommands\(/,
      /export function createSavedModelsDndController\(/,
      /export function createSavedModelsDndEventsController\(/,
      /export function runSavedModelsMutationSingleFlight<[^>]+>\(/,
      /export function createStructureTabWorkflowController\(/,
      /export function clearStructureCellDimsOverrides\(/,
      /export function computeStructureAutoWidth\(/,
    ],
    'structure-tab saved-models family bundle'
  );
});

test('[structure-tab-family] saved-models and workflows remain wiring-first around shared commands/helpers', () => {
  assertMatchesAll(
    assert,
    savedModelsControllerOwner,
    [
      /createSavedModelsSelectionCommands\(args\)/,
      /createSavedModelsMutationCommands\(args\)/,
      /export function createSavedModelsCommandController\(/,
    ],
    'saved models controller owner'
  );

  assertMatchesAll(
    assert,
    savedModelsDndOwner,
    [
      /reportSavedModelsActionResult\(/,
      /reorderSavedModelsByDnD\(/,
      /transferSavedModelByDnD\(/,
      /export function createSavedModelsDndController\(/,
    ],
    'saved models dnd owner'
  );

  assertMatchesAll(
    assert,
    workflowsOwner,
    [
      /createStructureTabWorkflowLibraryApi\(args\)/,
      /createStructureTabWorkflowCellDimsApi\(args\)/,
      /clearStructureCellDimsOverrides/,
      /computeStructureAutoWidth/,
      /export function createStructureTabWorkflowController\(/,
    ],
    'structure tab workflows owner'
  );
});

test('[structure-tab-family] structure notes/workflows stay normalized and chest drawer commits keep recompute wiring canonical', () => {
  assertMatchesAll(
    assert,
    structureNotesBundle,
    [
      /export type StructureUiPartial = UnknownRecord &/,
      /function clearStructureCellDimsOverrides\(list: ModuleConfigLike\[\]\): ModuleConfigLike\[\]*/,
      /meta\.noBuildImmediate\(source\)/,
      /readNoBuildNoHistoryImmediateMeta\(meta, source\)/,
      /function readUiRawNumberFromApp\(app: Parameters<typeof getUiSnapshot>\[0\], key: string\): number/,
      /ensureUiNotesExportService\(app\)/,
      /function ensureNotesExportApi\(app: AppContainer\): NotesExportApi/,
    ],
    'structure notes/workflows bundle'
  );
  assertLacksAll(assert, structureNotesBundle, [/\bAnyRecord\b/], 'structure notes/workflows bundle');

  assertMatchesAll(
    assert,
    structureChestActionsBundle,
    [
      /const setChestDrawersCount = \(nn: number\) =>/,
      /setUiChestDrawersCount\(args\.app, next, actionMeta\);/,
      /commitStructureStatePatchWithRecompute\(\{[\s\S]*source: 'react:structure:chest:count'/,
      /statePatch:\s*\{\s*ui:\s*uiPatch\s*\}/,
    ],
    'structure chest drawer recompute bundle'
  );
});
