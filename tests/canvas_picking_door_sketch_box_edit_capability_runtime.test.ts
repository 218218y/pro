import test from 'node:test';
import assert from 'node:assert/strict';

import {
  patchSketchBoxDoorWithCapabilities,
  readSketchBoxDoorRecordWithCapabilities,
  resolveSketchBoxDoorPatchTargets,
  type SketchBoxDoorEditCapabilities,
  type SketchBoxDoorPatchRequest,
  type SketchBoxDoorRecord,
  type SketchBoxDoorStateSnapshot,
  type SketchBoxDoorTarget,
} from '../esm/native/services/canvas_picking_door_sketch_box_edit.ts';
import {
  captureSketchBoxDoorTargetSnapshot,
  createSketchBoxDoorEditCapabilities,
} from '../esm/native/services/canvas_picking_door_sketch_box_edit_runtime.ts';

type FixtureModule = {
  lookupIndex: number;
  patchModuleKey: string;
  identities: string[];
  boxId: string;
  doorId: string;
  record: SketchBoxDoorRecord;
};

const FIXTURE = {
  top: [
    {
      lookupIndex: 0,
      patchModuleKey: '0',
      identities: ['top-alpha', 'alpha'],
      boxId: 'sbf_shared',
      doorId: 'door_1',
      record: { id: 'door_1', groove: false },
    },
    {
      lookupIndex: 1,
      patchModuleKey: '1',
      identities: ['top-beta', 'beta'],
      boxId: 'sbf_beta',
      doorId: 'door_1',
      record: { id: 'door_1', groove: true },
    },
  ],
  bottom: [
    {
      lookupIndex: 0,
      patchModuleKey: '0',
      identities: ['bottom-alpha', 'alpha'],
      boxId: 'sbf_shared',
      doorId: 'door_1',
      record: { id: 'door_1', groove: true },
    },
  ],
} satisfies Record<'top' | 'bottom', FixtureModule[]>;

function targetSnapshot(target: SketchBoxDoorTarget): SketchBoxDoorStateSnapshot {
  const mapModule = (module: FixtureModule) => ({
    lookupIndex: module.lookupIndex,
    patchModuleKey: module.patchModuleKey,
    identities: module.identities,
    hasTargetBox: module.boxId === target.boxId,
    targetDoor:
      module.boxId === target.boxId && (!target.doorId || module.doorId === target.doorId)
        ? module.record
        : null,
  });
  return {
    top: FIXTURE.top.map(mapModule),
    bottom: FIXTURE.bottom.map(mapModule),
  };
}

function capabilities(
  commitDoorPatch: SketchBoxDoorEditCapabilities['commitDoorPatch'] = () => ({
    committed: true,
    changed: false,
  })
): SketchBoxDoorEditCapabilities {
  return { readTargetSnapshot: targetSnapshot, commitDoorPatch };
}

test('sketch-box door edit core reads preferred stack and exact module identities without AppContainer', () => {
  const bottomDoor = readSketchBoxDoorRecordWithCapabilities(
    capabilities(),
    { moduleKey: 'alpha', boxId: 'sbf_shared', doorId: 'door_1' },
    'bottom'
  );
  assert.equal(bottomDoor?.groove, true);

  const betaDoor = readSketchBoxDoorRecordWithCapabilities(
    capabilities(),
    { moduleKey: '1', boxId: 'sbf_beta', doorId: 'door_1' },
    'top'
  );
  assert.equal(betaDoor?.groove, true);
});

test('sketch-box door edit core preserves the established full-stack fallback after a missing module identity', () => {
  const found = readSketchBoxDoorRecordWithCapabilities(
    capabilities(),
    { moduleKey: 'missing-module', boxId: 'sbf_beta', doorId: 'door_1' },
    'top'
  );
  assert.equal(found?.groove, true);
});

