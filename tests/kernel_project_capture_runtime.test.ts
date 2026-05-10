import test from 'node:test';
import assert from 'node:assert/strict';

import { createKernelProjectCapture } from '../esm/native/kernel/kernel_project_capture.ts';
import { cloneProjectCaptureValue } from '../esm/native/kernel/kernel_project_capture_shared.ts';

test('kernel project capture canonicalizes config lists and detaches mutable snapshot slices', () => {
  const savedNotesSource = [{ id: 'n1', blocks: [{ text: 'first' }] }];
  const cyclicMirrorLayout: Record<string, unknown> = { widthCm: 33 };
  cyclicMirrorLayout.self = cyclicMirrorLayout;
  const cfgSource: Record<string, unknown> = {
    wardrobeType: 'hinged',
    modulesConfiguration: [{ layout: 'drawers', doors: '2' }, null, { customData: { storage: true } }],
    stackSplitLowerModulesConfiguration: [{ extDrawersCount: '3' }],
    cornerConfiguration: { modulesConfiguration: [{ doors: '5' }] },
    groovesMap: { g1: true, drop: 1n },
    splitDoorsBottomMap: { d1: 1, drop: 0 },
    mirrorLayoutMap: { d1: [{ widthCm: '55', heightCm: 88 }, { widthCm: 0 }], d2: [cyclicMirrorLayout] },
    doorTrimMap: { d1: [{ axis: 'vertical', color: 'gold', span: 'custom', sizeCm: '11' }, { bad: true }] },
    preChestState: { dims: { width: 55 }, createdAt: new Date('2024-01-02T03:04:05.000Z') },
    savedColors: ['oak', { id: 'c2', value: '#abc' }, { id: '' }, 1n],
  };

  const capture = createKernelProjectCapture({
    App: { store: { getState: () => ({ config: cfgSource }) } } as never,
    stateKernel: {
      captureConfig: () => cfgSource,
    } as never,
    getUiSnapshot: () => ({
      width: 240,
      height: 260,
      depth: 60,
      doors: 5,
      structureSelect: '[2,2,1]',
      singleDoorPos: 'left',
      raw: {
        width: 240,
        height: 260,
        depth: 60,
        doors: 5,
        structureSelect: '[2,2,1]',
        singleDoorPos: 'left',
      },
    }),
    captureSavedNotes: () => savedNotesSource,
    reportKernelError: () => false,
  });

  const snapshot = capture('persist') as Record<string, any>;

  assert.equal(snapshot.modulesConfiguration.length, 3);
  assert.equal(snapshot.modulesConfiguration[0].layout, 'drawers');
  assert.equal(snapshot.modulesConfiguration[1].doors, 2);
  assert.equal(snapshot.modulesConfiguration[2].doors, 1);
  assert.equal(snapshot.modulesConfiguration[2].customData.storage, true);

  assert.ok(Array.isArray(snapshot.stackSplitLowerModulesConfiguration));
  assert.equal(snapshot.stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
  assert.equal(snapshot.cornerConfiguration.layout, 'shelves');
  assert.ok(Array.isArray(snapshot.cornerConfiguration.modulesConfiguration));

  cfgSource.modulesConfiguration = [{ layout: 'mutated', doors: 99 }];
  cfgSource.stackSplitLowerModulesConfiguration = [{ extDrawersCount: 9 }];
  (cfgSource.groovesMap as Record<string, unknown>).g1 = false;
  ((savedNotesSource[0].blocks as Record<string, unknown>[])[0] as Record<string, unknown>).text = 'mutated';
  ((cfgSource.preChestState as Record<string, unknown>).dims as Record<string, unknown>).width = 99;

  assert.equal(snapshot.modulesConfiguration[0].layout, 'drawers');
  assert.equal(snapshot.stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
  assert.deepEqual({ ...snapshot.groovesMap }, { g1: true });
  assert.deepEqual({ ...snapshot.splitDoorsBottomMap }, { splitb_d1: true, drop: false });
  assert.deepEqual(
    { ...snapshot.mirrorLayoutMap },
    { d1: [{ widthCm: 55, heightCm: 88 }], d2: [{ widthCm: 33 }] }
  );
  assert.equal(Array.isArray(snapshot.doorTrimMap.d1), true);
  assert.equal(snapshot.doorTrimMap.d1.length, 2);
  assert.equal(snapshot.doorTrimMap.d1[0].axis, 'vertical');
  assert.equal(snapshot.doorTrimMap.d1[0].color, 'gold');
  assert.equal(snapshot.doorTrimMap.d1[0].span, 'custom');
  assert.equal(snapshot.doorTrimMap.d1[0].sizeCm, 11);
  assert.deepEqual(snapshot.savedColors, ['oak', { id: 'c2', value: '#abc' }]);
  assert.equal(
    ((snapshot.savedNotes[0].blocks as Record<string, unknown>[])[0] as Record<string, unknown>).text,
    'first'
  );
  assert.equal(
    ((snapshot.preChestState as Record<string, unknown>).dims as Record<string, unknown>).width,
    55
  );
});

test('kernel project capture cloning preserves valid branches when legacy leaves are not JSON-stringifiable', () => {
  const cyclic: Record<string, unknown> = { widthCm: 21 };
  cyclic.self = cyclic;
  const cloned = cloneProjectCaptureValue(
    {
      ok: { nested: true },
      badBigInt: 1n,
      cyclic,
      when: new Date('2024-01-02T03:04:05.000Z'),
      list: ['keep', 2n, cyclic],
    },
    null
  ) as Record<string, unknown> | null;

  assert.deepEqual(cloned, {
    ok: { nested: true },
    cyclic: { widthCm: 21 },
    when: '2024-01-02T03:04:05.000Z',
    list: ['keep', null, { widthCm: 21 }],
  });
});
