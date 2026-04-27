import { createCloudSyncAsyncSingleFlightRunner } from './cloud_sync_async_singleflight.js';
import { buildCloudSyncMainRowPayload } from './cloud_sync_main_row_local.js';
import { writeCloudSyncMainRowPayload } from './cloud_sync_main_row_write_support.js';
import {
  settleCloudSyncMainRowWrite,
  shouldSkipCloudSyncMainRowPush,
  type CreateCloudSyncMainRowRemoteOpsArgs,
} from './cloud_sync_main_row_remote_shared.js';

export function createCloudSyncMainRowPushNow(
  args: CreateCloudSyncMainRowRemoteOpsArgs
): () => Promise<void> {
  const {
    cfg,
    restUrl,
    room,
    getRow,
    upsertRow,
    runtimeStatus,
    publishStatus,
    suppressRef,
    getSendRealtimeHint,
    localState,
    state,
    schedulePullSoon,
  } = args;

  const runPushFlight = createCloudSyncAsyncSingleFlightRunner();

  return (): Promise<void> =>
    state.runMainWriteFlight(
      'push',
      () =>
        runPushFlight('pushNow', async () => {
          const local = localState.readCurrentLocal();
          const nextHash = localState.computeHashForLocal(local);
          if (
            shouldSkipCloudSyncMainRowPush({
              suppressRef,
              nextHash,
              getLastHash: state.getLastHash,
            })
          ) {
            return;
          }

          const writeResult = await writeCloudSyncMainRowPayload({
            cfg,
            restUrl,
            room,
            payload: buildCloudSyncMainRowPayload(local),
            getRow,
            upsertRow,
            getSendRealtimeHint,
            runtimeStatus,
            publishStatus,
            setLastSeenUpdatedAt: value => {
              state.setLastSeenUpdatedAt(value);
            },
          });
          if (!writeResult.ok) return;
          settleCloudSyncMainRowWrite({
            writeResult,
            localState,
            state,
            nextHash,
            schedulePullSoon,
          });
        }),
      () => undefined
    );
}
