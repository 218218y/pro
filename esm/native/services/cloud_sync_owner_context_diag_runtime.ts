import type { AppContainer, CloudSyncDiagFn, CloudSyncRuntimeStatus } from '../../../types';

import { getWindowMaybe } from '../runtime/api.js';

import type { SupabaseCfg } from './cloud_sync_config.js';
import {
  CLOUD_SYNC_DIAG_LS_KEY,
  type CloudSyncReportNonFatal,
} from './cloud_sync_owner_context_runtime_shared.js';

export type CloudSyncOwnerDiagRuntime = {
  diagEnabledRef: { value: boolean };
  updateDiagEnabled: () => void;
  diag: CloudSyncDiagFn;
};

export function createCloudSyncOwnerDiagRuntime(args: {
  App: AppContainer;
  cfg: SupabaseCfg;
  runtimeStatus: CloudSyncRuntimeStatus;
  reportNonFatal: CloudSyncReportNonFatal;
}): CloudSyncOwnerDiagRuntime {
  const { App, cfg, runtimeStatus, reportNonFatal } = args;
  const diagEnabledRef = { value: false };

  const updateDiagEnabled = (): void => {
    try {
      if (cfg.diagnostics) {
        diagEnabledRef.value = true;
        runtimeStatus.diagEnabled = true;
        return;
      }
      const ls = getWindowMaybe(App)?.localStorage || null;
      const raw =
        ls && typeof ls.getItem === 'function' ? String(ls.getItem(CLOUD_SYNC_DIAG_LS_KEY) || '') : '';
      const normalized = raw.trim().toLowerCase();
      diagEnabledRef.value = normalized === '1' || normalized === 'true' || normalized === 'yes';
      runtimeStatus.diagEnabled = diagEnabledRef.value;
    } catch (error) {
      reportNonFatal(App, 'diag.updateEnabled', error, { throttleMs: 8000, noConsole: true });
      diagEnabledRef.value = false;
      runtimeStatus.diagEnabled = false;
    }
  };

  const diag: CloudSyncDiagFn = (event, payload): void => {
    try {
      if (!diagEnabledRef.value) return;
      if (typeof payload === 'undefined') console.log('[cloudSync]', event);
      else console.log('[cloudSync]', event, payload);
    } catch (error) {
      reportNonFatal(App, 'diag.consoleLog', error, { throttleMs: 10000, noConsole: true });
    }
  };

  return {
    diagEnabledRef,
    updateDiagEnabled,
    diag,
  };
}
