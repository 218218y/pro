import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const designShared = readSource('../esm/native/ui/react/tabs/design_tab_shared.ts', import.meta.url);
const designColorManagerShared = readSource(
  '../esm/native/ui/react/tabs/design_tab_color_manager_shared.ts',
  import.meta.url
);
const designColorManager = readSource(
  '../esm/native/ui/react/tabs/use_design_tab_color_manager.ts',
  import.meta.url
);
const designSavedSwatches = readSource(
  '../esm/native/ui/react/tabs/use_design_tab_saved_swatches.ts',
  import.meta.url
);
const designSavedSwatchesController = readSource(
  '../esm/native/ui/react/tabs/design_tab_saved_swatches_controller_runtime.ts',
  import.meta.url
);
const designSavedSwatchesDndController = readSource(
  '../esm/native/ui/react/tabs/design_tab_saved_swatches_dnd_controller_runtime.ts',
  import.meta.url
);
const designCustomWorkflow = readSource(
  '../esm/native/ui/react/tabs/use_design_tab_custom_color_workflow.ts',
  import.meta.url
);
const designCustomWorkflowController = readSource(
  '../esm/native/ui/react/tabs/design_tab_custom_color_workflow_controller_runtime.ts',
  import.meta.url
);
const designEditModes = readSource(
  '../esm/native/ui/react/tabs/use_design_tab_edit_modes.ts',
  import.meta.url
);
const designEditModesController = readSource(
  '../esm/native/ui/react/tabs/design_tab_edit_modes_controller_runtime.ts',
  import.meta.url
);

const designMulticolorPanel = readSource(
  '../esm/native/ui/react/tabs/design_tab_multicolor_panel.tsx',
  import.meta.url
);
const designMulticolorPanelState = readSource(
  '../esm/native/ui/react/tabs/design_tab_multicolor_panel_state.ts',
  import.meta.url
);
const designMulticolorPanelView = readSource(
  '../esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  import.meta.url
);
const designMulticolorController = readSource(
  '../esm/native/ui/react/tabs/design_tab_multicolor_controller_runtime.ts',
  import.meta.url
);
const designMulticolorShared = readSource(
  '../esm/native/ui/react/tabs/design_tab_multicolor_shared.ts',
  import.meta.url
);
const designColorFlows = readSource(
  '../esm/native/ui/react/tabs/design_tab_color_command_flows.ts',
  import.meta.url
);
const designColorFlowsContracts = readSource(
  '../esm/native/ui/react/tabs/design_tab_color_command_flows_contracts.ts',
  import.meta.url
);
const designColorFlowsSaved = readSource(
  '../esm/native/ui/react/tabs/design_tab_color_command_flows_saved.ts',
  import.meta.url
);
const designColorFlowsCustom = readSource(
  '../esm/native/ui/react/tabs/design_tab_color_command_flows_custom.ts',
  import.meta.url
);
const designColorFlowsTexture = readSource(
  '../esm/native/ui/react/tabs/design_tab_color_command_flows_texture.ts',
  import.meta.url
);
const designSavedColorsAtomic = readSource(
  '../esm/native/ui/react/tabs/design_tab_saved_colors_atomic_runtime.ts',
  import.meta.url
);
const designColorFeedback = readSource(
  '../esm/native/ui/react/tabs/design_tab_color_action_feedback.ts',
  import.meta.url
);

