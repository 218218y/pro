import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleSources, readSource } from './_source_bundle.js';

const bootMain = readSource('../esm/native/ui/boot_main.ts', import.meta.url);
const bootController = bundleSources(
  [
    '../esm/native/ui/ui_boot_controller_runtime.ts',
    '../esm/native/ui/ui_boot_controller_store.ts',
    '../esm/native/ui/ui_boot_controller_viewport.ts',
  ],
  import.meta.url
);

function indexOfOrThrow(source, needle) {
  const idx = source.indexOf(needle);
  assert.notEqual(idx, -1, `missing snippet: ${needle}`);
  return idx;
}

test('[regression] controller installs store reactivity before seed commit and seeds from full store.ui snapshot while boot_main stays orchestration-only', () => {
  const installIdx = indexOfOrThrow(
    bootController,
    "installStoreReactivityOrThrow(App, 'UI boot store reactivity')"
  );
  const commitIdx = indexOfOrThrow(
    bootController,
    "commitBootSeedUiSnapshotOrThrow(App, seedUi, 'init:seed', 'UI boot seed snapshot')"
  );
  const getUiIdx = indexOfOrThrow(bootController, 'seedUi = readRecord(getUi(App)) || {};');
  const essentialIdx = indexOfOrThrow(bootController, 'hasEssentialUiDimsFromSnapshot(seedUi)');

  assert.ok(installIdx < commitIdx, 'store reactivity must install before the boot seed commit');
  assert.ok(
    getUiIdx < essentialIdx,
    'boot seed must validate the full store.ui snapshot, not a minimal flag bag'
  );
  assert.equal(
    bootController.match(
      /commitBootSeedUiSnapshotOrThrow\(App, seedUi, 'init:seed', 'UI boot seed snapshot'\)/g
    )?.length ?? 0,
    1,
    'boot seed should commit once'
  );
  assert.match(bootMain, /installUiBootStoreSeedAndHistory\(App, reporter\)/);
  assert.doesNotMatch(bootMain, /commitBootSeedUiSnapshotOrThrow\(App, seedUi/);
  assert.match(
    bootController,
    /roomDesign && typeof roomDesign\.buildRoom === 'function'\) roomDesign\.buildRoom\(\)/
  );
  assert.doesNotMatch(bootController, /roomDesign\.setActive\(!sketchMode/);
});
