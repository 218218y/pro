import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { assertLacksAll, assertMatchesAll, bundleSources, readSource } from './_source_bundle.js';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const lineCount = rel => read(rel).trim().split(/\r?\n/).length;

function maybeRead(rel) {
  const url = new URL(`../${rel}`, import.meta.url);
  return fs.existsSync(url) ? fs.readFileSync(url, 'utf8') : '';
}

const namedOnlyPaths = [
  '../esm/native/builder/core.ts',
  '../esm/native/builder/core_pure.ts',
  '../esm/native/builder/core_pure_compute.ts',
  '../esm/native/builder/corner_ops_emit.ts',
  '../esm/native/builder/corner_wing.ts',
  '../esm/native/builder/handles.ts',
  '../esm/native/builder/materials_apply.ts',
  '../esm/native/builder/materials_factory.ts',
  '../esm/native/builder/plan.ts',
  '../esm/native/builder/post_build_finalize.ts',
  '../esm/native/builder/provide.ts',
  '../esm/native/builder/render_adapter.ts',
  '../esm/native/builder/render_door_ops.ts',
  '../esm/native/builder/render_drawer_ops.ts',
  '../esm/native/builder/render_ops.ts',
  '../esm/native/builder/render_ops_extras.ts',
  '../esm/native/builder/render_ops_install.ts',
  '../esm/native/builder/render_ops_primitives.ts',
  '../esm/native/builder/scheduler.ts',
  '../esm/native/builder/sliding_doors_pipeline.ts',
  '../esm/native/builder/visuals_and_contents.ts',
];

