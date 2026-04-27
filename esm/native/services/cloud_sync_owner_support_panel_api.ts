import { ensureCloudSyncServiceState } from '../runtime/cloud_sync_access.js';
import { createCloudSyncPanelApi } from './cloud_sync_panel_api.js';
import { installCloudSyncPanelApiSurface } from './cloud_sync_panel_api_install.js';
import { isCloudSyncPublicationEpochCurrent } from './cloud_sync_install_support.js';
import {
  buildCloudSyncPanelApiDeps,
  type CloudSyncPanelApiInstallDeps,
  reportCloudSyncOwnerSupportError,
} from './cloud_sync_owner_support_shared.js';

export function installCloudSyncPanelApi(deps: CloudSyncPanelApiInstallDeps): void {
  const { App, publicationEpoch } = deps;

  try {
    if (!isCloudSyncPublicationEpochCurrent(App, publicationEpoch)) return;
    const panelDeps = buildCloudSyncPanelApiDeps(deps);
    const api = createCloudSyncPanelApi(panelDeps);
    if (!isCloudSyncPublicationEpochCurrent(App, publicationEpoch)) return;

    const state = ensureCloudSyncServiceState(App);
    if (!state) return;
    if (!isCloudSyncPublicationEpochCurrent(App, publicationEpoch)) return;
    state.panelApi = installCloudSyncPanelApiSurface(state.panelApi, api);
  } catch (err) {
    reportCloudSyncOwnerSupportError(App, 'services/cloud_sync.panelApi', err);
  }
}
