import type { CloudSyncTabsGateCommandResult } from '../../../types';

import { runCloudSyncOwnedAsyncFamilySingleFlight } from './cloud_sync_async_singleflight.js';
import {
  readCloudSyncCommandBoolean,
  readCloudSyncCommandFiniteNumber,
  readCloudSyncCommandMessage,
  readCloudSyncCommandReason,
} from './cloud_sync_command_shared.js';
import {
  CLOUD_SYNC_TABS_GATE_COMMAND_REASONS,
  type CloudSyncTabsGateCommandDeps,
  type Site2TabsGateCommandKey,
  resolveSite2TabsGateTarget,
  site2TabsGateCommandFlights,
} from './cloud_sync_tabs_gate_command_shared.js';

export function runSite2TabsGateCommand(
  deps: CloudSyncTabsGateCommandDeps,
  nextOpen: boolean
): Promise<CloudSyncTabsGateCommandResult> {
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

  if (!isTabsGateController) return Promise.resolve({ ok: false, reason: 'controller-only' });

  const key: Site2TabsGateCommandKey = nextOpen ? 'open' : 'close';
  return runCloudSyncOwnedAsyncFamilySingleFlight({
    owner: App as object,
    flights: site2TabsGateCommandFlights,
    key,
    onBusy: () => ({ ok: false, reason: 'busy' }),
    run: async () => {
      const nowMs = readCloudSyncCommandFiniteNumber(now());
      const curOpen = readCloudSyncCommandBoolean(tabsGateOpenRef?.value, false);
      const curUntil = readCloudSyncCommandFiniteNumber(tabsGateUntilRef?.value);
      const target = resolveSite2TabsGateTarget(
        !!nextOpen,
        nowMs,
        curOpen,
        curUntil,
        readCloudSyncCommandFiniteNumber(site2TabsTtlMs)
      );
      if (!target.changed) {
        return {
          ok: true,
          changed: false,
          open: target.open,
          until: target.until,
        } satisfies CloudSyncTabsGateCommandResult;
      }

      writeSite2TabsGateLocal(target.open, target.until);
      patchSite2TabsGateUi(target.open, target.until, clientId);

      const pushed = await pushTabsGateNow(target.open, target.until);
      if (pushed && pushed.ok) {
        return {
          ok: true,
          changed: true,
          open: target.open,
          until: target.until,
        } satisfies CloudSyncTabsGateCommandResult;
      }

      try {
        await pullTabsGateOnce(false);
      } catch (error) {
        reportNonFatal(App, 'services/cloud_sync.tabsGate.rollbackPull', error, { throttleMs: 4000 });
      }

      const pushFailure = pushed && pushed.ok === false ? pushed : null;
      const message = readCloudSyncCommandMessage(
        pushFailure && 'message' in pushFailure ? pushFailure.message : undefined
      );
      return {
        ok: false,
        changed: true,
        reason:
          readCloudSyncCommandReason(pushFailure?.reason, CLOUD_SYNC_TABS_GATE_COMMAND_REASONS) ||
          'sync-failed',
        ...(message ? { message } : {}),
        rolledBack: true,
        open: readCloudSyncCommandBoolean(tabsGateOpenRef?.value, false),
        until: readCloudSyncCommandFiniteNumber(tabsGateUntilRef?.value),
      } satisfies CloudSyncTabsGateCommandResult;
    },
  });
}

export function toggleSite2TabsGateCommand(
  deps: CloudSyncTabsGateCommandDeps
): Promise<CloudSyncTabsGateCommandResult> {
  return runSite2TabsGateCommand(deps, !readCloudSyncCommandBoolean(deps.tabsGateOpenRef?.value, false));
}
