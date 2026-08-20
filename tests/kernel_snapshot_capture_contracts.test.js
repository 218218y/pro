import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll } from './_source_bundle.js';
import { getFunctionSignatureFact, getInterfaceFact } from './_semantic_source_contracts.js';

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
      /hasCanonicalEssentialUiRawDimsFromSnapshot\(/,
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

  const buildStateFact = getInterfaceFact(
    snapshotStore,
    'KernelBuildStateLike',
    'kernel_snapshot_store_contracts.ts'
  );
  assert.deepEqual(buildStateFact?.extends, ['UnknownRecord']);
  assert.deepEqual(
    buildStateFact?.properties.map(prop => prop.name),
    ['ui', 'config', 'mode', 'runtime', 'build']
  );

  assert.deepEqual(
    getInterfaceFact(snapshotStore, 'KernelSnapshotStoreMetaLike', 'kernel_snapshot_store_contracts.ts'),
    { name: 'KernelSnapshotStoreMetaLike', extends: ['ActionMetaLike'], properties: [] }
  );
  const syncOpts = getInterfaceFact(
    snapshotStore,
    'KernelSnapshotStoreSyncOpts',
    'kernel_snapshot_store_contracts.ts'
  );
  assert.deepEqual(syncOpts?.extends, ['KernelSnapshotStoreMetaLike']);
  assert.deepEqual(syncOpts?.properties, [
    { name: 'override', optional: true, readonly: false, type: 'UnknownRecord|null' },
  ]);

  const createArgs = getInterfaceFact(
    snapshotStore,
    'CreateKernelSnapshotStoreSystemArgs',
    'kernel_snapshot_store_contracts.ts'
  );
  assert.equal(
    createArgs?.properties.find(prop => prop.name === 'stateKernel')?.type,
    'StateKernelLike&UnknownRecord'
  );

  const storeSystem = getInterfaceFact(
    snapshotStore,
    'KernelSnapshotStoreSystem',
    'kernel_snapshot_store_contracts.ts'
  );
  const storeProps = new Map(storeSystem?.properties.map(prop => [prop.name, prop]));
  assert.equal(storeProps.get('getBuildState')?.type, 'fn(override?:unknown)->KernelBuildStateLike');
  assert.equal(storeProps.get('syncStore')?.type, 'fn(opts?:KernelSnapshotStoreSyncOpts|null)->void');
  assert.equal(
    storeProps.get('commitFromSnapshot')?.type,
    'fn(uiSnapshot:unknown,meta?:KernelSnapshotStoreMetaLike)->void'
  );
  assert.equal(
    storeProps.get('setDirty')?.type,
    'fn(isDirtyValue:boolean,meta?:KernelSnapshotStoreMetaLike)->void'
  );
  assert.equal(storeProps.get('touch')?.type, 'fn(meta?:KernelSnapshotStoreMetaLike)->void');
  assert.equal(storeProps.get('commit')?.type, 'fn(meta?:KernelSnapshotStoreMetaLike)->void');
  assert.equal(storeProps.get('persist')?.type, 'fn(meta?:KernelSnapshotStoreMetaLike)->void');
  assert.deepEqual(
    getFunctionSignatureFact(
      snapshotStore,
      'createKernelSnapshotStoreSystem',
      'kernel_snapshot_store_system.ts'
    ),
    {
      name: 'createKernelSnapshotStoreSystem',
      async: false,
      params: [{ name: 'args', optional: false, type: 'CreateKernelSnapshotStoreSystemArgs' }],
      returnType: 'KernelSnapshotStoreSystem',
    }
  );
  assert.match(snapshotStore, /kernel_snapshot_store_build_state\.js/);
  assert.match(snapshotStore, /kernel_snapshot_store_commits\.js/);

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
  assert.match(
    snapshotBundle,
    /UI_RAW_SCALAR_KEYS/,
    'snapshot/store should materialize structural uiOverride scalar patches through typed ui.raw keys'
  );
  assert.match(
    snapshotBundle,
    /hasCanonicalEssentialUiRawDimsFromSnapshot/,
    'snapshot/store build state should assert canonical ui.raw dimensions'
  );
  assert.match(
    snapshotBundle,
    /readCanonicalUiRawIntFromSnapshot/,
    'snapshot/store build state should read build-driving numeric fields through canonical ui.raw readers'
  );
  assert.doesNotMatch(
    snapshotBundle,
    /hasEssentialUiDimsFromSnapshot|readUiRawIntFromSnapshot/,
    'snapshot/store build state should not use tolerant direct ui.* readers'
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
      /!resetAllEditModesViaService\(args\.App\)/,
      /const result = setModePrimary\(args\.App, primary, opts, \{ source: 'applyEditState' \}\);/,
    ],
    'kernel edit-state seam'
  );
});
