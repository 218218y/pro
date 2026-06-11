import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const buildRunnerEntry = readSource('../esm/native/builder/build_runner.ts', import.meta.url);
const buildRunnerRuntime = readSource('../esm/native/builder/build_runner_runtime.ts', import.meta.url);
const buildExecuteEntry = readSource('../esm/native/builder/build_wardrobe_flow_execute.ts', import.meta.url);
const buildExecuteRuntime = readSource(
  '../esm/native/builder/build_wardrobe_flow_execute_runtime.ts',
  import.meta.url
);
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
      /export function runCoalescedBuild\(/,
    ],
    'buildRunnerEntry'
  );
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
      /maybeRenderNoMainSketchHost\(/,
      /applyPostBuildExtras\(/,
    ],
    'buildExecuteRuntime'
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
