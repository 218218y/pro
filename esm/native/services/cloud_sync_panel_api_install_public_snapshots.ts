import type {
  CloudSyncPanelSnapshot,
  CloudSyncRuntimeStatus,
  CloudSyncSite2TabsGateSnapshot,
} from '../../../types';

import {
  cloneCloudSyncPublicPanelSnapshot,
  cloneCloudSyncPublicRuntimeStatus,
  cloneCloudSyncPublicSite2TabsGateSnapshot,
  getUnavailableCloudSyncPanelSnapshot,
  getUnavailableCloudSyncRuntimeStatus,
  getUnavailableCloudSyncSite2TabsGateSnapshot,
} from './cloud_sync_panel_api_public_support.js';
import {
  invokeCloudSyncPanelApi,
  type CloudSyncPanelApiInstallContext,
} from './cloud_sync_panel_api_install_context_runtime.js';

export function readCloudSyncPanelApiRuntimeStatus(
  context: CloudSyncPanelApiInstallContext
): CloudSyncRuntimeStatus {
  return cloneCloudSyncPublicRuntimeStatus(
    invokeCloudSyncPanelApi(context, 'getSyncRuntimeStatus', getUnavailableCloudSyncRuntimeStatus())
  );
}

export function readCloudSyncPanelApiPanelSnapshot(
  context: CloudSyncPanelApiInstallContext
): CloudSyncPanelSnapshot {
  return cloneCloudSyncPublicPanelSnapshot(
    invokeCloudSyncPanelApi(context, 'getPanelSnapshot', getUnavailableCloudSyncPanelSnapshot())
  );
}

export function readCloudSyncPanelApiSite2TabsGateSnapshot(
  context: CloudSyncPanelApiInstallContext
): CloudSyncSite2TabsGateSnapshot {
  return cloneCloudSyncPublicSite2TabsGateSnapshot(
    invokeCloudSyncPanelApi(
      context,
      'getSite2TabsGateSnapshot',
      getUnavailableCloudSyncSite2TabsGateSnapshot()
    )
  );
}
