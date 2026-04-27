import test from 'node:test';
import assert from 'node:assert/strict';

import { captureConfigSnapshotMaybe, getBuildStateMaybe } from '../esm/native/builder/store_access.ts';

type AnyRecord = Record<string, any>;

function createApp(root: AnyRecord, actions?: AnyRecord): AnyRecord {
  return {
    actions: actions || {},
    store: {
      getState: () => root,
    },
  };
}

test('builder/store_access canonicalizes builder-action build states before returning them to scheduler-style callers', () => {
  const sourceLower = [{ extDrawersCount: '3' }, null];
  const sourceCorner = {
    modulesConfiguration: [{ doors: '9', layout: 'drawers' }],
    stackSplitLower: { modulesConfiguration: [{ extDrawersCount: '4' }, null] },
  };

  const App = createApp(
    {
      ui: {
        doors: 5,
        singleDoorPos: 'right',
        structureSelect: '',
        raw: { doors: 5, singleDoorPos: 'right' },
      },
      config: {},
      runtime: {},
      mode: { primary: 'none', opts: {} },
      meta: {},
    },
    {
      builder: {
        getBuildState() {
          return {
            ui: {
              doors: 5,
              singleDoorPos: 'right',
              structureSelect: '',
              raw: { doors: 5, singleDoorPos: 'right' },
            },
            config: {
              wardrobeType: 'hinged',
              modulesConfiguration: [{ doors: '9', layout: 'drawers' }, null],
              stackSplitLowerModulesConfiguration: sourceLower,
              cornerConfiguration: sourceCorner,
            },
            runtime: {},
            mode: { primary: 'none', opts: {} },
          };
        },
      },
    }
  );

  const state = getBuildStateMaybe(App as any);
  assert.ok(state);
  assert.deepEqual(
    state!.config.modulesConfiguration.map((entry: AnyRecord) => entry.doors),
    [2, 2, 1]
  );
  assert.equal(state!.config.stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
  assert.equal(state!.config.stackSplitLowerModulesConfiguration[1].extDrawersCount, 0);
  assert.equal(
    (state!.config.cornerConfiguration as AnyRecord).stackSplitLower.modulesConfiguration[1].extDrawersCount,
    0
  );

  (sourceLower[0] as AnyRecord).extDrawersCount = 99;
  (sourceCorner.modulesConfiguration[0] as AnyRecord).doors = 44;
  assert.equal(state!.config.stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
  assert.equal((state!.config.cornerConfiguration as AnyRecord).modulesConfiguration[0].doors, '9');
});

test('builder/store_access captureConfigSnapshotMaybe canonicalizes raw store-config fallback snapshots', () => {
  const sourceCorner = {
    modulesConfiguration: [{ doors: '7', layout: 'drawers' }],
    stackSplitLower: { modulesConfiguration: [{ extDrawersCount: '5' }, null] },
  };
  const App = createApp({
    ui: { doors: 5, singleDoorPos: 'right', structureSelect: '', raw: { doors: 5, singleDoorPos: 'right' } },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [{ doors: '9', layout: 'drawers' }, null],
      stackSplitLowerModulesConfiguration: [{ extDrawersCount: '3' }, null],
      cornerConfiguration: sourceCorner,
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });

  const cfg = captureConfigSnapshotMaybe(App as any);
  assert.ok(cfg);
  assert.deepEqual(
    cfg!.modulesConfiguration.map((entry: AnyRecord) => entry.doors),
    [2, 2, 1]
  );
  assert.equal(cfg!.stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
  assert.equal(cfg!.stackSplitLowerModulesConfiguration[1].extDrawersCount, 0);
  assert.equal(
    (cfg!.cornerConfiguration as AnyRecord).stackSplitLower.modulesConfiguration[1].extDrawersCount,
    0
  );

  (sourceCorner.modulesConfiguration[0] as AnyRecord).doors = 88;
  assert.equal((cfg!.cornerConfiguration as AnyRecord).modulesConfiguration[0].doors, '7');
});
