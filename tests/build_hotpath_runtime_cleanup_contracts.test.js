import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const buildRunnerEntry = readSource('../esm/native/builder/build_runner.ts', import.meta.url);
const buildRunnerRuntime = readSource('../esm/native/builder/build_runner_runtime.ts', import.meta.url);
const buildAppContext = readSource('../esm/native/builder/build_app_context.ts', import.meta.url);
const builderCore = readSource('../esm/native/builder/core.ts', import.meta.url);
const buildFlowEntry = readSource('../esm/native/builder/build_wardrobe_flow.ts', import.meta.url);
const buildExecuteEntry = readSource('../esm/native/builder/build_wardrobe_flow_execute.ts', import.meta.url);
const buildExecuteRuntime = readSource(
  '../esm/native/builder/build_wardrobe_flow_execute_runtime.ts',
  import.meta.url
);
const buildFlowRuntime = readSource('../esm/native/builder/build_wardrobe_flow_runtime.ts', import.meta.url);
const buildFlowPrepare = readSource('../esm/native/builder/build_wardrobe_flow_prepare.ts', import.meta.url);
const buildFlowContext = readSource('../esm/native/builder/build_wardrobe_flow_context.ts', import.meta.url);
const buildRequestRuntime = readSource(
  '../esm/native/runtime/builder_service_access_build_request_runtime.ts',
  import.meta.url
);

test('[build-hotpath-runtime-cleanup] hot-path entry seams stay thin while runtime owners hold execution/effects policy', () => {
  assertMatchesAll(
    assert,
    buildRunnerEntry,
    [
      /from '\.\/build_runner_runtime\.js'/,
      /readBuildRunnerShadowAutoUpdateState\(/,
      /finalizeCoalescedBuildRunRuntime\(/,
      /export function runCoalescedBuild(?:<[^>]+>)?\(/,
    ],
    'buildRunnerEntry'
  );
  assertMatchesAll(
    assert,
    buildFlowEntry,
    [/BuildContextLike \| null \| undefined/, /runPreparedBuildWardrobeFlow\(/],
    'synchronous build flow result'
  );
  assertLacksAll(assert, builderCore, [/run:\s*async\b/], 'builder production synchronous callsite');
  assertLacksAll(
    assert,
    buildRunnerEntry,
    [
      /function reportBuildRunnerSoftError\(/,
      /function runPostBuildReactions\(/,
      /getRenderer\(/,
      /getBuildReactionsServiceMaybe\(/,
      /getPlatformReportError\(/,
      /takePendingCoalescedReplay\(/,
    ],
    'buildRunnerEntry'
  );

  assertMatchesAll(
    assert,
    buildRunnerRuntime,
    [
      /export function readBuildRunnerShadowAutoUpdateState\(/,
      /export function disableBuildRunnerShadowAutoUpdate\(/,
      /export function restoreBuildRunnerShadowAutoUpdate\(/,
      /export function runBuildRunnerPostBuildReactions\(/,
      /export function finalizeCoalescedBuildRunRuntime\(/,
    ],
    'buildRunnerRuntime'
  );
  assertLacksAll(
    assert,
    `${buildRunnerEntry}\n${buildRunnerRuntime}`,
    [/AppContainer/, /\bApp\b/, /getRenderer\(/, /getPlatformReportError\(/],
    'build runner capability boundary'
  );
  assertMatchesAll(
    assert,
    buildAppContext,
    [/createBuildRunnerRuntimeContext\(/, /AppContainer/, /getRenderer\(/],
    'builder App adapter'
  );
  assertLacksAll(
    assert,
    buildFlowRuntime,
    [/AppContainer/, /\bApp\b/, /reportError\(/, /guardVoid\(/],
    'prepared build flow runtime capability boundary'
  );
  assertMatchesAll(
    assert,
    buildFlowPrepare,
    [
      /orchestration\.resolveState\(/,
      /orchestration\.resetCaches\(/,
      /orchestration\.captureOpenState\(/,
      /orchestration\.publishBuildUi\(/,
      /orchestration\.sanitizeDimensions\(/,
    ],
    'prepared build flow orchestration ports'
  );
  assertLacksAll(
    assert,
    buildFlowPrepare,
    [
      /resetInternalGridMaps/,
      /captureLocalOpenStateBeforeBuild/,
      /resolveBuildStateOrThrow/,
      /sanitizeBuildDimsAndSyncRuntime/,
    ],
    'prepared build flow App access'
  );
  assertMatchesAll(
    assert,
    buildAppContext,
    [
      /AppContainer/,
      /resolveBuildStateOrThrow\(/,
      /resetInternalGridMaps\(/,
      /reportError\(/,
      /maybeRenderNoMainSketchHost\(/,
      /finalizeStackSplitUpperShift\(/,
      /makeHandleCreator\(/,
    ],
    'prepared build flow App adapter'
  );
  assertMatchesAll(
    assert,
    buildFlowContext,
    [
      /orchestration\.createHandleBindings\(/,
      /orchestration\.readWardrobeChildCount\(/,
      /orchestration\.syncNoMainWorkspaceMetrics\(/,
    ],
    'prepared build context orchestration ports'
  );
  assertLacksAll(
    assert,
    buildFlowContext,
    [
      /bindEdgeHandleDefaultNoneReader/,
      /makeHandleCreator/,
      /getWardrobeGroup/,
      /syncNoMainSketchWorkspaceMetrics/,
    ],
    'prepared build context App-owned bindings'
  );

  assertMatchesAll(
    assert,
    buildExecuteEntry,
    [
      /from '\.\/build_wardrobe_flow_execute_runtime\.js'/,
      /runPreparedBuildWardrobePlan\(/,
      /completePreparedBuildWardrobeExecution\(/,
      /export function executeBuildWardrobeFlow\(/,
    ],
    'buildExecuteEntry'
  );
  assertLacksAll(
    assert,
    buildExecuteEntry,
    [
      /buildModulesLoop\(/,
      /applyHingedDoorOpsAfterModules\(/,
      /applySlidingDoorsIfNeeded\(/,
      /maybeRenderNoMainSketchHost\(/,
      /finalizeStackSplitUpperShift\(/,
      /applyPostBuildExtras\(/,
    ],
    'buildExecuteEntry'
  );

  assertMatchesAll(
    assert,
    buildExecuteRuntime,
    [
      /export function runPreparedBuildWardrobePlan\(/,
      /export function completePreparedBuildWardrobeExecution\(/,
      /buildModulesLoop\(/,
      /orchestration\.renderNoMainSketchHost\(/,
      /orchestration\.finalizeStackSplitUpperShift\(/,
      /applyPostBuildExtras\(/,
    ],
    'buildExecuteRuntime'
  );
  assertLacksAll(
    assert,
    buildExecuteRuntime,
    [
      /prepared\.App/,
      /\bApp\b/,
      /from '\.\/build_no_main_sketch_host\.js'/,
      /from '\.\/build_stack_split_pipeline\.js'/,
    ],
    'prepared build execute App boundary'
  );

  assertMatchesAll(
    assert,
    buildRequestRuntime,
    [
      /export function resolveBuilderBuildFollowThroughDecision\(/,
      /export function shouldRunStructuralRefreshFollowThrough\(/,
      /export function requestBuilderStructuralRefreshRuntime\(/,
    ],
    'buildRequestRuntime'
  );
});
