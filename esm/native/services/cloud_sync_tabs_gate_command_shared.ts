import type {
  AppContainer,
  CloudSyncNonFatalReportOptions,
  CloudSyncRef,
  CloudSyncTabsGateCommandReason,
  CloudSyncTabsGateCommandResult,
} from '../../../types';

import type { CloudSyncAsyncFamilyFlight } from './cloud_sync_async_singleflight.js';

export type CloudSyncTabsGateCommandDeps = {
  App: AppContainer;
  clientId: string;
  isTabsGateController: boolean;
  site2TabsTtlMs: number;
  tabsGateOpenRef: CloudSyncRef<boolean>;
  tabsGateUntilRef: CloudSyncRef<number>;
  now: () => number;
  writeSite2TabsGateLocal: (open: boolean, until: number) => void;
  patchSite2TabsGateUi: (open: boolean, until: number, by: string) => void;
  pushTabsGateNow: (open: boolean, until: number) => Promise<CloudSyncTabsGateCommandResult>;
  pullTabsGateOnce: (isInitial: boolean) => Promise<void>;
  reportNonFatal: (
    app: AppContainer,
    op: string,
    err: unknown,
    opts?: CloudSyncNonFatalReportOptions
  ) => void;
};

export type Site2TabsGateCommandKey = 'open' | 'close';

export const site2TabsGateCommandFlights = new WeakMap<
  object,
  CloudSyncAsyncFamilyFlight<CloudSyncTabsGateCommandResult, Site2TabsGateCommandKey>
>();

export const SITE2_TABS_REFRESH_FLOOR_MS = 5 * 60 * 1000;

export const CLOUD_SYNC_TABS_GATE_COMMAND_REASONS = [
  'controller-only',
  'busy',
  'room',
  'write',
  'sync-failed',
  'error',
  'not-installed',
] as const satisfies readonly CloudSyncTabsGateCommandReason[];

export function resolveSite2TabsGateTarget(
  nextOpen: boolean,
  nowMs: number,
  curOpen: boolean,
  curUntil: number,
  ttlMs: number
): { changed: boolean; open: boolean; until: number } {
  const open = !!nextOpen;
  if (curOpen === open) {
    if (!open) return { changed: false, open, until: 0 };
    const remainMs = curUntil - nowMs;
    if (remainMs > SITE2_TABS_REFRESH_FLOOR_MS) {
      return { changed: false, open, until: curUntil > 0 ? curUntil : nowMs + ttlMs };
    }
  }
  return {
    changed: true,
    open,
    until: open ? nowMs + Math.max(0, Number(ttlMs) || 0) : 0,
  };
}
