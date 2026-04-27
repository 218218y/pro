import type { CloudSyncRealtimeHintScope } from '../../../types';

import {
  CLOUD_SYNC_PULL_SCOPE_SPECS,
  buildCloudSyncPullTriggerReason,
  buildCloudSyncRealtimeScopedTriggerReason,
  createCloudSyncPullScopeMap,
  createCloudSyncRealtimeScopedValueMap,
  forEachCloudSyncRealtimeScopedHandlerScope,
  type CloudSyncMainPullTriggerLike,
  type CloudSyncPullScopeMap,
  type CloudSyncPullTriggerLike,
  type CloudSyncRealtimeScopedHandlerMap,
  type CloudSyncRealtimeScopedHandlerScope,
} from './cloud_sync_pull_scopes_shared.js';
import { createCloudSyncPullAllTriggerMap } from './cloud_sync_pull_scopes_pull.js';

export function triggerCloudSyncPullAllScopes(args: {
  mainTrigger: CloudSyncMainPullTriggerLike;
  pullTriggers: CloudSyncPullScopeMap<CloudSyncPullTriggerLike>;
  includeControls: boolean;
  reason: string;
  immediateMain?: boolean;
  immediatePulls?: boolean;
}): void {
  const { includeControls, reason, immediateMain, immediatePulls } = args;
  const allTriggers = createCloudSyncPullAllTriggerMap({
    mainTrigger: args.mainTrigger,
    pullTriggers: args.pullTriggers,
  });
  forEachCloudSyncRealtimeScopedHandlerScope(scope => {
    if (scope === 'main') {
      allTriggers.main.trigger(
        buildCloudSyncRealtimeScopedTriggerReason(reason, 'main'),
        immediateMain ?? true
      );
      return;
    }
    const spec = CLOUD_SYNC_PULL_SCOPE_SPECS[scope];
    if (!includeControls && spec.includeInControlPull) return;
    allTriggers[scope].trigger(buildCloudSyncPullTriggerReason(reason, scope), immediatePulls);
  });
}

export function createCloudSyncRealtimePullScopeHandlerMap(args: {
  markRealtimeEvent: () => boolean;
  pullTriggers: CloudSyncPullScopeMap<CloudSyncPullTriggerLike>;
  reason?: string;
  immediate?: boolean;
}): CloudSyncPullScopeMap<() => void> {
  const reason = String(args.reason || 'realtime').trim() || 'realtime';
  return createCloudSyncPullScopeMap(scope => () => {
    if (!args.markRealtimeEvent()) return;
    args.pullTriggers[scope].trigger(buildCloudSyncPullTriggerReason(reason, scope), args.immediate);
  });
}

export function createCloudSyncRealtimeScopedHandlerMap(
  factory: (scope: CloudSyncRealtimeScopedHandlerScope) => () => void
): CloudSyncRealtimeScopedHandlerMap {
  return createCloudSyncRealtimeScopedValueMap(factory);
}

export function buildCloudSyncRealtimeScopedHandlerMap(args: {
  handleRealtimeMain: () => void;
  pullScopeHandlers: CloudSyncPullScopeMap<() => void>;
}): CloudSyncRealtimeScopedHandlerMap {
  return createCloudSyncRealtimeScopedHandlerMap(scope =>
    scope === 'main' ? args.handleRealtimeMain : args.pullScopeHandlers[scope]
  );
}

export function createCloudSyncRealtimeScopedHandlerMapFromTriggers(args: {
  markRealtimeEvent: () => boolean;
  mainTrigger: CloudSyncMainPullTriggerLike;
  pullTriggers: CloudSyncPullScopeMap<CloudSyncPullTriggerLike>;
  reason?: string;
  immediatePulls?: boolean;
  immediateMain?: boolean;
}): CloudSyncRealtimeScopedHandlerMap {
  const normalizedReason = String(args.reason || 'realtime').trim() || 'realtime';
  const handleRealtimeMain = (): void => {
    if (!args.markRealtimeEvent()) return;
    args.mainTrigger.trigger(
      buildCloudSyncRealtimeScopedTriggerReason(normalizedReason, 'main'),
      args.immediateMain ?? true
    );
  };
  return buildCloudSyncRealtimeScopedHandlerMap({
    handleRealtimeMain,
    pullScopeHandlers: createCloudSyncRealtimePullScopeHandlerMap({
      markRealtimeEvent: args.markRealtimeEvent,
      pullTriggers: args.pullTriggers,
      reason: args.reason,
      immediate: args.immediatePulls,
    }),
  });
}

export function invokeCloudSyncRealtimeScopedHandler(
  scope: CloudSyncRealtimeHintScope,
  handlers: CloudSyncRealtimeScopedHandlerMap
): boolean {
  if (scope === 'all') return false;
  handlers[scope]();
  return true;
}
