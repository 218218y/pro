import { type CloudSyncMaybeAsyncPull, toCloudSyncAsyncPull } from './cloud_sync_async_pull.js';
import {
  CLOUD_SYNC_PULL_SCOPE_ORDER,
  buildCloudSyncPullTriggerReason,
  createCloudSyncPullScopeMap,
  createCloudSyncRealtimeScopedValueMap,
  forEachCloudSyncTriggeredPullScope,
  type CloudSyncMainPullTriggerLike,
  type CloudSyncPullAllTriggerMap,
  type CloudSyncPullScope,
  type CloudSyncPullScopeCancelable,
  type CloudSyncPullScopeMap,
  type CloudSyncPullScopeRunner,
  type CloudSyncPullScopeSpec,
  type CloudSyncPullTriggerLike,
} from './cloud_sync_pull_scopes_shared.js';

export function createCloudSyncInstallPullRunnerMap(args: {
  pullSketchOnce: CloudSyncMaybeAsyncPull;
  pullTabsGateOnce: CloudSyncMaybeAsyncPull;
  pullFloatingSketchSyncPinnedOnce: CloudSyncMaybeAsyncPull;
}): CloudSyncPullScopeMap<CloudSyncPullScopeRunner> {
  const pullSketchOnce = toCloudSyncAsyncPull(args.pullSketchOnce);
  const pullTabsGateOnce = toCloudSyncAsyncPull(args.pullTabsGateOnce);
  const pullFloatingSketchSyncPinnedOnce = toCloudSyncAsyncPull(args.pullFloatingSketchSyncPinnedOnce);

  return {
    sketch: () => pullSketchOnce(false),
    tabsGate: () => pullTabsGateOnce(false),
    floatingSync: () => pullFloatingSketchSyncPinnedOnce(false),
  };
}

export function createCloudSyncPullCoalescerMap<T>(args: {
  pullRunners: CloudSyncPullScopeMap<CloudSyncPullScopeRunner>;
  createPullCoalescer: (
    scope: CloudSyncPullScope,
    run: CloudSyncPullScopeRunner,
    spec: CloudSyncPullScopeSpec
  ) => T;
}): CloudSyncPullScopeMap<T> {
  const { pullRunners, createPullCoalescer } = args;
  return createCloudSyncPullScopeMap((scope, spec) => createPullCoalescer(scope, pullRunners[scope], spec));
}

export function createCloudSyncPullAllTriggerMap(args: {
  mainTrigger: CloudSyncMainPullTriggerLike;
  pullTriggers: CloudSyncPullScopeMap<CloudSyncPullTriggerLike>;
}): CloudSyncPullAllTriggerMap {
  return createCloudSyncRealtimeScopedValueMap(scope =>
    scope === 'main' ? args.mainTrigger : args.pullTriggers[scope]
  ) as CloudSyncPullAllTriggerMap;
}

export function cancelCloudSyncPullScopeMap<T extends CloudSyncPullScopeCancelable>(
  scopes: CloudSyncPullScopeMap<T>
): void {
  for (const scope of CLOUD_SYNC_PULL_SCOPE_ORDER) scopes[scope].cancel();
}

export function triggerCloudSyncPullScopes(args: {
  pullTriggers: CloudSyncPullScopeMap<CloudSyncPullTriggerLike>;
  includeControls: boolean;
  reason: string;
  immediate?: boolean;
}): void {
  const { pullTriggers, includeControls, reason, immediate } = args;
  forEachCloudSyncTriggeredPullScope(includeControls, scope => {
    pullTriggers[scope].trigger(buildCloudSyncPullTriggerReason(reason, scope), immediate);
  });
}
