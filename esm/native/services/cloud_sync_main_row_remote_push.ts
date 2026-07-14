import { createCloudSyncAsyncSingleFlightRunner } from './cloud_sync_async_singleflight.js';
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
    gatewayUrl,
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
    schedulePushSoon,
  } = args;

  const runPushFlight = createCloudSyncAsyncSingleFlightRunner();

  return (): Promise<void> =>
    state.runMainWriteFlight(
      'push',
      () =>
        runPushFlight('pushNow', async () => {
          const localSnapshot = localState.readLocalSnapshot();
          const nextHash = localState.computeAppliedPayloadHash(localSnapshot.payload);
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
            gatewayUrl,
            room,
            payload: localSnapshot.payload,
            getRow,
            upsertRow,
            getSendRealtimeHint,
            runtimeStatus,
            publishStatus,
          });
          if (!writeResult.ok) return;
          await settleCloudSyncMainRowWrite({
            writeResult,
            localState,
            state,
            nextHash,
            expectedLocalRevision: localSnapshot.revision,
            schedulePullSoon,
            schedulePushSoon,
          });
        }),
      () => undefined
    );
}
