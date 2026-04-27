import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const storeUiActionFiles = [
  '../esm/native/ui/react/actions/store_actions_ui.ts',
  '../esm/native/ui/react/actions/store_actions_ui_writes.ts',
  '../esm/native/ui/react/actions/store_actions_ui_project.ts',
  '../esm/native/ui/react/actions/store_actions_ui_structure.ts',
  '../esm/native/ui/react/actions/store_actions_ui_render.ts',
];

const storeConfigActionFiles = [
  '../esm/native/ui/react/actions/store_actions_config.ts',
  '../esm/native/ui/react/actions/store_actions_config_contracts.ts',
  '../esm/native/ui/react/actions/store_actions_config_project.ts',
  '../esm/native/ui/react/actions/store_actions_config_maps.ts',
  '../esm/native/ui/react/actions/store_actions_config_modes.ts',
];
const storeActions = bundleSources(
  [
    '../esm/native/ui/react/actions/store_actions.ts',
    ...storeConfigActionFiles,
    ...storeUiActionFiles,
    '../esm/native/ui/react/actions/store_actions_runtime.ts',
  ],
  import.meta.url
);
const structureOwner = readSource('../esm/native/ui/react/tabs/StructureTab.view.tsx', import.meta.url);
const structureShared = readSource('../esm/native/ui/react/tabs/structure_tab_shared.ts', import.meta.url);
const structureCore = bundleSources(
  [
    '../esm/native/ui/react/tabs/structure_tab_core.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_models.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_numbers.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_recompute.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_edit_mode.ts',
  ],
  import.meta.url
);
const structureMutations = readSource(
  '../esm/native/ui/react/tabs/structure_tab_structure_mutations.ts',
  import.meta.url
);
const structureMutationsShared = readSource(
  '../esm/native/ui/react/tabs/structure_tab_structure_mutations_shared.ts',
  import.meta.url
);
const structureRawMutations = readSource(
  '../esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts',
  import.meta.url
);
const structureStackSplitMutations = readSource(
  '../esm/native/ui/react/tabs/structure_tab_structure_stack_split_mutations.ts',
  import.meta.url
);
const structureViewState = bundleSources(
  [
    '../esm/native/ui/react/tabs/use_structure_tab_view_state.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state_contracts.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state_state.ts',
  ],
  import.meta.url
);
const structureViewStateRuntime = bundleSources(
  [
    '../esm/native/ui/react/tabs/structure_tab_view_state_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_view_state_contracts.ts',
  ],
  import.meta.url
);
const structureWorkflows = bundleSources(
  [
    '../esm/native/ui/react/tabs/use_structure_tab_workflows.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_contracts.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_shared.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_controllers.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_effects.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_render.tsx',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_library.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_cell_dims.ts',
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
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_sync.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_writes.ts',
  ],
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
const structureActionsControllerBundle = bundleSources(
  [
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
const structureBundle = bundleSources(
  [
    '../esm/native/ui/react/actions/store_actions.ts',
    ...storeConfigActionFiles,
    ...storeUiActionFiles,
    '../esm/native/ui/react/actions/store_actions_runtime.ts',
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
    '../esm/native/ui/react/tabs/structure_tab_controls.tsx',
    '../esm/native/ui/react/tabs/structure_tab_library_helpers.ts',
    '../esm/native/ui/react/tabs/structure_tab_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_core.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_models.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_numbers.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_recompute.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_edit_mode.ts',
    '../esm/native/ui/react/tabs/structure_tab_structure_mutations.ts',
    '../esm/native/ui/react/tabs/structure_tab_structure_mutations_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts',
    '../esm/native/ui/react/tabs/structure_tab_structure_stack_split_mutations.ts',
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

test('[contracts-structure-surface] StructureTab writes and recompute flows stay on canonical wrappers and typed shared seams', () => {
  assertMatchesAll(
    assert,
    storeActions,
    [
      /(?:function setCfgHingeMap\(|export \{[\s\S]*\bsetCfgHingeMap\b[\s\S]*\} from '\.\.\/\.\.\/\.\.\/services\/api\.js';)/,
      /function setCfgPreChestState\(/,
      /(?:function setCfgModulesConfiguration\(|export \{[\s\S]*\bsetCfgModulesConfiguration\b[\s\S]*\} from '\.\.\/\.\.\/\.\.\/services\/api\.js';)/,
      /(?:function setCfgLowerModulesConfiguration\(|export \{[\s\S]*\bsetCfgLowerModulesConfiguration\b[\s\S]*\} from '\.\.\/\.\.\/\.\.\/services\/api\.js';)/,
      /function setUiBaseType\(/,
      /function setUiHingeDirection\(/,
      /function setUiStructureSelect\(/,
      /function setUiSingleDoorPos\(/,
      /function recomputeFromUi\([\s\S]*meta\?: ActionMetaLike,[\s\S]*opts\?: ModulesRecomputeFromUiOptionsLike[\s\S]*\): void \{/,
      /runAppStructuralModulesRecompute\([\s\S]*\{ source: 'react:recomputeFromUi' \}/,
    ],
    'store actions surface'
  );

  assertMatchesAll(
    assert,
    structureOwner,
    [
      /use_structure_tab_view_state\.js/,
      /use_structure_tab_workflows\.js/,
      /useStructureTabViewState\(/,
      /useStructureTabWorkflows\(/,
      /useStructureTabHingeActions\(/,
      /useStructureTabCornerChestActions\(/,
    ],
    'structure owner orchestration'
  );

  assertMatchesAll(
    assert,
    structureWorkflows,
    [
      /createStructureTabWorkflowController\(\{/,
      /createStructureTabStructuralController\(\{/,
      /structuralController\.syncSingleDoorPos\(\)/,
      /structuralController\.syncHingeVisibility\(\)/,
      /setCfgModulesConfiguration\(app, nextList, actionMeta\)/,
    ],
    'structure workflows writes'
  );

  assertMatchesAll(
    assert,
    structureStructuralController,
    [
      /setUiStructureSelect\(args\.app, patch\.structureSelect, actionMeta\)/,
      /setUiSingleDoorPos\(args\.app, patch\.singleDoorPos, actionMeta\)/,
      /applyUiSoftScalarPatch\(args\.app, softPatch, actionMeta\)/,
      /applyStructureTemplateRecomputeBatch\(\{/,
      /commitStructureRawValue\(\{/,
      /setStackSplitLowerLinkModeValue\(\{/,
      /toggleStackSplitState\(\{/,
      /setUiBaseType\(args\.app, next, \{ source: 'react:structure:baseType', immediate: true \}\)/,
      /setUiSlidingTracksColor\(args\.app, next, \{[\s\S]*react:structure:slidingTracksColor/,
    ],
    'structure structural controller'
  );

  assertMatchesAll(
    assert,
    structureViewState,
    [
      /useCfgSelectorShallow\(/,
      /useModeSelectorShallow\(/,
      /readStructureTabBaseUiState\(ui\)/,
      /readStructureTabStackSplitUiState\(ui, \{ depth, width, doors \}\)/,
      /deriveStructureTabStackSplitState\(/,
      /readStructureTabCellDimsState\(ui\)/,
      /deriveStructureTabSelectionState\(/,
    ],
    'structure view state selectors'
  );

  assertMatchesAll(
    assert,
    structureViewStateRuntime,
    [
      /export function readStructureTabBaseUiState\(/,
      /export function readStructureTabStackSplitUiState\(/,
      /export function deriveStructureTabStackSplitState\(/,
      /export function readStructureTabCellDimsState\(/,
      /export function deriveStructureTabSelectionState\(/,
    ],
    'structure view-state runtime'
  );

  assertLacksAll(
    assert,
    structureBundle,
    [
      /const cfgActions = \(actions\.config \|\| \{\}\)/,
      /const uiActions = \(actions\.ui \|\| \{\}\)/,
      /uiActions\.setStructureSelect\(/,
      /cfgActions\.setModulesConfiguration\(/,
    ],
    'structure legacy action bags'
  );

  assertMatchesAll(
    assert,
    structureShared,
    [
      /structure_tab_core\.js/,
      /structure_tab_structure_mutations\.js/,
      /export \{[\s\S]*getModelsService/,
      /export \{[\s\S]*commitStructureRawValue/,
    ],
    'structure shared barrel'
  );

  assertMatchesAll(
    assert,
    structureCore,
    [
      /structure_tab_core_models\.js/,
      /structure_tab_core_recompute\.js/,
      /structure_tab_core_edit_mode\.js/,
      /getModelsServiceSourceMaybe\(app\)/,
      /function readModelsServiceSource\(/,
      /const feedback = getUiFeedback\(app\);/,
      /export type StructureRecomputeOpts = ModulesRecomputeFromUiOptionsLike & \{/,
      /export function createStructureRecomputeOpts\(/,
      /const source = readModelsServiceSource\(app\);/,
    ],
    'structure core cleanup'
  );

  assertLacksAll(
    assert,
    `${structureShared}
${structureCore}`,
    [
      /readRecord\(appRecord\.services\)/,
      /readRecord\(services\?\.models\) \|\| readRecord\(appRecord\.models\)/,
      /readRecord\(readRecord\(app\)\?\.uiFeedback\)/,
      /app && typeof app === 'object' \? \(app as UnknownRecord\) : null/,
      /Object\.create\(null\) as UnknownRecord/,
    ],
    'structure shared/core legacy casts'
  );

  assertMatchesAll(
    assert,
    structureMutations,
    [
      /structure_tab_structure_mutations_shared\.js/,
      /structure_tab_structure_raw_mutations\.js/,
      /structure_tab_structure_stack_split_mutations\.js/,
      /export type \{[\s\S]*StructureTabNumericKey/,
      /export \{ commitStructureRawValue \}/,
      /export \{[\s\S]*setStackSplitLowerLinkModeValue/,
    ],
    'structure mutations owner'
  );

  assertMatchesAll(
    assert,
    structureMutationsShared,
    [
      /export type StructureTabNumericKey =/,
      /export type StructureTabStackSplitField =/,
      /export type StructureRawPatch = Partial<Record<StructureTabNumericKey \| StructureRawBooleanKey, number \| boolean>>;/,
      /export function normalizeDoorsValue\(/,
      /export function readRawPatch\(/,
    ],
    'structure mutations shared'
  );

  assertMatchesAll(
    assert,
    structureRawMutations,
    [
      /export function commitStructureRawValue\(/,
      /setUiCellDimsWidth\(/,
      /setUiStackSplitLowerDoors\(/,
      /applyStructureTemplateRecomputeBatch\(/,
    ],
    'structure raw mutations'
  );

  assertMatchesAll(
    assert,
    structureStackSplitMutations,
    [
      /export function setStackSplitLowerLinkModeValue\(/,
      /export function toggleStackSplitState\(/,
      /setUiFlag\(/,
      /applyStructureTemplateRecomputeBatch\(/,
    ],
    'structure stack-split mutations'
  );

  assertMatchesAll(
    assert,
    structureActions,
    [
      /createStructureTabHingeActionsController\(\{/,
      /createStructureTabCornerChestActionsController\(\{/,
      /(?:React\.useMemo|useMemo)\(/,
    ],
    'structure action hooks'
  );

  assertMatchesAll(
    assert,
    structureActionsController,
    [/structure_tab_hinge_actions_controller\.js/, /structure_tab_corner_chest_actions_controller\.js/],
    'structure action controller seam'
  );

  assertMatchesAll(
    assert,
    structureActionsControllerBundle,
    [
      /const STRUCTURE_RECOMPUTE_OPTS = createStructuralModulesRecomputeOpts\(\);/,
      /createStructuralModulesRecomputeOpts\(/,
      /(?:runStructuralModulesRecompute|runAppStructuralModulesRecompute)\(/,
      /export function withImmediate\(meta: ActionMetaLike\): ActionMetaLike \{/,
      /export function readPreChestState\(value: unknown\): PreChestStateLike \| null \{/,
      /setCfgHingeMap\(args\.app, \{ \.\.\.saved \}, hingeMapMeta\);/,
      /(?:runStructuralModulesRecompute|runAppStructuralModulesRecompute)\(/,
      /export function commitStructureStatePatchWithRecompute\(args: \{/,
      /runHistoryBatch\(\s*app,/,
      /patchViaActions\(app, rootPatch, actionMeta\)/,
      /commitStructureStatePatchWithRecompute\(\{[\s\S]*?source:\s*'react:structure:corner'/,
      /commitStructureStatePatchWithRecompute\(\{[\s\S]*?source:\s*'react:structure:chest:on'/,
      /createStructureTabCornerActionsController\(args\)/,
      /createStructureTabChestActionsController\(args\)/,
      /statePatch:\s*\{\s*config:\s*configPatch,\s*ui:\s*uiPatch\s*\}/,
    ],
    'structure action controller contracts'
  );

  assertLacksAll(
    assert,
    structureActionsControllerBundle,
    [
      /STRUCTURE_RECOMPUTE_OPTS as UnknownRecord/,
      /\{ \.\.\.actionMeta, immediate: true \} as UnknownRecord/,
      /args\.preChestState as PreChestStateLike \| null/,
    ],
    'structure action controller legacy casts'
  );
});
