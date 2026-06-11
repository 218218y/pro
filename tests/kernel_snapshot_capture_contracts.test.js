import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll } from './_source_bundle.js';

const kernel = readSource('../esm/native/kernel/kernel.ts', import.meta.url);
const capture = readSource('../esm/native/kernel/kernel_project_capture.ts', import.meta.url);
const captureBundle = bundleSources(
  [
    '../esm/native/kernel/kernel.ts',
    '../esm/native/kernel/kernel_project_capture.ts',
    '../esm/native/kernel/kernel_project_capture_shared.ts',
    '../esm/native/kernel/kernel_project_capture_config_lists.ts',
    '../esm/native/kernel/kernel_project_capture_payload.ts',
  ],
  import.meta.url
);
const snapshotStore = bundleSources(
  [
    '../esm/native/kernel/kernel_snapshot_store_system.ts',
    '../esm/native/kernel/kernel_snapshot_store_contracts.ts',
  ],
  import.meta.url
);
const snapshotBundle = bundleSources(
  [
    '../esm/native/kernel/kernel.ts',
    '../esm/native/kernel/kernel_snapshot_store_system.ts',
    '../esm/native/kernel/kernel_snapshot_store_shared.ts',
    '../esm/native/kernel/kernel_snapshot_store_build_state.ts',
    '../esm/native/kernel/kernel_snapshot_store_commits.ts',
    '../esm/native/kernel/kernel_snapshot_store_commits_shared.ts',
    '../esm/native/kernel/kernel_snapshot_store_commits_ops.ts',
  ],
  import.meta.url
);
const editState = readSource('../esm/native/kernel/kernel_edit_state_system.ts', import.meta.url);

test('[kernel-project-capture] kernel delegates project serialization to focused capture seam', () => {
  assertMatchesAll(
    assert,
    kernel,
    [
      /from '\.\/kernel_project_capture\.js';/,
      /projectCapture\.capture = createKernelProjectCapture\(\{/,
      /captureSavedNotes: \(\) => captureSavedNotesViaService\(App\)/,
      /getUiSnapshot: \(\) => asRecord\(getUi\(App\), \{\}\)/,
    ],
    'kernel owner'
  );

  assertMatchesAll(
    assert,
    capture,
    [
      /export function createKernelProjectCapture\(/,
      /stateKernel: StateKernelLike \| null \| undefined;/,
      /hasEssentialUiDimsFromSnapshot\(/,
      /from '\.\/kernel_project_capture_payload\.js';/,
      /buildKernelProjectCaptureData\(\{/,
      /savedNotes: args\.captureSavedNotes\(\),/,
    ],
    'kernel project capture seam'
  );

  assert.ok(
    captureBundle.includes('stackSplitLowerDepthManual'),
    'project capture should persist lower split depth'
  );
  assert.ok(captureBundle.includes('showDimensions'), 'project capture should persist showDimensions');
  assert.ok(
    captureBundle.includes('stackSplitLowerModulesConfiguration'),
    'project capture should persist lower modules config'
  );
  assert.ok(
    captureBundle.includes('cloneModulesConfigurationSnapshot') ||
      captureBundle.includes('canonicalConfigLists.modulesConfiguration'),
    'project capture should canonicalize module lists'
  );
});

test('[kernel-snapshot-store] snapshot/store seam stays typed and publicly compatible with stateKernel methods', () => {
  assertMatchesAll(
    assert,
    kernel,
    [
      /import \{ createKernelSnapshotStoreSystem \} from '\.\/kernel_snapshot_store_system\.js';/,
      /const snapshotStore = createKernelSnapshotStoreSystem\(\{/,
      /__sk\.getBuildState = snapshotStore\.getBuildState;/,
      /__sk\.commitFromSnapshot = snapshotStore\.commitFromSnapshot;/,
      /__sk\.syncStore = snapshotStore\.syncStore;/,
      /__sk\.setDirty = snapshotStore\.setDirty;/,
      /__sk\.touch = snapshotStore\.touch;/,
      /__sk\.commit = snapshotStore\.commit;/,
      /__sk\.persist = snapshotStore\.persist;/,
    ],
    'kernel owner'
  );

  assertMatchesAll(
    assert,
    snapshotStore,
    [
      /export interface KernelBuildStateLike extends UnknownRecord/,
      /export interface KernelSnapshotStoreMetaLike extends UnknownRecord/,
      /export interface KernelSnapshotStoreSyncOpts extends KernelSnapshotStoreMetaLike/,
      /export interface KernelSnapshotStoreSystem/,
      /export function createKernelSnapshotStoreSystem\(/,
      /kernel_snapshot_store_build_state\.js/,
      /kernel_snapshot_store_commits\.js/,
      /stateKernel: StateKernelLike & UnknownRecord;/,
      /getBuildState: \(override\?: unknown\) => KernelBuildStateLike;/,
      /syncStore: \(opts\?: KernelSnapshotStoreSyncOpts \| null\) => void;/,
      /commitFromSnapshot: \(uiSnapshot: unknown, meta\?: KernelSnapshotStoreMetaLike\) => void;/,
      /setDirty: \(isDirtyValue: boolean, meta\?: KernelSnapshotStoreMetaLike\) => void;/,
      /touch: \(meta\?: KernelSnapshotStoreMetaLike\) => void;/,
      /commit: \(meta\?: KernelSnapshotStoreMetaLike\) => void;/,
      /persist: \(meta\?: KernelSnapshotStoreMetaLike\) => void;/,
    ],
    'snapshot store seam'
  );

  assert.ok(
    snapshotBundle.includes(
      'requestKernelSnapshotBuild(args.App, o, source, shouldForceBuild, wroteSnapshot);'
    ),
    'snapshot/store should keep canonical kernel build scheduling'
  );
  assert.ok(
    snapshotBundle.includes('scheduleAutosaveViaService(args.App)'),
    'snapshot/store should keep autosave'
  );
  assert.match(
    snapshotBundle,
    /materializeTopModulesConfigurationFromUiConfig\(\s*cfg\.modulesConfiguration,\s*ui,\s*cfg\s*\)/,
    'snapshot/store should keep canonical top-module materialization from UI/config snapshots'
  );
});

test('[kernel-edit-state] kernel delegates edit-state capture/apply to dedicated seam', () => {
  assertMatchesAll(
    assert,
    kernel,
    [
      /from '\.\/kernel_edit_state_system\.js';/,
      /const editStateSystem = createKernelEditStateSystem\(\{/,
      /__sk\.captureEditState = editStateSystem\.captureEditState;/,
      /__sk\.applyEditState = editStateSystem\.applyEditState;/,
    ],
    'kernel owner'
  );
  assertMatchesAll(
    assert,
    editState,
    [
      /export interface KernelEditStateSystem \{/,
      /const captureEditState = \(\): KernelEditStateSnapshot => \{/,
      /const applyEditState = \(edit: unknown\): void => \{/,
      /resetAllEditModesViaService\(args\.App\);/,
      /setModePrimary\(args\.App, primary, opts, \{ source: 'applyEditState' \}\);/,
    ],
    'kernel edit-state seam'
  );
});