test('sketch-box door edit core resolves box-owned patch targets in preferred stack order', () => {
  const target = { moduleKey: null, boxId: 'sbf_shared', doorId: null };
  assert.deepEqual(resolveSketchBoxDoorPatchTargets(targetSnapshot(target), target, 'bottom'), [
    { stack: 'bottom', moduleKey: '0' },
    { stack: 'top', moduleKey: '0' },
  ]);
  assert.deepEqual(
    resolveSketchBoxDoorPatchTargets(null, { moduleKey: 'alpha', boxId: 'sbf_shared', doorId: null }, 'top'),
    [
      { stack: 'top', moduleKey: 'alpha' },
      { stack: 'bottom', moduleKey: 'alpha' },
    ]
  );
});

test('sketch-box door edit core retries committed no-op candidates and stops at the first changed patch', () => {
  const requests: SketchBoxDoorPatchRequest[] = [];
  const result = patchSketchBoxDoorWithCapabilities(
    capabilities(request => {
      requests.push(request);
      return request.stack === 'bottom'
        ? { committed: true, changed: false }
        : { committed: true, changed: true };
    }),
    { moduleKey: null, boxId: 'sbf_shared', doorId: 'door_1' },
    'bottom',
    current => current,
    { source: 'test:sketch-box-door' }
  );

  assert.equal(result, true);
  assert.deepEqual(
    requests.map(request => ({
      stack: request.stack,
      moduleKey: request.moduleKey,
      boxId: request.boxId,
      doorId: request.doorId,
      source: request.source,
    })),
    [
      {
        stack: 'bottom',
        moduleKey: '0',
        boxId: 'sbf_shared',
        doorId: 'door_1',
        source: 'test:sketch-box-door',
      },
      {
        stack: 'top',
        moduleKey: '0',
        boxId: 'sbf_shared',
        doorId: 'door_1',
        source: 'test:sketch-box-door',
      },
    ]
  );
});

test('sketch-box door edit core avoids root-state reads when the target already carries module identity', () => {
  let reads = 0;
  const caps: SketchBoxDoorEditCapabilities = {
    readTargetSnapshot: target => {
      reads += 1;
      return targetSnapshot(target);
    },
    commitDoorPatch: request => ({ committed: true, changed: request.stack === 'top' }),
  };
  assert.equal(
    patchSketchBoxDoorWithCapabilities(
      caps,
      { moduleKey: 'alpha', boxId: 'sbf_shared', doorId: 'door_1' },
      'top',
      current => current
    ),
    true
  );
  assert.equal(reads, 0);
});

test('sketch-box door edit core fails closed when a structural capability rejects a candidate', () => {
  let calls = 0;
  const result = patchSketchBoxDoorWithCapabilities(
    capabilities(() => {
      calls += 1;
      return { committed: false, changed: false };
    }),
    { moduleKey: null, boxId: 'sbf_shared', doorId: null },
    'bottom',
    () => ({ enabled: false })
  );
  assert.equal(result, false);
  assert.equal(calls, 1);
});

test('sketch-box door runtime snapshot keeps lookup indexing separate from structural patch keys', () => {
  const state = {
    modulesConfiguration: [
      null,
      {
        id: 'module-a',
        sketchExtras: { boxes: [{ id: 'sbf_a', doors: [{ id: 'door_a', groove: true }] }] },
      },
    ],
    stackSplitLowerModulesConfiguration: [],
  };
  const App = { store: { getState: () => state } } as any;
  const captured = captureSketchBoxDoorTargetSnapshot(App, {
    moduleKey: null,
    boxId: 'sbf_a',
    doorId: 'door_a',
  });
  assert.deepEqual(
    captured.top.map(module => ({
      lookupIndex: module.lookupIndex,
      patchModuleKey: module.patchModuleKey,
      identities: module.identities,
      hasTargetBox: module.hasTargetBox,
      targetDoorId: module.targetDoor?.id,
    })),
    [
      {
        lookupIndex: 0,
        patchModuleKey: '1',
        identities: ['module-a'],
        hasTargetBox: true,
        targetDoorId: 'door_a',
      },
    ]
  );
  assert.equal(Object.isFrozen(captured), true);
  assert.equal(Object.isFrozen(captured.top), true);
  assert.equal(Object.isFrozen(captured.top[0]), true);
  assert.equal(createSketchBoxDoorEditCapabilities(App), createSketchBoxDoorEditCapabilities(App));
});
