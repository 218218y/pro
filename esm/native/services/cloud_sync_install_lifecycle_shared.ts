import type { AppContainer } from '../../../types';

import { isCloudSyncPublicationEpochCurrent } from './cloud_sync_install_support.js';
import type { CloudSyncOwnerContext } from './cloud_sync_owner_context.js';
import type { CloudSyncInstallRuntime, CloudSyncHintSender } from './cloud_sync_install_runtime.js';

export type CloudSyncInstallLifecycleArgs = {
  App: AppContainer;
  ownerContext: CloudSyncOwnerContext;
  runtime: CloudSyncInstallRuntime;
  cleanup: Array<() => void>;
  suppressRef: { v: boolean };
  disposedRef: { v: boolean };
  setSendRealtimeHint: (next: CloudSyncHintSender) => void;
};

export type CloudSyncInstallLiveness = {
  isInstallPublicationLive: () => boolean;
  isInstallLive: () => boolean;
  isOwnerDisposedOrStale: () => boolean;
};

export function createCloudSyncInstallLiveness(args: {
  App: AppContainer;
  ownerContext: Pick<CloudSyncOwnerContext, 'publicationEpoch'>;
  disposedRef: { v: boolean };
}): CloudSyncInstallLiveness {
  const { App, ownerContext, disposedRef } = args;
  const isInstallPublicationLive = (): boolean =>
    isCloudSyncPublicationEpochCurrent(App, ownerContext.publicationEpoch);
  const isInstallLive = (): boolean => !disposedRef.v && isInstallPublicationLive();
  const isOwnerDisposedOrStale = (): boolean => disposedRef.v || !isInstallPublicationLive();
  return {
    isInstallPublicationLive,
    isInstallLive,
    isOwnerDisposedOrStale,
  };
}

export function createCloudSyncLifecycleStatusPublisher(args: {
  liveness: Pick<CloudSyncInstallLiveness, 'isInstallPublicationLive'>;
  publishStatus: () => void;
}): () => void {
  const { liveness, publishStatus } = args;
  return (): void => {
    if (!liveness.isInstallPublicationLive()) return;
    publishStatus();
  };
}

export function createCloudSyncLifecycleHintSetter(args: {
  liveness: Pick<CloudSyncInstallLiveness, 'isInstallPublicationLive' | 'isInstallLive'>;
  disposedRef: { v: boolean };
  setSendRealtimeHint: (next: CloudSyncHintSender) => void;
}): (next: CloudSyncHintSender) => void {
  const { liveness, disposedRef, setSendRealtimeHint } = args;
  return (next: CloudSyncHintSender): void => {
    if (!liveness.isInstallPublicationLive()) return;
    if (next == null) {
      setSendRealtimeHint(null);
      return;
    }
    if (disposedRef.v) return;
    setSendRealtimeHint((scope, rowName): void => {
      if (!liveness.isInstallLive()) return;
      next(scope, rowName);
    });
  };
}
