import type { AppContainer } from '../../../types';

import { deactivateCloudSyncPanelApiSurface } from './cloud_sync_panel_api_install.js';
import { deactivateCloudSyncStatusSurface } from './cloud_sync_status_install.js';
import {
  type ClearCloudSyncPublishedStateOptions,
  type CloudSyncPublishedPreservedState,
  type CloudSyncPublishedStateLike,
  reportCloudSyncPublishedStateCleanupError,
} from './cloud_sync_install_support_shared.js';
import { readCloudSyncPublishedPreservedState } from './cloud_sync_install_support_publication_preservation_shared.js';

type CloudSyncDeactivatablePublishedSlot = 'panelApi' | 'status';
type CloudSyncRemovablePublishedSlot =
  | 'panelApi'
  | 'status'
  | 'installedAt'
  | 'dispose'
  | '__disposePublicationEpoch'
  | '__testHooks';

type CloudSyncPublishedDeactivationSpec = {
  deactivate: (current: unknown) => void;
  op: string;
};

const CLOUD_SYNC_PUBLISHED_DEACTIVATION_SPECS: Record<
  CloudSyncDeactivatablePublishedSlot,
  CloudSyncPublishedDeactivationSpec
> = {
  panelApi: {
    deactivate: deactivateCloudSyncPanelApiSurface,
    op: 'install.clearState.panelApi.deactivate',
  },
  status: {
    deactivate: deactivateCloudSyncStatusSurface,
    op: 'install.clearState.status.deactivate',
  },
};

const CLOUD_SYNC_PUBLISHED_DEACTIVATION_ORDER = ['panelApi', 'status'] as const;

const CLOUD_SYNC_PUBLISHED_REMOVABLE_ORDER = [
  'panelApi',
  'status',
  'installedAt',
  'dispose',
  '__disposePublicationEpoch',
  '__testHooks',
] as const satisfies readonly CloudSyncRemovablePublishedSlot[];

const CLOUD_SYNC_PUBLISHED_DELETE_OPS: Record<CloudSyncRemovablePublishedSlot, string> = {
  panelApi: 'install.clearState.panelApi',
  status: 'install.clearState.status',
  installedAt: 'install.clearState.installedAt',
  dispose: 'install.clearState.dispose',
  __disposePublicationEpoch: 'install.clearState.disposeEpoch',
  __testHooks: 'install.clearState.testHooks',
};

function deactivateCloudSyncPublishedSlots(App: AppContainer, state: CloudSyncPublishedStateLike): void {
  for (const key of CLOUD_SYNC_PUBLISHED_DEACTIVATION_ORDER) {
    const spec = CLOUD_SYNC_PUBLISHED_DEACTIVATION_SPECS[key];
    try {
      spec.deactivate(state[key]);
    } catch (error) {
      reportCloudSyncPublishedStateCleanupError(App, spec.op, error);
    }
  }
}

function deleteCloudSyncPublishedSlot(
  App: AppContainer,
  state: CloudSyncPublishedStateLike,
  key: CloudSyncRemovablePublishedSlot
): void {
  try {
    delete state[key];
  } catch (error) {
    reportCloudSyncPublishedStateCleanupError(App, CLOUD_SYNC_PUBLISHED_DELETE_OPS[key], error);
  }
}

export function clearCloudSyncPublishedSlots(
  App: AppContainer,
  state: CloudSyncPublishedStateLike,
  opts: Required<ClearCloudSyncPublishedStateOptions>
): CloudSyncPublishedPreservedState {
  const preserved = readCloudSyncPublishedPreservedState(state, opts);
  deactivateCloudSyncPublishedSlots(App, state);
  for (const key of CLOUD_SYNC_PUBLISHED_REMOVABLE_ORDER) {
    if (key in preserved) continue;
    deleteCloudSyncPublishedSlot(App, state, key);
  }
  return preserved;
}
