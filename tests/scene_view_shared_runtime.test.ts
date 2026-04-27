import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCornerLighting,
  getStoreSyncState,
  readSceneViewSyncSnapshotFromState,
} from '../esm/native/services/scene_view_shared.ts';

test('scene view shared snapshot defaults corner side and derives stable sync keys', () => {
  const snapshot = readSceneViewSyncSnapshotFromState({
    ui: {
      lightingControl: true,
      lightAmb: 0.8,
      lightDir: 1.7,
      lightX: 7,
      lightY: 9,
      lightZ: 10,
      raw: { cornerMode: true },
    },
    runtime: { sketchMode: true },
  });

  assert.deepEqual(snapshot, {
    sketchMode: true,
    lightingControl: true,
    lightAmb: '0.8',
    lightDir: '1.7',
    lightX: '7',
    lightY: '9',
    lightZ: '10',
    cornerKey: 'corner:right',
  });

  assert.deepEqual(getCornerLighting({ raw: { isCornerMode: true, cornerDirection: 'left' } } as any), {
    cornerMode: true,
    cornerSide: 'left',
  });
});

test('scene view store sync state reuses app-scoped state through service slot', () => {
  const App: Record<string, unknown> = {
    services: {
      sceneView: {},
    },
  };

  const first = getStoreSyncState(App as any);
  first.queuedReason = 'first';
  const second = getStoreSyncState(App as any);

  assert.equal(first, second);
  assert.equal(second.queuedReason, 'first');
  assert.equal(second.flushPending, false);
  assert.equal(second.flushToken, 0);
});