const builderRequestBundle = bundleSources(
  [
    '../esm/native/services/edit_state.ts',
    '../esm/native/services/edit_state_shared.ts',
    '../esm/native/services/edit_state_reset.ts',
    '../esm/native/services/edit_state_sync.ts',
    '../esm/native/services/edit_state_runtime.ts',
    '../esm/native/services/canvas_picking_door_remove_click.ts',
    '../esm/native/services/viewport_runtime.ts',
    '../esm/native/platform/smoke_checks.ts',
    '../esm/native/platform/smoke_checks_core.ts',
    '../esm/native/platform/smoke_checks_scenario.ts',
    '../esm/native/platform/smoke_checks_shared.ts',
    '../esm/native/services/canvas_picking_core.ts',
    '../esm/native/services/canvas_picking_click_flow.ts',
    '../esm/native/services/canvas_picking_hover_flow.ts',
    '../esm/native/services/canvas_picking_local_helpers.ts',
    '../esm/native/io/project_io.ts',
    '../esm/native/io/project_io_orchestrator.ts',
    '../esm/native/io/project_io_load_helpers.ts',
    '../esm/native/io/project_io_save_helpers.ts',
    '../esm/native/services/boot_finalizers.ts',
    '../esm/native/builder/post_build_finalize.ts',
    '../esm/native/builder/post_build_finalize_runtime.ts',
    '../esm/native/builder/plan.ts',
    '../esm/native/builder/scheduler.ts',
    '../esm/native/kernel/domain_api.ts',
    '../esm/native/kernel/domain_api_modules_corner.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute_no_main.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute_policy.ts',
    '../esm/native/ui/modes_transition_policy.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const schedulerOwner = readSource('../esm/native/builder/scheduler.ts', import.meta.url);
const schedulerRuntime = readSource('../esm/native/builder/scheduler_runtime.ts', import.meta.url);
const schedulerShared = readSource('../esm/native/builder/scheduler_shared.ts', import.meta.url);
const schedulerDebug = readSource('../esm/native/builder/scheduler_debug_stats.ts', import.meta.url);
const schedulerDebugReasonStore = readSource(
  '../esm/native/builder/scheduler_debug_stats_reason_store.ts',
  import.meta.url
);
const schedulerDebugSignaturePolicy = readSource(
  '../esm/native/builder/scheduler_debug_stats_signature_policy.ts',
  import.meta.url
);
const schedulerDebugRecorders = readSource(
  '../esm/native/builder/scheduler_debug_stats_recorders.ts',
  import.meta.url
);
const schedulerDebugBudget = readSource(
  '../esm/native/builder/scheduler_debug_stats_budget.ts',
  import.meta.url
);
const buildDedupeSignatureOwner = readSource(
  '../esm/native/builder/build_dedupe_signature.ts',
  import.meta.url
);
const buildRunnerOwner = readSource('../esm/native/builder/build_runner.ts', import.meta.url);
const buildRunnerRuntimeOwner = readSource('../esm/native/builder/build_runner_runtime.ts', import.meta.url);
const schedulerInstall = readSource('../esm/native/builder/scheduler_install.ts', import.meta.url);
const buildFlowPlan = readSource('../esm/native/builder/build_flow_plan.ts', import.meta.url);
const buildWardrobe = readSource('../esm/native/builder/build_wardrobe_flow.ts', import.meta.url);
const builderAccess = readSource('../esm/native/runtime/builder_service_access.ts', import.meta.url);
const stackPipeline = readSource('../esm/native/builder/build_stack_split_pipeline.ts', import.meta.url);
const materialsApplyOwner = readSource('../esm/native/builder/materials_apply.ts', import.meta.url);
const handlesApplyOwner = readSource('../esm/native/builder/handles_apply.ts', import.meta.url);
const roomInternalSharedOwner = readSource('../esm/native/builder/room_internal_shared.ts', import.meta.url);
const roomSharedStateOwner = readSource('../esm/native/builder/room_shared_state.ts', import.meta.url);
const editStateResetOwner = readSource('../esm/native/services/edit_state_reset.ts', import.meta.url);
const canvasPickingCoreRuntimeOwner = readSource(
  '../esm/native/services/canvas_picking_core_runtime.ts',
  import.meta.url
);
const uiBootControllerSharedOwner = readSource(
  '../esm/native/ui/ui_boot_controller_shared.ts',
  import.meta.url
);
const errorsInstallSupportOwner = readSource('../esm/native/ui/errors_install_support.ts', import.meta.url);
const platformBootMainOwner = readSource('../esm/native/platform/boot_main.ts', import.meta.url);
const platformAccessOpsOwner = readSource('../esm/native/runtime/platform_access_ops.ts', import.meta.url);
const renderSchedulerOwner = readSource('../esm/native/platform/render_scheduler.ts', import.meta.url);
const lifecycleVisibilityOwner = readSource(
  '../esm/native/platform/lifecycle_visibility.ts',
  import.meta.url
);
const builderBootstrapOwner = readSource('../esm/native/builder/bootstrap.ts', import.meta.url);
const builderBootstrapDrawerMetaOwner = readSource(
  '../esm/native/builder/bootstrap_drawer_meta.ts',
  import.meta.url
);
const visualsAndContents = readSource('../esm/native/builder/visuals_and_contents.ts', import.meta.url);
const renderOpsInstall = readSource('../esm/native/builder/render_ops_install.ts', import.meta.url);
const cellDimsLinearApply = readSource(
  '../esm/native/services/canvas_picking_cell_dims_linear_apply.ts',
  import.meta.url
);
const cornerDimsEffects = readSource(
  '../esm/native/services/canvas_picking_cell_dims_corner_effects.ts',
  import.meta.url
);
const structureWorkflowShared = readSource(
  '../esm/native/ui/react/tabs/use_structure_tab_workflows_shared.ts',
  import.meta.url
);
const bootFinalizersOwner = readSource('../esm/native/services/boot_finalizers.ts', import.meta.url);
const projectLoadOwner = readSource(
  '../esm/native/io/project_io_orchestrator_project_load.ts',
  import.meta.url
);
const sketchActionsOwner = readSource('../esm/native/ui/react/actions/sketch_actions.ts', import.meta.url);
const stateReactivityOwner = bundleSources(
  [
    '../esm/native/kernel/state_api_history_store_reactivity.ts',
    '../esm/native/kernel/state_api_history_store_reactivity_runtime.ts',
    '../esm/native/kernel/state_api_history_store_reactivity_build_meta.ts',
  ],
  import.meta.url
);
const kernelBuilderRequestPolicyOwner = readSource(
  '../esm/native/kernel/kernel_builder_request_policy.ts',
  import.meta.url
);
const snapshotStoreCommitsOwner = bundleSources(
  [
    '../esm/native/kernel/kernel_snapshot_store_commits.ts',
    '../esm/native/kernel/kernel_snapshot_store_commits_shared.ts',
    '../esm/native/kernel/kernel_snapshot_store_commits_ops.ts',
  ],
  import.meta.url
);
const modulesRecomputeOwner = readSource(
  '../esm/native/kernel/domain_api_modules_corner_recompute.ts',
  import.meta.url
);
const modulesRecomputeNoMainOwner = readSource(
  '../esm/native/kernel/domain_api_modules_corner_recompute_no_main.ts',
  import.meta.url
);
const modulesRecomputePolicyOwner = readSource(
  '../esm/native/kernel/domain_api_modules_corner_recompute_policy.ts',
  import.meta.url
);

test('[builder-surface-family] orchestration owners stay named-only and request-build callers stay canonical', () => {
  for (const rel of namedOnlyPaths) {
    const source = readSource(rel, import.meta.url);
    assertLacksAll(assert, source, [/export default\s+/], rel);
  }

  assertMatchesAll(
    assert,
    builderRequestBundle,
    [
      /ensureBuilderBuildUi\(app,/,
      /runBuilderPostBuildFollowThrough\([^,]+, \{/,
      /refreshBuilderAfterDoorOps\(App, \{/,
      /runBuilderBuildWardrobe\(asAppContainer\(App\)\)/,
      /hasBuilderRequestBuild\(asAppContainer\(App\)\)/,
      /installStableSurfaceMethod\(plan,\s*[^,]+,\s*BUILDER_PLAN_CREATE_CANONICAL_KEY/,
      /BUILDER_PLAN_CREATE_CANONICAL_KEY/,
      /installBuilderSchedulerSurface\(App, deps, \{/,
    ],
    'builder request bundle'
  );

  assertLacksAll(
    assert,
    builderRequestBundle,
    [
      /requestBuild\(null,/,
      /getBuilderService\(app\)/,
      /getBuilderService\(App\)/,
      /builder && builder\.handles/,
      /builder && typeof builder\.requestBuild === ''function''/,
      /builder && typeof builder\.buildWardrobe === ''function''/,
      /builder\?\.plan\?\.__esm_v1/,
      /builder\?\.__scheduler\?\.__esm_v1/,
    ],
    'builder request bundle'
  );

  assertMatchesAll(
    assert,
    cellDimsLinearApply,
    [/requestBuilderStructuralRefresh\(App, \{/, /triggerRender:\s*true/, /force:\s*true/],
    'linear cell-dims structural refresh owner'
  );
  assertLacksAll(
    assert,
    cellDimsLinearApply,
    [/requestBuilderBuild\(/, /__wp_triggerRender\(/],
    'linear cell-dims structural refresh owner'
  );

  assertMatchesAll(
    assert,
    cornerDimsEffects,
    [/export function refreshCornerStructure\(/, /requestBuilderStructuralRefresh\(App, \{/],
    'corner dims structural refresh owner'
  );
  assertLacksAll(
    assert,
    cornerDimsEffects,
    [/requestCornerBuild\(/, /triggerCornerRender\(/, /requestBuilderBuild\(/],
    'corner dims structural refresh owner'
  );

  assertMatchesAll(
    assert,
    materialsApplyOwner,
    [/refreshBuilderHandles\(App, \{ triggerRender: true, updateShadows: false \}\)/],
    'materials apply canonical handle/render follow-through'
  );
  assertLacksAll(
    assert,
    materialsApplyOwner,
    [/applyBuilderHandles\(/, /triggerRenderViaPlatform\(/],
    'materials apply canonical handle/render follow-through'
  );

  assertMatchesAll(
    assert,
    platformAccessOpsOwner,
    [/export function runPlatformRenderFollowThrough\(/, /export function runPlatformWakeupFollowThrough\(/],
    'platform render/wakeup follow-through owners'
  );

  assertMatchesAll(
    assert,
    renderSchedulerOwner,
    [/runPlatformWakeupFollowThrough\(A, \{/],
    'render scheduler canonical wakeup follow-through'
  );
  assertLacksAll(
    assert,
    renderSchedulerOwner,
    [/touchPlatformActivity\(/, /ensureRenderLoopViaPlatform\(/],
    'render scheduler canonical wakeup follow-through'
  );

  assertMatchesAll(
    assert,
    lifecycleVisibilityOwner,
    [/runPlatformWakeupFollowThrough\(root, \{/],
    'lifecycle visibility canonical wakeup follow-through'
  );
  assertLacksAll(
    assert,
    lifecycleVisibilityOwner,
    [/touchPlatformActivity\(/, /ensureRenderLoopViaPlatform\(/],
    'lifecycle visibility canonical wakeup follow-through'
  );

  assertMatchesAll(
    assert,
    builderBootstrapOwner,
    [
      /from '\.\/bootstrap_shared\.js';/,
      /from '\.\/bootstrap_bindings\.js';/,
      /createBuilderNamespaceBindingMap\(/,
    ],
    'builder bootstrap canonical ownership split'
  );
  assertLacksAll(
    assert,
    builderBootstrapOwner,
    [/runPlatformWakeupFollowThrough\(App\)/, /touchPlatformActivity\(/, /ensureRenderLoopViaPlatform\(/],
    'builder bootstrap canonical ownership split'
  );

  assertMatchesAll(
    assert,
    builderBootstrapDrawerMetaOwner,
    [/runPlatformWakeupFollowThrough\(App\)/],
    'builder bootstrap drawer-meta canonical wakeup follow-through'
  );
  assertLacksAll(
    assert,
    builderBootstrapDrawerMetaOwner,
    [/touchPlatformActivity\(/, /ensureRenderLoopViaPlatform\(/],
    'builder bootstrap drawer-meta canonical wakeup follow-through'
  );

  assertMatchesAll(
    assert,
    handlesApplyOwner,
    [/runPlatformRenderFollowThrough\(App, \{ updateShadows: false \}\)/],
    'handles apply canonical render follow-through'
  );
  assertLacksAll(
    assert,
    handlesApplyOwner,
    [/triggerRenderViaPlatform\(/],
    'handles apply canonical render follow-through'
  );

  assertMatchesAll(
    assert,
    roomInternalSharedOwner,
    [
      /export \* from '\.\/room_shared_types\.js';/,
      /export \* from '\.\/room_shared_utils\.js';/,
      /export \* from '\.\/room_shared_state\.js';/,
    ],
    'room internal shared canonical ownership split'
  );
  assertLacksAll(
    assert,
    roomInternalSharedOwner,
    [
      /runPlatformRenderFollowThrough\(A, \{ updateShadows \}\)/,
      /triggerRenderViaPlatform\(/,
      /ensureRenderLoopViaPlatform\(/,
    ],
    'room internal shared canonical ownership split'
  );

  assertMatchesAll(
    assert,
    roomSharedStateOwner,
    [/runPlatformRenderFollowThrough\(A, \{ updateShadows \}\)/],
    'room shared state canonical render follow-through'
  );
  assertLacksAll(
    assert,
    roomSharedStateOwner,
    [/triggerRenderViaPlatform\(/, /ensureRenderLoopViaPlatform\(/],
    'room shared state canonical render follow-through'
  );

  assertMatchesAll(
    assert,
    editStateResetOwner,
    [/runPlatformRenderFollowThrough\(app, \{ updateShadows: true, ensureRenderLoop: false \}\)/],
    'edit-state reset canonical render follow-through'
  );
  assertLacksAll(
    assert,
    editStateResetOwner,
    [/triggerRenderViaPlatform\(/],
    'edit-state reset canonical render follow-through'
  );

  assertMatchesAll(
    assert,
    canvasPickingCoreRuntimeOwner,
    [/runPlatformRenderFollowThrough\(App, \{ updateShadows, ensureRenderLoop: false \}\)/],
    'canvas picking runtime canonical render follow-through'
  );
  assertLacksAll(
    assert,
    canvasPickingCoreRuntimeOwner,
    [/triggerRenderViaPlatform\(/],
    'canvas picking runtime canonical render follow-through'
  );

  assertMatchesAll(
    assert,
    uiBootControllerSharedOwner,
    [/runPlatformRenderFollowThrough\(App, \{ updateShadows: !!updateShadows, ensureRenderLoop: false \}\)/],
    'ui boot controller shared canonical render follow-through'
  );
  assertLacksAll(
    assert,
    uiBootControllerSharedOwner,
    [/triggerRenderViaPlatform\(/],
    'ui boot controller shared canonical render follow-through'
  );

  assertMatchesAll(
    assert,
    errorsInstallSupportOwner,
    [/runPlatformWakeupFollowThrough\(App, \{ touchActivity: false \}\)/],
    'errors install support canonical wakeup follow-through'
  );
  assertLacksAll(
    assert,
    errorsInstallSupportOwner,
    [/ensureRenderLoopViaPlatform\(/],
    'errors install support canonical wakeup follow-through'
  );

  assertMatchesAll(
    assert,
    platformBootMainOwner,
    [/runPlatformRenderFollowThrough\(root, \{ updateShadows: false, ensureRenderLoop: false \}\)/],
    'platform boot main canonical render follow-through'
  );
  assertLacksAll(
    assert,
    platformBootMainOwner,
    [/triggerRenderViaPlatform\(/],
    'platform boot main canonical render follow-through'
  );

  assertMatchesAll(
    assert,
    structureWorkflowShared,
    [
      /applyStructureTemplateRecomputeBatch\(\{/,
      /statePatch:\s*\{ config:\s*\{ modulesConfiguration: nextList \} \}/,
      /statePatch:\s*\{ config:\s*\{ isManualWidth: false \}, ui:\s*\{ raw:\s*\{ width: nextWidth \} \} \}/,
    ],
    'structure workflow structural refresh owner'
  );

  assertMatchesAll(
    assert,
    bootFinalizersOwner,
    [
      /requestBuilderForcedBuild\(App, \{/,
      /requestBuilderDebouncedBuild\(App, \{ reason: 'wardrobe\.rebuildDebounced' \}\)/,
    ],
    'boot finalizers canonical build policies'
  );
  assertLacksAll(
    assert,
    bootFinalizersOwner,
    [/requestBuilderBuild\(App,/],
    'boot finalizers canonical build policies'
  );

  assertMatchesAll(
    assert,
    projectLoadOwner,
    [/requestBuilderForcedBuild\(App, \{ reason: 'project\.load' \}\)/],
    'project load canonical build policy'
  );
  assertLacksAll(
    assert,
    projectLoadOwner,
    [/requestBuilderBuild\(App,/],
    'project load canonical build policy'
  );

  assertMatchesAll(
    assert,
    sketchActionsOwner,
    [/requestBuilderForcedBuild\(app, \{/, /reason:\s*'react\.action'/],
    'sketch actions canonical build policy'
  );
  assertLacksAll(
    assert,
    sketchActionsOwner,
    [/requestBuilderBuild\(app,/],
    'sketch actions canonical build policy'
  );

  assertMatchesAll(
    assert,
    stateReactivityOwner,
    [
      /const nextImmediateMeta = mergeStateApiDelayedBuildMeta\(pendingMeta, a0\);/,
      /requestKernelBuilderBuild\(A, nextImmediateMeta, \{ source: 'store', immediate: true \}\)/,
      /requestKernelBuilderBuild\(A, nextMeta, \{ source: 'store', immediate: false \}\)/,
    ],
    'state reactivity canonical build policy'
  );
  assertLacksAll(
    assert,
    stateReactivityOwner,
    [/requestBuilderBuild\(A,/],
    'state reactivity canonical build policy'
  );

  assertMatchesAll(
    assert,
    snapshotStoreCommitsOwner,
    [
      /requestKernelSnapshotBuild\(args\.App, o, source, shouldForceBuild, wroteSnapshot\);/,
      /reason:\s*source/,
      /force:\s*shouldForceBuild/,
    ],
    'snapshot store canonical build policy'
  );
  assertLacksAll(
    assert,
    snapshotStoreCommitsOwner,
    [/requestBuilderBuild\(args\.App,/],
    'snapshot store canonical build policy'
  );

  assertMatchesAll(
    assert,
    kernelBuilderRequestPolicyOwner,
    [/export function requestKernelBuilderBuild\(/, /export function shouldRequestKernelBuilderBuild\(/],
    'kernel builder request policy owner'
  );

  assertMatchesAll(
    assert,
    modulesRecomputeOwner,
    [
      /requestModulesRecomputeBuild\(App, uiOverride, runtime\.meta, 'noChange', runtime\.options\)/,
      /requestModulesRecomputeBuild\(App, uiOverride, runtime\.meta, 'noModuleChange', runtime\.options\)/,
      /applyModulesRecomputeWrite\(\{/,
      /reason:\s*'derived'/,
    ],
    'modules recompute canonical ui-override build policy'
  );
  assertLacksAll(
    assert,
    modulesRecomputeOwner,
    [
      /requestBuilderBuildWithUi\(App, uiOverride,/,
      /requestBuilderBuildWithUiFromActionMeta\(App, uiOverride,/,
    ],
    'modules recompute canonical ui-override build policy'
  );

  assertMatchesAll(
    assert,
    modulesRecomputeNoMainOwner,
    [
      /requestModulesRecomputeBuild\(App, uiOverride, runtime\.meta, 'noMain', runtime\.options\)/,
      /applyModulesRecomputeWrite\(\{/,
      /reason:\s*'noMainCleanup'/,
    ],
    'no-main modules canonical ui-override build policy'
  );
  assertLacksAll(
    assert,
    modulesRecomputeNoMainOwner,
    [
      /requestBuilderBuildWithUi\(App, uiOverride,/,
      /requestBuilderBuildWithUiFromActionMeta\(App, uiOverride,/,
    ],
    'no-main modules canonical ui-override build policy'
  );

  assertMatchesAll(
    assert,
    modulesRecomputePolicyOwner,
    [
      /export function requestModulesRecomputeBuild\(/,
      /export function applyModulesRecomputeWrite\(/,
      /export function createDerivedModulesWriteMeta\(/,
      /export function createNoMainModulesCleanupMeta\(/,
    ],
    'modules recompute policy owner'
  );
});

test('[builder-surface-family] orchestration owners remain thin around canonical scheduler/flow/access seams', () => {
  assertMatchesAll(
    assert,
    schedulerOwner,
    [
      /from '\.\/scheduler_runtime\.js'/,
      /from '\.\/scheduler_install\.js'/,
      /export function requestBuild\(/,
      /export function installBuilderScheduler\(/,
    ],
    'scheduler owner'
  );
  assertLacksAll(
    assert,
    schedulerOwner,
    [
      /function nextScheduleVersion\(/,
      /function schedulePendingBuildDebounced\(/,
      /function executePendingBuild\(/,
    ],
    'scheduler owner'
  );

  assertMatchesAll(
    assert,
    schedulerRuntime,
    [
      /from '\.\/scheduler_shared\.js'/,
      /from '\.\/scheduler_debug_stats\.js'/,
      /export function ensureSchedulerDebouncedRunner\(/,
      /export function requestBuildRuntime\(/,
      /export function runPendingBuildRuntime\(/,
    ],
    'scheduler runtime owner'
  );
  assertMatchesAll(assert, schedulerShared, [/export function ensureSchedulerState\(/], 'scheduler shared');
  assertMatchesAll(
    assert,
    buildDedupeSignatureOwner,
    [/export function createBuildDedupeSignature\(/, /export function readBuildDedupeSignatureFromState\(/],
    'build dedupe signature owner'
  );
  assertMatchesAll(
    assert,
    schedulerDebug,
    [
      /from '\.\/scheduler_debug_stats_reason_store\.js'/,
      /from '\.\/scheduler_debug_stats_signature_policy\.js'/,
      /from '\.\/scheduler_debug_stats_recorders\.js'/,
      /from '\.\/scheduler_debug_stats_budget\.js'/,
    ],
    'scheduler debug facade'
  );
  assertLacksAll(
    assert,
    schedulerDebug,
    [/function readReasonStat\(/, /readBuildDedupeSignatureFromState\(/, /export function recordBuildExecute\(/],
    'scheduler debug facade'
  );
  assertMatchesAll(
    assert,
    schedulerDebugReasonStore,
    [/export function createBuildDebugStats\(/, /export function ensureBuildDebugStats\(/, /getReasonStats\(/],
    'scheduler debug reason store'
  );
  assertMatchesAll(
    assert,
    schedulerDebugSignaturePolicy,
    [
      /from '\.\/build_dedupe_signature\.js'/,
      /readBuildDedupeSignatureFromState\(/,
      /export function shouldSuppressDuplicatePendingRequest\(/,
    ],
    'scheduler debug signature policy'
  );
  assertMatchesAll(
    assert,
    schedulerDebugRecorders,
    [/from '\.\/scheduler_debug_stats_reason_store\.js'/, /export function recordBuildExecute\(/],
    'scheduler debug recorders'
  );
  assertMatchesAll(
    assert,
    schedulerDebugBudget,
    [/export function summarizeBuildDebugBudget\(/, /function ratio\(/],
    'scheduler debug budget summary'
  );
  assertMatchesAll(
    assert,
    buildRunnerOwner,
    [/from '\.\/build_runner_runtime\.js'/, /stageCoalescedBuildRequest\(/],
    'build runner entry seam'
  );
  assertMatchesAll(
    assert,
    buildRunnerRuntimeOwner,
    [/from '\.\/build_dedupe_signature\.js'/, /readBuildDedupeSignatureFromArgs\(/],
    'build runner canonical dedupe signature owner'
  );
  assertLacksAll(
    assert,
    buildRunnerRuntimeOwner,
    [/function normalizeBuildRunnerScalar\(/, /function readBuildRunnerStateSignature\(/],
    'build runner canonical dedupe signature owner'
  );
  assertMatchesAll(
    assert,
    schedulerInstall,
    [
      /from '\.\/scheduler_runtime\.js'/,
      /ensureSchedulerDebouncedRunner\(/,
      /export function installBuilderSchedulerSurface\(/,
    ],
    'scheduler install'
  );

  assertMatchesAll(
    assert,
    buildFlowPlan,
    [
      /build_flow_plan_inputs\.js/,
      /build_flow_plan_materials\.js/,
      /build_flow_plan_layout\.js/,
      /build_flow_plan_dimensions\.js/,
      /export type \{ BuildFlowPlan \} from '\.\/build_flow_plan_contracts\.js';/,
    ],
    'build flow plan owner'
  );
  assertLacksAll(assert, buildFlowPlan, [/export type BuildFlowPlan = \{/], 'build flow plan owner');

  assertMatchesAll(
    assert,
    buildWardrobe,
    [/prepareBuildWardrobeFlow/, /executeBuildWardrobeFlow/],
    'build wardrobe owner'
  );

  assertMatchesAll(
    assert,
    builderAccess,
    [
      /from '\.\/builder_service_access_shared\.js';/,
      /from '\.\/builder_service_access_slots\.js';/,
      /from '\.\/builder_service_access_calls\.js';/,
      /from '\.\/builder_service_access_build\.js';/,
      /requestBuilderStructuralRefresh/,
    ],
    'builder service access entrypoint'
  );
  assert.ok(builderAccess.split('\n').length < 80, 'builder service access entrypoint should stay thin');

  assertMatchesAll(
    assert,
    stackPipeline,
    [
      /from '\.\/build_stack_split_shared\.js'/,
      /from '\.\/build_stack_split_context\.js'/,
      /export function buildStackSplitLowerUnit\(/,
    ],
    'stack split pipeline owner'
  );

  assertMatchesAll(
    assert,
    visualsAndContents,
    [
      /export function installBuilderVisualsAndContents\(/,
      /export function getBuilderModules\(/,
      /export function getBuilderContents\(/,
    ],
    'visuals and contents owner'
  );

  assertMatchesAll(
    assert,
    renderOpsInstall,
    [/export function createBuilderRenderOpsInstall\(/, /getBuilderRenderOps/, /installBuilderRenderOps/],
    'render ops install owner'
  );
});

test('[builder-surface-family] corner owners stay thin and delegate to dedicated emit/runtime modules', () => {
  const cornerOpsOwner = read('esm/native/builder/corner_ops_emit.ts');
  const connectorOwner = read('esm/native/builder/corner_connector_emit.ts');
  const wingOwner = read('esm/native/builder/corner_wing.ts');
  const wingExtensionOwner = read('esm/native/builder/corner_wing_extension_emit.ts');
  const connectorSpecial = read('esm/native/builder/corner_connector_interior_special.ts');

  assert.match(cornerOpsOwner, /corner_connector_emit\.js/);
  assert.match(cornerOpsOwner, /corner_wing_extension_emit\.js/);
  assert.match(cornerOpsOwner, /export \{ emitCornerConnector, emitCornerWingExtension \}/);

  assert.match(connectorOwner, /corner_connector_emit_shell\.js/);
  assert.match(connectorOwner, /corner_connector_interior_emit\.js/);
  assert.match(connectorOwner, /corner_connector_door_emit\.js/);
  assert.match(connectorOwner, /corner_connector_cornice_emit\.js/);
  assert.doesNotMatch(connectorOwner, /function emitConnectorShell\(/);

  assert.match(wingOwner, /corner_wing_runtime\.js/);
  assert.match(wingOwner, /corner_wing_context\.js/);
  assert.match(wingOwner, /corner_wing_shadows\.js/);
  assert.match(wingOwner, /corner_wing_install\.js/);
  assert.doesNotMatch(wingOwner, /export default\s+/);

  assert.match(wingExtensionOwner, /corner_wing_carcass_emit\.js/);
  assert.match(wingExtensionOwner, /corner_wing_extension_cells\.js/);
  assert.match(wingExtensionOwner, /corner_wing_cell_emit\.js/);
  assert.match(wingExtensionOwner, /corner_wing_cornice_emit\.js/);

  assert.match(connectorSpecial, /createLeftShelvesContentsPlan\(/);
  assert.match(connectorSpecial, /createPentagonTopContentsPlan\(/);
});

test('[builder-surface-family] visuals/module seams stay consolidated behind canonical owner seams', () => {
  const carcassOwner = read('esm/native/builder/core_carcass_compute.ts');
  const carcassShared = read('esm/native/builder/core_carcass_shared.ts');
  const carcassShell = read('esm/native/builder/core_carcass_shell.ts');
  const carcassCornice = read('esm/native/builder/core_carcass_cornice.ts');

  assert.match(carcassOwner, /core_carcass_shared\.js/);
  assert.match(carcassOwner, /core_carcass_shell\.js/);
  assert.match(carcassOwner, /core_carcass_cornice\.js/);
  assert.match(carcassOwner, /prepareCarcassInput\(/);
  assert.match(carcassOwner, /buildCarcassShell\(/);
  assert.match(carcassOwner, /buildCarcassCornice\(/);
  assert.ok(lineCount('esm/native/builder/core_carcass_compute.ts') < 80);
  assert.match(carcassShared, /export function prepareCarcassInput\(/);
  assert.match(carcassShell, /export function buildCarcassShell\(/);
  assert.match(carcassCornice, /export function buildCarcassCornice\(/);

  const handlesOwner = read('esm/native/builder/handles_apply.ts');
  const handlesShared = read('esm/native/builder/handles_apply_shared.ts');
  const handlesDoors = read('esm/native/builder/handles_apply_doors.ts');
  const handlesDrawers = read('esm/native/builder/handles_apply_drawers.ts');

  assert.match(handlesOwner, /handles_apply_shared\.js/);
  assert.match(handlesOwner, /handles_apply_doors\.js/);
  assert.match(handlesOwner, /handles_apply_drawers\.js/);
  assert.doesNotMatch(handlesOwner, /const isDoorRemovedV7 = \(partId: unknown\): boolean =>/);
  assert.doesNotMatch(
    handlesOwner,
    /const isDrawerLikeGroup = \(node: NodeLike \| null \| undefined\): boolean =>/
  );
  assert.doesNotMatch(handlesOwner, /const computeGroupMaxZLocal = \(\(\) =>/);
  assert.match(handlesShared, /export type HandlesApplyRuntime = \{/);
  assert.match(handlesDoors, /export function applyDoorHandles\(runtime: HandlesApplyRuntime\): void \{/);
  assert.match(handlesDrawers, /export function applyDrawerHandles\(runtime: HandlesApplyRuntime\): void \{/);

  const moduleOwner = read('esm/native/builder/module_loop_pipeline_module.ts');
  const moduleDepth = read('esm/native/builder/module_loop_pipeline_module_depth.ts');
  const moduleFrame = read('esm/native/builder/module_loop_pipeline_module_frame.ts');
  const moduleDividers = read('esm/native/builder/module_loop_pipeline_module_dividers.ts');
  const moduleRegistry = read('esm/native/builder/module_loop_pipeline_module_registry.ts');
  const moduleContents = read('esm/native/builder/module_loop_pipeline_module_contents.ts');
  const legacySupport = maybeRead('esm/native/builder/module_loop_pipeline_module_support.ts');

  assert.match(moduleOwner, /module_loop_pipeline_module_frame\.js/);
  assert.match(moduleOwner, /module_loop_pipeline_module_dividers\.js/);
  assert.match(moduleOwner, /module_loop_pipeline_module_registry\.js/);
  assert.match(moduleOwner, /module_loop_pipeline_module_contents\.js/);
  assert.doesNotMatch(moduleOwner, /appendHingedDoorOpsForModule\(/);
  assert.doesNotMatch(moduleOwner, /applyExternalDrawersForModule\(/);
  assert.doesNotMatch(moduleOwner, /getBuilderRenderOps\(/);
  assert.match(moduleDepth, /export function resolveModuleDepthProfile\(/);
  assert.match(moduleFrame, /export function resolveModuleFrame\(/);
  assert.match(moduleDividers, /export function createInterDivider\(/);
  assert.match(moduleRegistry, /export function registerModuleHitBox\(/);
  assert.match(moduleContents, /export function applyModuleContents\(/);
  assert.equal(
    legacySupport,
    '',
    'legacy module support owner should stay removed after the ownership split'
  );

  const runtimeSeam = read('esm/native/builder/module_loop_pipeline_runtime.ts');
  const runtimeContracts = read('esm/native/builder/module_loop_pipeline_runtime_contracts.ts');
  const runtimeShared = read('esm/native/builder/module_loop_pipeline_runtime_shared.ts');
  const runtimeBase = read('esm/native/builder/module_loop_pipeline_runtime_base.ts');
  const runtimeResolvers = read('esm/native/builder/module_loop_pipeline_runtime_resolvers.ts');

  assert.match(runtimeSeam, /module_loop_pipeline_runtime_contracts\.js/);
  assert.match(runtimeSeam, /module_loop_pipeline_runtime_shared\.js/);
  assert.match(runtimeSeam, /module_loop_pipeline_runtime_base\.js/);
  assert.match(runtimeSeam, /module_loop_pipeline_runtime_resolvers\.js/);
  assert.doesNotMatch(runtimeSeam, /function reqNumber\(/);
  assert.doesNotMatch(runtimeSeam, /function createModuleDoorSpanResolver\(/);
  assert.match(runtimeContracts, /export interface ModuleLoopRuntime/);
  assert.match(runtimeShared, /export function readCreateBoard\(/);
  assert.match(runtimeBase, /export function resolveModuleLoopRuntimeBase\(/);
  assert.match(runtimeResolvers, /export function resolveModuleLoopRuntimeResolvers\(/);

  const chestSeam = read('esm/native/builder/visuals_chest_mode.ts');
  const chestRuntime = read('esm/native/builder/visuals_chest_mode_runtime.ts');
  const chestInputs = read('esm/native/builder/visuals_chest_mode_inputs.ts');
  const chestMaterials = read('esm/native/builder/visuals_chest_mode_materials.ts');
  const chestDrawerBox = read('esm/native/builder/visuals_chest_mode_drawer_box.ts');
  const chestBuild = read('esm/native/builder/visuals_chest_mode_build.ts');

  assert.ok(lineCount('esm/native/builder/visuals_chest_mode.ts') < 20);
  assert.match(chestSeam, /visuals_chest_mode_drawer_box\.js/);
  assert.match(chestSeam, /visuals_chest_mode_build\.js/);
  assert.match(chestRuntime, /export function ensureChestModeApp\(/);
  assert.match(chestInputs, /export function resolveChestModeBuildInputs\(/);
  assert.match(chestMaterials, /export function resolveChestModeBodyMaterialState\(/);
  assert.match(chestDrawerBox, /export const createInternalDrawerBox/);
  assert.match(chestBuild, /export function buildChestOnly\(/);

  const contentsSeam = read('esm/native/builder/visuals_contents.ts');
  const contentsShared = read('esm/native/builder/visuals_contents_shared.ts');
  const contentsHanging = read('esm/native/builder/visuals_contents_hanging.ts');
  const contentsFolded = read('esm/native/builder/visuals_contents_folded.ts');
  const contentsHanger = read('esm/native/builder/visuals_contents_hanger.ts');

  assert.match(contentsSeam, /visuals_contents_hanging\.js/);
  assert.match(contentsSeam, /visuals_contents_folded\.js/);
  assert.match(contentsSeam, /visuals_contents_hanger\.js/);
  assert.doesNotMatch(
    contentsSeam,
    /seededRandom|getRandomClothColor|showContents|showHanger|TorusGeometry|ExtrudeGeometry/
  );
  assert.match(contentsShared, /export function ensureVisualsContentsApp\(/);
  assert.match(contentsHanging, /export const addHangingClothes/);
  assert.match(contentsFolded, /export const addFoldedClothes/);
  assert.match(contentsHanger, /export const addRealisticHanger/);
});
