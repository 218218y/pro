import type {
  CloudSyncPanelApiDeps,
  CloudSyncServiceLike,
  CloudSyncTabsGateCommandResult,
} from '../../../types';

import { buildCloudSyncPanelApiOp } from './cloud_sync_panel_api_support.js';
import { readCloudSyncErrorMessage } from './cloud_sync_support.js';
import type { CloudSyncTabsGateCommandDeps } from './cloud_sync_tabs_gate_command.js';

export type CloudSyncPanelApiControlCommands = Required<
  Pick<
    CloudSyncServiceLike,
    | 'isSite2TabsGateEnabled'
    | 'getSite2TabsGateSnapshot'
    | 'subscribeSite2TabsGateSnapshot'
    | 'getSite2TabsGateOpen'
    | 'getSite2TabsGateUntil'
    | 'setSite2TabsGateOpen'
    | 'toggleSite2TabsGateOpen'
  >
>;

export function buildCloudSyncPanelApiControlOp(name: string): string {
  return buildCloudSyncPanelApiOp(name);
}

export function buildSite2TabsGateCommandDeps(deps: CloudSyncPanelApiDeps): CloudSyncTabsGateCommandDeps {
  const {
    App,
    clientId,
    isTabsGateController,
    site2TabsTtlMs,
    tabsGateOpenRef,
    tabsGateUntilRef,
    now,
    writeSite2TabsGateLocal,
    patchSite2TabsGateUi,
    pushTabsGateNow,
    pullTabsGateOnce,
    reportNonFatal,
  } = deps;

  return {
    App,
    clientId,
    isTabsGateController,
    site2TabsTtlMs,
    tabsGateOpenRef,
    tabsGateUntilRef,
    now,
    writeSite2TabsGateLocal,
    patchSite2TabsGateUi,
    pushTabsGateNow,
    pullTabsGateOnce,
    reportNonFatal,
  };
}

export function readSite2TabsGateCommandFailure(err: unknown): CloudSyncTabsGateCommandResult {
  return {
    ok: false,
    reason: 'error',
    message: readCloudSyncErrorMessage(err),
  };
}
