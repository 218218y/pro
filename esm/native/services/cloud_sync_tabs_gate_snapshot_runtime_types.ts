import type { AppContainer, TimeoutHandleLike } from '../../../types';

export type CloudSyncReportNonFatal = (
  app: AppContainer,
  op: string,
  error: unknown,
  opts?: { throttleMs?: number; noConsole?: boolean }
) => void;

export type CloudSyncTabsGateSnapshotControllerArgs = {
  App: AppContainer;
  reportNonFatal: CloudSyncReportNonFatal;
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn: (id: TimeoutHandleLike) => void;
  readOpen: () => boolean;
  readUntil: () => number;
};
