import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const storeReactivityOwner = readSource(
  '../esm/native/kernel/state_api_history_store_reactivity.ts',
  import.meta.url
);
const storeReactivityRuntime = readSource(
  '../esm/native/kernel/state_api_history_store_reactivity_runtime.ts',
  import.meta.url
);
const snapshotCommitOwner = readSource(
  '../esm/native/kernel/kernel_snapshot_store_commits.ts',
  import.meta.url
);
const snapshotCommitShared = readSource(
  '../esm/native/kernel/kernel_snapshot_store_commits_shared.ts',
  import.meta.url
);
const snapshotCommitOps = readSource(
  '../esm/native/kernel/kernel_snapshot_store_commits_ops.ts',
  import.meta.url
);
const kernelConfigPatchOwner = readSource(
  '../esm/native/kernel/kernel_state_kernel_config_maps_patch.ts',
  import.meta.url
);
const kernelConfigPatchShared = readSource(
  '../esm/native/kernel/kernel_state_kernel_config_maps_patch_shared.ts',
  import.meta.url
);
const kernelConfigPatchOps = readSource(
  '../esm/native/kernel/kernel_state_kernel_config_maps_patch_ops.ts',
  import.meta.url
);

test('[kernel-store-boundary] thin public owners delegate kernel/store boundary orchestration to focused seams', () => {
  assertMatchesAll(
    assert,
    storeReactivityOwner,
    [
      /state_api_history_store_reactivity_runtime\.js/,
      /export function installStateApiStoreReactivity\(/,
      /installStateApiStoreReactivityRuntime\(ctx\);/,
    ],
    'stateApiStoreReactivityOwner'
  );
  assertLacksAll(
    assert,
    storeReactivityOwner,
    [/scheduleAutosaveViaService\(A\)/, /requestKernelBuilderBuild\(A,/],
    'stateApiStoreReactivityOwner'
  );

  assertMatchesAll(
    assert,
    storeReactivityRuntime,
    [
      /scheduleAutosaveViaService\(A\)/,
      /requestKernelBuilderBuild\(A, nextImmediateMeta, \{ source: 'store', immediate: true \}\)/,
      /requestKernelBuilderBuild\(A, nextMeta, \{ source: 'store', immediate: false \}\)/,
    ],
    'stateApiStoreReactivityRuntime'
  );

  assertMatchesAll(
    assert,
    snapshotCommitOwner,
    [
      /kernel_snapshot_store_commits_shared\.js/,
      /kernel_snapshot_store_commits_ops\.js/,
      /export function createKernelSnapshotStoreCommitOps\(/,
    ],
    'kernelSnapshotStoreCommitOwner'
  );
  assertLacksAll(
    assert,
    snapshotCommitOwner,
    [/requestKernelBuilderBuild\(/, /scheduleAutosaveViaService\(/, /const commitFromSnapshot = \(/],
    'kernelSnapshotStoreCommitOwner'
  );

  assertMatchesAll(
    assert,
    `${snapshotCommitShared}\n${snapshotCommitOps}`,
    [
      /export function requestKernelSnapshotBuild\(/,
      /requestKernelBuilderBuild\(App, meta, \{/,
      /export function scheduleKernelSnapshotAutosave\(/,
      /scheduleAutosaveViaService\(args\.App\)/,
      /const commitFromSnapshot = \(uiSnapshot: unknown, meta\?: KernelSnapshotStoreMetaLike\): void => \{/,
    ],
    'kernelSnapshotStoreCommitRuntime'
  );

  assertMatchesAll(
    assert,
    kernelConfigPatchOwner,
    [
      /kernel_state_kernel_config_maps_patch_ops\.js/,
      /export function installKernelStateKernelConfigPatchSurface\(/,
      /installKernelStateKernelConfigPatchSurfaceRuntime\(helpers, tools\);/,
    ],
    'kernelStateKernelConfigPatchOwner'
  );
  assertLacksAll(
    assert,
    kernelConfigPatchOwner,
    [/__sk\.patchConfigMaps = function/, /requestKernelBuilderBuild\(/, /scheduleAutosaveViaService\(/],
    'kernelStateKernelConfigPatchOwner'
  );

  assertMatchesAll(
    assert,
    `${kernelConfigPatchShared}\n${kernelConfigPatchOps}`,
    [
      /export function mergeKernelStateKernelConfigBatchMeta\(/,
      /export function requestKernelStateKernelConfigBuild\(/,
      /__sk\.patchConfigMaps = function \(nextMapsIn: unknown, metaIn: unknown\)/,
      /requestKernelStateKernelConfigBuild\(App, meta, source, force\);/,
      /scheduleKernelStateKernelConfigAutosave\(App, meta\);/,
    ],
    'kernelStateKernelConfigPatchRuntime'
  );
});
