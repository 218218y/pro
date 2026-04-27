import { readCloudSyncRowWithPullActivity } from './cloud_sync_remote_read_support.js';
import { resolveCloudSyncTabsGateState } from './cloud_sync_tabs_gate_support.js';
import { SITE2_TABS_TTL_MS } from './cloud_sync_tabs_gate_shared.js';
import type { CreateCloudSyncTabsGateRemoteOpsDeps } from './cloud_sync_tabs_gate_remote_shared.js';

export function createCloudSyncTabsGatePullOnce(
  args: CreateCloudSyncTabsGateRemoteOpsDeps & { lastTabsGateUpdatedAtRef: { value: string } }
): (isInitial: boolean) => Promise<void> {
  const {
    cfg,
    restUrl,
    getRow,
    isTabsGateController,
    getSite2TabsRoom,
    writeSite2TabsGateLocal,
    patchSite2TabsGateUi,
    runtimeStatus,
    publishStatus,
    lastTabsGateUpdatedAtRef,
  } = args;

  return async (isInitial: boolean): Promise<void> => {
    const roomNow = getSite2TabsRoom();
    if (!roomNow) return;

    const row = await readCloudSyncRowWithPullActivity({
      restUrl,
      anonKey: cfg.anonKey,
      room: roomNow,
      getRow,
      runtimeStatus,
      publishStatus,
    });
    if (!row || !row.updated_at) {
      patchSite2TabsGateUi(false, 0, 'none');
      if (isTabsGateController) writeSite2TabsGateLocal(false, 0);
      return;
    }

    if (isInitial || !lastTabsGateUpdatedAtRef.value || row.updated_at !== lastTabsGateUpdatedAtRef.value) {
      lastTabsGateUpdatedAtRef.value = row.updated_at;
      const parsed = resolveCloudSyncTabsGateState(row.payload, row.updated_at, SITE2_TABS_TTL_MS);
      if (isTabsGateController) writeSite2TabsGateLocal(parsed.open, parsed.until);
      patchSite2TabsGateUi(parsed.open, parsed.until, parsed.by || 'cloud');
    }
  };
}