test('[contracts-design-color-feedback] DesignTab color workflows use stable feedback seams and focused persistence/upload ownership', () => {
  assertMatchesAll(
    assert,
    designShared,
    [
      /export type DesignTabFeedbackApi = \{/,
      /export function resolveDesignTabFeedback\(/,
      /asToastFn\(/,
      /asPromptFn\(/,
      /asConfirmFn\(/,
    ],
    'design shared feedback seam'
  );

  assertMatchesAll(
    assert,
    designColorManagerShared,
    [
      /export type UseDesignTabColorManagerArgs = \{/,
      /export type DesignTabColorManagerModel = \{/,
      /export function normalizeColorSwatchesOrder\(/,
      /export function buildOrderedSwatches\(/,
    ],
    'design color manager shared seam'
  );

  assertMatchesAll(
    assert,
    designColorManager,
    [
      /export function useDesignTabColorManager\(/,
      /useDesignTabSavedSwatches\(/,
      /useDesignTabCustomColorWorkflow\(/,
      /buildOrderedSwatches\(/,
      /normalizeDesignTabSavedColors\(/,
      /normalizeColorSwatchesOrder\(/,
      /resolveDesignTabFeedback/,
      /const feedback = (?:React\.useMemo|useMemo)\(\(\) => resolveDesignTabFeedback\(args\.fb\), \[args\.fb\]\);/,
      /feedback,/,
    ],
    'design color manager orchestration'
  );

  assertLacksAll(
    assert,
    designColorManager,
    [
      /args\.fb\.toast\(/,
      /args\.fb\.prompt\(/,
      /args\.fb\.confirm\(/,
      /runHistoryBatch\(/,
      /setCfgColorSwatchesOrder\(/,
      /setCfgSavedColors\(/,
      /setCfgCustomUploadedDataURL\(/,
      /new FileReader\(/,
    ],
    'design color manager side-effect ownership'
  );

  assertMatchesAll(
    assert,
    designColorFlows,
    [
      /design_tab_color_command_flows_contracts\.js/,
      /design_tab_color_command_flows_saved\.js/,
      /design_tab_color_command_flows_custom\.js/,
      /design_tab_color_command_flows_texture\.js/,
      /export type \{[\s\S]*DeleteSavedColorFlowArgs,[\s\S]*ReadTextureFileOptions,[\s\S]*SaveCustomColorFlowArgs,[\s\S]*\}/,
      /export \{[\s\S]*reorderSavedColorSwatches,[\s\S]*runDeleteSavedColorFlow,[\s\S]*toggleSavedColorLock,[\s\S]*\} from '\.\/design_tab_color_command_flows_saved\.js';/,
      /export \{[\s\S]*removeCustomTexture,[\s\S]*runSaveCustomColorFlow,[\s\S]*saveCustomColorByName,[\s\S]*\} from '\.\/design_tab_color_command_flows_custom\.js';/,
      /export \{ readTextureFileAsDataUrl \} from '\.\/design_tab_color_command_flows_texture\.js';/,
    ],
    'design color command flows seam'
  );

  assertMatchesAll(
    assert,
    designColorFlowsContracts,
    [
      /export type FileReaderLike = \{/,
      /export type DeleteSavedColorFlowArgs = \{/,
      /export type SaveCustomColorFlowArgs = \{/,
    ],
    'design color command flow contracts'
  );

  assertMatchesAll(
    assert,
    designColorFlowsSaved,
    [
      /export function reorderSavedColorSwatches\(/,
      /export function toggleSavedColorLock\(/,
      /export function deleteSavedColor\(/,
      /export async function runDeleteSavedColorFlow\(/,
      /applySavedColorsAtomicMutation\(/,
      /setCfgSavedColors\(/,
      /requestConfirmationFromFeedback\(/,
      /runConfirmedAction/,
    ],
    'design color saved command flows'
  );

  assertMatchesAll(
    assert,
    designColorFlowsCustom,
    [
      /export function saveCustomColorByName\(/,
      /export function removeCustomTexture\(/,
      /export async function runSaveCustomColorFlow\(/,
      /applySavedColorsAtomicMutation\(/,
      /setCfgCustomUploadedDataURL\(/,
      /requestPromptFromFeedback\(/,
      /runPromptedAction/,
    ],
    'design color custom command flows'
  );

  assertMatchesAll(
    assert,
    designSavedColorsAtomic,
    [
      /export function applySavedColorsAtomicMutation\(/,
      /patchViaActions\(/,
      /getStorageKey\(/,
      /setStorageJSON\(/,
      /runHistoryBatch\(/,
      /setCfgSavedColors\(/,
      /setCfgColorSwatchesOrder\(/,
      /setUiColorChoice\(/,
    ],
    'design saved colors atomic mutation helper'
  );

  assertMatchesAll(
    assert,
    designColorFlowsTexture,
    [
      /export async function readTextureFileAsDataUrl\(/,
      /readFileDataUrlResultViaBrowser\(/,
      /readTextureFileName\(/,
    ],
    'design color texture command flow'
  );

  assertMatchesAll(
    assert,
    designColorFeedback,
    [
      /export function getDesignTabColorActionToast\(/,
      /export function reportDesignTabColorActionResult\(/,
      /save-custom-color/,
      /upload-texture/,
      /delete-color/,
    ],
    'design color feedback policy'
  );

  assertMatchesAll(
    assert,
    designSavedSwatches,
    [
      /export function useDesignTabSavedSwatches\(/,
      /createDesignTabSavedSwatchesController\(/,
      /createDesignTabSavedSwatchesDndController\(/,
      /resolveSelectedSavedColor\(/,
      /dndController\.handleDrop\(/,
      /commandController\.toggleSelectedLock\(/,
      /commandController\.deleteSelected\(/,
      /toggleSelectedColorLock/,
      /deleteSelectedColor/,
    ],
    'design saved swatches seam'
  );

  assertLacksAll(
    assert,
    designSavedSwatches,
    [
      /runHistoryBatch\(/,
      /setCfgColorSwatchesOrder\(/,
      /setCfgSavedColors\(/,
      /args\.fb\.toast\(/,
      /args\.fb\.confirm\(/,
      /reportDesignTabColorActionResult\(/,
      /runDeleteSavedColorFlow\(/,
    ],
    'design saved swatches direct persistence and optional feedback calls'
  );

  assertMatchesAll(
    assert,
    designSavedSwatchesController,
    [
      /export function resolveSelectedSavedColor\(/,
      /export function createDesignTabSavedSwatchesController\(/,
      /reorderSavedColorSwatches\(/,
      /toggleSavedColorLock\(/,
      /runDeleteSavedColorFlow\(/,
      /reportDesignTabColorActionResult\(/,
    ],
    'design saved swatches controller seam'
  );

  assertMatchesAll(
    assert,
    designSavedSwatchesDndController,
    [
      /export function resolveDesignTabSwatchDropPos\(/,
      /export function readDesignTabDraggedColorId\(/,
      /export function createDesignTabSavedSwatchesDndController\(/,
      /reorderByDnD\(dragId, id, pos\);/,
      /reorderByDnD\(dragId, null, 'end'\);/,
    ],
    'design saved swatches dnd controller seam'
  );

  assertMatchesAll(
    assert,
    designCustomWorkflow,
    [
      /export function useDesignTabCustomColorWorkflow\(/,
      /createDesignTabCustomColorWorkflowController\(/,
      /togglePanelOpen: workflowController\.togglePanelOpen/,
      /openCustom: workflowController\.openCustom/,
      /cancelCustom: workflowController\.cancelCustom/,
      /onPickTextureFile: workflowController\.onPickTextureFile/,
      /removeTexture: workflowController\.removeTexture/,
      /saveCustom: workflowController\.saveCustom/,
    ],
    'design custom workflow seam'
  );

  assertLacksAll(
    assert,
    designCustomWorkflow,
    [
      /new FileReader\(/,
      /args\.fb\.toast\(/,
      /args\.fb\.prompt\(/,
      /args\.fb\.confirm\(/,
      /readTextureFileAsDataUrl\(/,
      /runSaveCustomColorFlow\(/,
      /removeCustomTexture\(/,
      /setCfgCustomUploadedDataURL\(/,
      /reportDesignTabColorActionResult\(/,
    ],
    'design custom workflow direct orchestration and optional feedback calls'
  );

  assertMatchesAll(
    assert,
    designCustomWorkflowController,
    [
      /export function resetDesignTabCustomColorFileInput\(/,
      /export function readDesignTabCustomDraftColor\(/,
      /export function createPrevCustomState\(/,
      /export function readTextureFileFromEvent\(/,
      /export function createDesignTabCustomColorWorkflowController\(/,
      /readTextureFileAsDataUrl\(/,
      /runSaveCustomColorFlow\(/,
      /removeCustomTexture\(/,
      /setCfgCustomUploadedDataURL\(/,
      /reportDesignTabColorActionResult\(/,
    ],
    'design custom workflow controller runtime'
  );

  assertMatchesAll(
    assert,
    designMulticolorPanel,
    [
      /export function MultiColorPanel\(/,
      /createDesignTabMulticolorController\(/,
      /const multicolorController = (?:React\.useMemo|useMemo)\(/,
      /multicolorController\.syncPaintColorFromTools\(/,
      /multicolorController\.toggleEnabled\(/,
      /multicolorController\.finishPaintMode\(/,
      /multicolorController\.pickBrush\(/,
      /multicolorController\.readDefaultSwatches\(/,
      /createDesignTabMulticolorViewState\(/,
      /<MultiColorPanelView/,
    ],
    'design multicolor panel seam'
  );

  assertLacksAll(
    assert,
    designMulticolorPanel,
    [
      /setMultiEnabled\(/,
      /exitPaintMode\(/,
      /setCurtainChoice\(/,
      /enterPrimaryMode\(/,
      /setUiScalarSoft\(/,
      /getTools\(/,
      /readDefaultColorsFromApp\(app\)/,
      /const renderDot = \(/,
    ],
    'design multicolor panel direct orchestration'
  );

  assertMatchesAll(
    assert,
    designMulticolorPanelState,
    [
      /export function createDesignTabMulticolorViewState\(/,
      /resolveDesignTabCurtainChoice\(/,
      /MULTI_SPECIAL_SWATCHES/,
    ],
    'design multicolor panel state'
  );

  assertMatchesAll(
    assert,
    designMulticolorPanelView,
    [
      /export function MultiColorPanelView\(/,
      /function MultiColorSwatchDotButton\(/,
      /function MultiColorDoorStyleSection\(/,
      /function MultiColorCurtainSection\(/,
    ],
    'design multicolor panel view'
  );

  assertMatchesAll(
    assert,
    designMulticolorController,
    [
      /export function createDesignTabMulticolorController\(/,
      /syncPaintColorFromTools\(/,
      /toggleEnabled\(/,
      /setMirrorDraftField\(/,
      /finishPaintMode\(/,
      /(?:pickBrush\(|pickBrush:)/,
      /setMultiEnabledImpl\(/,
      /setCurtainChoiceImpl\(/,
      /enterPrimaryModeImpl\(/,
      /setUiScalarSoftImpl\(/,
      /buildDesignTabDefaultSwatches\(/,
    ],
    'design multicolor controller runtime'
  );

  assertMatchesAll(
    assert,
    designMulticolorShared,
    [
      /export type SavedColor = \{/,
      /export function normalizeSavedColors\(/,
      /export const DEFAULT_COLOR_SWATCHES:/,
      /export function readDefaultColorsFromApp\(/,
      /export function buildDesignTabDefaultSwatches\(/,
      /export function __designTabReportNonFatal\(/,
    ],
    'design multicolor shared seam'
  );

  assertMatchesAll(
    assert,
    designEditModes,
    [
      /export function useDesignTabEditModes\(/,
      /resolveDesignTabFeedback/,
      /readDesignTabEditModesState\(/,
      /createDesignTabEditModesController\(/,
      /setFeatureToggle: controller\.setFeatureToggle/,
      /toggleSplitCustomEdit: controller\.toggleSplitCustomEdit/,
    ],
    'design edit modes'
  );

  assertLacksAll(
    assert,
    designEditModes,
    [/args\.fb\.toast\(/, /enterPrimaryMode\(/, /exitPrimaryMode\(/, /setUiFlag\(/],
    'design edit modes direct optional feedback calls and mode orchestration'
  );

  assertMatchesAll(
    assert,
    designEditModesController,
    [
      /export function readDesignTabEditModesState\(/,
      /export function createDesignTabEditModesController\(/,
      /enterPrimaryMode\(/,
      /exitPrimaryMode\(/,
      /setUiFlag\(/,
      /readCurrentFeatureToggle/,
      /__designTabReportNonFatal/,
    ],
    'design edit modes controller runtime'
  );
});
