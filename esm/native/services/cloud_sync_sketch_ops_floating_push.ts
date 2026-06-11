import type { CloudSyncSyncPinCommandResult, CloudSyncSyncPinPayload } from '../../../types';

import { readCloudSyncErrorMessage, _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import {
  publishCloudSyncWriteActivity,
  resolveCloudSyncSettledRowAfterWrite,
} from './cloud_sync_remote_write_support.js';
import { beginCloudSyncOwnedAsyncFamilyFlight } from './cloud_sync_async_singleflight.js';
import { resolveFloatingSketchSyncRoom } from './cloud_sync_sketch_ops_shared.js';
import {
  floatingSketchSyncPushFlights,
  type CloudSyncFloatingSketchPushKey,
  type CloudSyncFloatingSketchSyncMutableState,
  type CreateCloudSyncFloatingSketchSyncOpsDeps,
} from './cloud_sync_sketch_ops_floating_state.js';

export function createCloudSyncFloatingSketchSyncPushNow(
  deps: CreateCloudSyncFloatingSketchSyncOpsDeps,
  state: CloudSyncFloatingSketchSyncMutableState
): (enabled: boolean) => Promise<CloudSyncSyncPinCommandResult> {
  const {
    App,
    cfg,
    storage,
    getGateBaseRoom,
    restUrl,
    clientId,
    getRow,
    upsertRow,
    emitRealtimeHint,
    runtimeStatus,
    publishStatus,
  } = deps;

  return (enabled: boolean): Promise<CloudSyncSyncPinCommandResult> => {
    const key: CloudSyncFloatingSketchPushKey = enabled ? 'enabled' : 'disabled';
    const flight = beginCloudSyncOwnedAsyncFamilyFlight({
      owner: App as object,
      flights: floatingSketchSyncPushFlights,
      key,
      run: async () => {
        const roomNow = resolveFloatingSketchSyncRoom({
          App,
          cfg,
          storage,
          getGateBaseRoom,
          currentRoom: () => '',
        });
        if (!roomNow) return { ok: false, reason: 'room' } satisfies CloudSyncSyncPinCommandResult;

        try {
          const payload: CloudSyncSyncPinPayload = {
            syncPinEnabled: !!enabled,
            syncPinRev: Date.now(),
            syncPinBy: clientId,
          };

          const res = await upsertRow(restUrl, cfg.anonKey, roomNow, payload, { returnRepresentation: true });
          if (!res.ok) return { ok: false, reason: 'write' } satisfies CloudSyncSyncPinCommandResult;
          publishCloudSyncWriteActivity({
            runtimeStatus,
            publishStatus,
            emitRealtimeHint,
            hintScope: 'floatingSync',
            rowName: roomNow,
          });

          await resolveCloudSyncSettledRowAfterWrite({
            returnedRow: res.row,
            reader: { restUrl, anonKey: cfg.anonKey, room: roomNow, getRow },
            runtimeStatus,
            publishStatus,
            onSettledUpdatedAt: value => {
              state.lastFloatingSyncUpdatedAt = value;
            },
          });

          return { ok: true, changed: true, enabled: !!enabled } satisfies CloudSyncSyncPinCommandResult;
        } catch (e) {
          _cloudSyncReportNonFatal(App, 'floatingSync.push', e, { throttleMs: 4000 });
          return {
            ok: false,
            reason: 'error',
            message: readCloudSyncErrorMessage(e),
          } satisfies CloudSyncSyncPinCommandResult;
        }
      },
    });
    if (flight.status === 'reused') return flight.promise;
    if (flight.status === 'busy') {
      return Promise.resolve({ ok: false, reason: 'busy' } satisfies CloudSyncSyncPinCommandResult);
    }
    return flight.promise;
  };
}
