import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addCloudSyncCleanup,
  disposeCloudSyncOwnerCleanup,
} from '../esm/native/services/cloud_sync_owner_support.ts';

test('cloud sync owner support cleanup flips suppression, disposes tabs/sketch first, then unwinds cleanup stack in reverse order', () => {
  const calls: string[] = [];
  const cleanup: Array<() => void> = [];
  const suppressRef = { v: false };
  const disposedRef = { v: false };

  addCloudSyncCleanup(cleanup, () => {
    calls.push('cleanup:first');
  });
  addCloudSyncCleanup(cleanup, () => {
    calls.push('cleanup:second');
  });

  disposeCloudSyncOwnerCleanup({
    App: { services: Object.create(null) } as any,
    cleanup,
    disposeTabsGate: () => {
      calls.push('tabs');
    },
    disposeSketchOps: () => {
      calls.push('sketch');
    },
    suppressRef,
    disposedRef,
  });

  assert.equal(disposedRef.v, true);
  assert.equal(suppressRef.v, true);
  assert.deepEqual(calls, ['tabs', 'sketch', 'cleanup:second', 'cleanup:first']);
  assert.equal(cleanup.length, 0);
});

test('cloud sync owner support cleanup is idempotent once the owner is already disposed', () => {
  const cleanup: Array<() => void> = [
    () => {
      throw new Error('should not run');
    },
  ];
  const disposedRef = { v: true };
  const suppressRef = { v: false };

  disposeCloudSyncOwnerCleanup({
    App: { services: Object.create(null) } as any,
    cleanup,
    disposeTabsGate: () => {
      throw new Error('should not run');
    },
    disposeSketchOps: () => {
      throw new Error('should not run');
    },
    suppressRef,
    disposedRef,
  });

  assert.equal(disposedRef.v, true);
  assert.equal(suppressRef.v, false);
  assert.equal(cleanup.length, 1);
});
