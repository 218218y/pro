import test from 'node:test';
import assert from 'node:assert/strict';

import { readKernelSnapshotBuildState } from '../esm/native/kernel/kernel_snapshot_store_build_state.ts';

type AnyRecord = Record<string, any>;

function asRecord(value: unknown, seed: AnyRecord = {}): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...seed, ...(value as AnyRecord) }
    : { ...seed };
}

function asRecordOrNull(value: unknown): AnyRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as AnyRecord) : null;
}

test('kernel snapshot build-state canonicalizes structural override config slices against the merged UI snapshot', () => {
  const sourceLower = [{ extDrawersCount: '3' }, null];
  const sourceCorner = {
    modulesConfiguration: [{ doors: '9', layout: 'drawers' }],
    stackSplitLower: { modulesConfiguration: [{ extDrawersCount: '4' }, null] },
  };

  const App: AnyRecord = {
    store: {
      patch: () => undefined,
      getState: () => ({
        ui: {
          width: 240,
          height: 220,
          depth: 60,
          doors: 5,
          raw: { width: 240, height: 220, depth: 60, doors: 5, singleDoorPos: 'right' },
          singleDoorPos: 'right',
          structureSelect: '',
        },
        config: {
          wardrobeType: 'hinged',
          modulesConfiguration: [{ doors: '9', layout: 'drawers' }, null],
          stackSplitLowerModulesConfiguration: [{ extDrawersCount: '2' }],
          cornerConfiguration: { modulesConfiguration: [] },
        },
        runtime: {},
        mode: { primary: 'none', opts: {} },
        meta: { dirty: false },
      }),
    },
  };

  const state = readKernelSnapshotBuildState(
    {
      App: App as any,
      asRecord,
      asRecordOrNull,
      isRecord: value => !!(value && typeof value === 'object' && !Array.isArray(value)),
      reportNonFatal: () => undefined,
      captureConfig: () => ({
        wardrobeType: 'hinged',
        modulesConfiguration: [{ doors: '9', layout: 'drawers' }, null],
      }),
    },
    {
      ui: {
        width: 240,
        height: 220,
        depth: 60,
        doors: 5,
        raw: { width: 240, height: 220, depth: 60, doors: 5, singleDoorPos: 'right' },
        singleDoorPos: 'right',
        structureSelect: '',
      },
      config: {
        stackSplitLowerModulesConfiguration: sourceLower,
        cornerConfiguration: sourceCorner,
      },
    }
  );

  assert.deepEqual(
    state.config.modulesConfiguration.map((entry: AnyRecord) => entry.doors),
    [2, 2, 1]
  );
  assert.equal(state.config.stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
  assert.equal(state.config.stackSplitLowerModulesConfiguration[1].extDrawersCount, 0);
  assert.equal((state.config.cornerConfiguration as AnyRecord).modulesConfiguration[0].doors, '9');
  assert.equal(
    (state.config.cornerConfiguration as AnyRecord).stackSplitLower.modulesConfiguration[1].extDrawersCount,
    0
  );

  (sourceLower[0] as AnyRecord).extDrawersCount = 99;
  (sourceCorner.modulesConfiguration[0] as AnyRecord).doors = 44;

  assert.equal(state.config.stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
  assert.equal((state.config.cornerConfiguration as AnyRecord).modulesConfiguration[0].doors, '9');
});

test('kernel snapshot build-state returns a detached ui snapshot even when store.ui is already a snapshot', () => {
  const storeUi = {
    width: 240,
    height: 220,
    depth: 60,
    doors: 5,
    raw: {
      width: 240,
      nested: { marker: 'keep' },
    },
    view: {
      overlays: [{ id: 'overlay-a' }],
    },
    __snapshot: true,
    __capturedAt: 777,
    els: { canvas: { id: 'dom-node' } },
  };

  const App: AnyRecord = {
    store: {
      patch: () => undefined,
      getState: () => ({
        ui: storeUi,
        config: { wardrobeType: 'hinged', modulesConfiguration: [] },
        runtime: {},
        mode: { primary: 'none', opts: {} },
        meta: { dirty: false },
      }),
    },
  };

  const state = readKernelSnapshotBuildState({
    App: App as any,
    asRecord,
    asRecordOrNull,
    isRecord: value => !!(value && typeof value === 'object' && !Array.isArray(value)),
    reportNonFatal: () => undefined,
    captureConfig: () => ({ wardrobeType: 'hinged', modulesConfiguration: [] }),
  });

  assert.notEqual(state.ui, storeUi);
  assert.notEqual(state.ui.raw as AnyRecord, storeUi.raw);
  assert.notEqual(state.ui.view as AnyRecord, storeUi.view);
  assert.equal((state.ui as AnyRecord).__capturedAt, 777);
  assert.equal('els' in (state.ui as AnyRecord), false);

  ((state.ui.raw as AnyRecord).nested as AnyRecord).marker = 'changed';
  (((state.ui.view as AnyRecord).overlays as AnyRecord[])[0] as AnyRecord).id = 'overlay-b';

  assert.equal(((storeUi.raw as AnyRecord).nested as AnyRecord).marker, 'keep');
  assert.equal((((storeUi.view as AnyRecord).overlays as AnyRecord[])[0] as AnyRecord).id, 'overlay-a');
});
