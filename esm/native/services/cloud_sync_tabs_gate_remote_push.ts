import type { CloudSyncTabsGateCommandResult, CloudSyncTabsGatePayload } from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import { beginCloudSyncOwnedAsyncFamilyFlight } from './cloud_sync_async_singleflight.js';
import { readCloudSyncTabsGateErrorMessage } from './cloud_sync_tabs_gate_support.js';
import { SITE2_TABS_TTL_MS } from './cloud_sync_tabs_gate_shared.js';
import {
  publishCloudSyncWriteActivity,
  resolveCloudSyncSettledRowAfterWrite,
} from './cloud_sync_remote_write_support.js';
import {
  type CreateCloudSyncTabsGateRemoteOpsDeps,
  type CloudSyncTabsGateRemoteKey,
  cloudSyncTabsGateRemoteFlights,
} from './cloud_sync_tabs_gate_remote_shared.js';

export function createCloudSyncTabsGatePushNow(
  args: CreateCloudSyncTabsGateRemoteOpsDeps & { lastTabsGateUpdatedAtRef: { value: string } }
): (nextOpen: boolean, untilIn: number) => Promise<CloudSyncTabsGateCommandResult> {
  const {
    App,
    cfg,
    restUrl,
    clientId,
    getRow,
    upsertRow,
    emitRealtimeHint,
    isTabsGateController,
    getSite2TabsRoom,
    runtimeStatus,
    publishStatus,
    lastTabsGateUpdatedAtRef,
  } = args;

  return (nextOpen: boolean, untilIn: number): Promise<CloudSyncTabsGateCommandResult> => {
    if (!isTabsGateController) {
      return Promise.resolve({
        ok: false,
        reason: 'controller-only',
      } satisfies CloudSyncTabsGateCommandResult);
    }
    const key: CloudSyncTabsGateRemoteKey = nextOpen ? 'open' : 'close';
    const flight = beginCloudSyncOwnedAsyncFamilyFlight({
      owner: App as object,
      flights: cloudSyncTabsGateRemoteFlights,
      key,
      run: async () => {
        const roomNow = getSite2TabsRoom();
        if (!roomNow) return { ok: false, reason: 'room' } satisfies CloudSyncTabsGateCommandResult;

        try {
          const now = Date.now();
          const untilRaw = Number(untilIn) || 0;
          const until = nextOpen ? (untilRaw && untilRaw > now ? untilRaw : now + SITE2_TABS_TTL_MS) : 0;
          const payload: CloudSyncTabsGatePayload = {
            tabsGateOpen: !!nextOpen,
            tabsGateUntil: until,
            tabsGateRev: now,
            tabsGateBy: clientId,
          };

          const res = await upsertRow(restUrl, cfg.anonKey, roomNow, payload, { returnRepresentation: true });
          if (!res.ok) return { ok: false, reason: 'write' } satisfies CloudSyncTabsGateCommandResult;
          publishCloudSyncWriteActivity({
            runtimeStatus,
            publishStatus,
            emitRealtimeHint,
            hintScope: 'tabsGate',
            rowName: roomNow,
          });

          await resolveCloudSyncSettledRowAfterWrite({
            returnedRow: res.row,
            reader: { restUrl, anonKey: cfg.anonKey, room: roomNow, getRow },
            runtimeStatus,
            publishStatus,
            onSettledUpdatedAt: value => {
              lastTabsGateUpdatedAtRef.value = value;
            },
          });

          return {
            ok: true,
            changed: true,
            open: !!nextOpen,
            until,
          } satisfies CloudSyncTabsGateCommandResult;
        } catch (error) {
          _cloudSyncReportNonFatal(App, 'site2TabsGate.push', error, { throttleMs: 4000 });
          return {
            ok: false,
            reason: 'error',
            message: readCloudSyncTabsGateErrorMessage(error),
          } satisfies CloudSyncTabsGateCommandResult;
        }
      },
    });
    if (flight.status === 'reused') return flight.promise;
    if (flight.status === 'busy') {
      return Promise.resolve({ ok: false, reason: 'busy' } satisfies CloudSyncTabsGateCommandResult);
    }
    return flight.promise;
  };
}
