import type { CloudSyncServiceLike } from '../../../types';

import {
  disposeCloudSyncPanelApiBridges,
  refreshCloudSyncPanelApiBridgeSubscriptions,
  resolveCloudSyncPanelApiBridges,
} from './cloud_sync_panel_api_install_bridges.js';
import {
  asInstallableCloudSyncPanelApi,
  resolveCloudSyncPanelApiInstallContext,
  type CloudSyncPanelApiInstallContext,
  type InstallableCloudSyncPanelApi,
} from './cloud_sync_panel_api_install_context_runtime.js';
import { clearLegacyInstalledCloudSyncPanelApiDrift } from './cloud_sync_panel_api_install_surface_contracts.js';
import { installCloudSyncPanelApiMutationRefs } from './cloud_sync_panel_api_install_surface_mutations.js';
import { installCloudSyncPanelApiReadRefs } from './cloud_sync_panel_api_install_surface_reads.js';

export function installCloudSyncPanelApiRefs(
  api: InstallableCloudSyncPanelApi,
  context: CloudSyncPanelApiInstallContext,
  bridges: ReturnType<typeof resolveCloudSyncPanelApiBridges> = resolveCloudSyncPanelApiBridges(api)
): void {
  installCloudSyncPanelApiReadRefs(api, context, bridges);
  installCloudSyncPanelApiMutationRefs(api, context);
  api.__wpCloudSyncPanelApiInstalled = true;
}

export function deactivateCloudSyncPanelApiSurface(current: unknown): void {
  const api = asInstallableCloudSyncPanelApi(current);
  if (!api) return;

  const context = resolveCloudSyncPanelApiInstallContext(api, null);
  context.impl = null;

  const bridges = resolveCloudSyncPanelApiBridges(api);
  disposeCloudSyncPanelApiBridges(bridges);

  try {
    delete api.__wpCloudSyncPanelApiImpl;
  } catch {
    api.__wpCloudSyncPanelApiImpl = undefined;
  }
}

export function installCloudSyncPanelApiSurface(
  current: unknown,
  impl: CloudSyncServiceLike
): InstallableCloudSyncPanelApi {
  const api = asInstallableCloudSyncPanelApi(current) || {};
  clearLegacyInstalledCloudSyncPanelApiDrift(api);
  const context = resolveCloudSyncPanelApiInstallContext(api, impl);
  const bridges = resolveCloudSyncPanelApiBridges(api);

  api.__wpCloudSyncPanelApiImpl = impl;
  installCloudSyncPanelApiRefs(api, context, bridges);
  refreshCloudSyncPanelApiBridgeSubscriptions(context, bridges);
  return api;
}
