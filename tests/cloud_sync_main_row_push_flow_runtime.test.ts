import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncMainRowPushFlow } from '../esm/native/services/cloud_sync_main_row_push.ts';

test('cloud sync main-row push flow drops pending follow-up push when suppression starts during an in-flight push', async () => {
  const suppressRef = { v: false };
  let inFlight = false;
  let pushCalls = 0;
  let resolveCurrentPush: (() => void) | null = null;

  const flow = createCloudSyncMainRowPushFlow({
    App: {},
    setTimeoutFn: handler => {
      handler();
      return 1;
    },
    clearTimeoutFn: () => undefined,
    suppressRef,
    isPushInFlight: () => inFlight,
    runPushRemote: () => {
      pushCalls += 1;
      inFlight = true;
      return new Promise<void>(resolve => {
        resolveCurrentPush = () => {
          inFlight = false;
          resolve();
        };
      });
    },
    flushPendingPullAfterFlights: () => undefined,
  });

  const firstPush = flow.pushNow();
  flow.schedulePush();

  suppressRef.v = true;
  resolveCurrentPush?.();
  await firstPush;

  suppressRef.v = false;
  const secondPush = flow.pushNow();
  resolveCurrentPush?.();
  await secondPush;
  await Promise.resolve();

  assert.equal(pushCalls, 2);
  flow.dispose();
});
