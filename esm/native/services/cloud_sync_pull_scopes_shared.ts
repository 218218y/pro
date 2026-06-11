import type { CloudSyncRealtimeHintScope } from '../../../types';

export const CLOUD_SYNC_PULL_SCOPE_ORDER = ['sketch', 'tabsGate', 'floatingSync'] satisfies readonly [
  'sketch',
  'tabsGate',
  'floatingSync',
];

export type CloudSyncPullScope = (typeof CLOUD_SYNC_PULL_SCOPE_ORDER)[number];
export type CloudSyncPullScopeMap<T> = Record<CloudSyncPullScope, T>;

export type CloudSyncPullScopeSpec = {
  debounceMs: number;
  minGapMs: number;
  maxDelayMs: number;
  includeInControlPull: boolean;
};

export const CLOUD_SYNC_PULL_SCOPE_SPECS: CloudSyncPullScopeMap<CloudSyncPullScopeSpec> = {
  sketch: {
    debounceMs: 120,
    minGapMs: 280,
    maxDelayMs: 900,
    includeInControlPull: false,
  },
  tabsGate: {
    debounceMs: 90,
    minGapMs: 220,
    maxDelayMs: 700,
    includeInControlPull: true,
  },
  floatingSync: {
    debounceMs: 90,
    minGapMs: 220,
    maxDelayMs: 700,
    includeInControlPull: true,
  },
};

export const CLOUD_SYNC_REALTIME_SCOPE_ORDER = ['main', ...CLOUD_SYNC_PULL_SCOPE_ORDER] satisfies readonly [
  'main',
  ...typeof CLOUD_SYNC_PULL_SCOPE_ORDER,
];

export type CloudSyncRealtimeScopedHandlerScope = (typeof CLOUD_SYNC_REALTIME_SCOPE_ORDER)[number];
export type CloudSyncRealtimeScopedValueMap<T> = Record<CloudSyncRealtimeScopedHandlerScope, T>;
export type CloudSyncRealtimeScopedHandlerMap = CloudSyncRealtimeScopedValueMap<() => void>;
export type CloudSyncRealtimeHintSender = (scope: CloudSyncRealtimeHintScope, rowName?: string) => void;
export type CloudSyncPullScopeRunner = () => Promise<void> | void;
export type CloudSyncPullScopeCancelable = { cancel: () => void };
export type CloudSyncPullTriggerLike = { trigger: (reason: string, immediate?: boolean) => void };
export type CloudSyncPullAllTriggerLike = CloudSyncPullTriggerLike;
export type CloudSyncPullAllTriggerMap = CloudSyncRealtimeScopedValueMap<CloudSyncPullAllTriggerLike>;
export type CloudSyncMainPullTriggerLike = CloudSyncPullTriggerLike;

export function createCloudSyncPullScopeMap<T>(
  factory: (scope: CloudSyncPullScope, spec: CloudSyncPullScopeSpec) => T
): CloudSyncPullScopeMap<T> {
  return {
    sketch: factory('sketch', CLOUD_SYNC_PULL_SCOPE_SPECS.sketch),
    tabsGate: factory('tabsGate', CLOUD_SYNC_PULL_SCOPE_SPECS.tabsGate),
    floatingSync: factory('floatingSync', CLOUD_SYNC_PULL_SCOPE_SPECS.floatingSync),
  };
}

export function forEachCloudSyncTriggeredPullScope(
  includeControls: boolean,
  handler: (scope: CloudSyncPullScope, spec: CloudSyncPullScopeSpec) => void
): void {
  for (const scope of CLOUD_SYNC_PULL_SCOPE_ORDER) {
    const spec = CLOUD_SYNC_PULL_SCOPE_SPECS[scope];
    if (!includeControls && spec.includeInControlPull) continue;
    handler(scope, spec);
  }
}

export function forEachCloudSyncRealtimeScopedHandlerScope(
  handler: (scope: CloudSyncRealtimeScopedHandlerScope) => void
): void {
  for (const scope of CLOUD_SYNC_REALTIME_SCOPE_ORDER) handler(scope);
}

export function createCloudSyncRealtimeScopedValueMap<T>(
  factory: (scope: CloudSyncRealtimeScopedHandlerScope) => T
): CloudSyncRealtimeScopedValueMap<T> {
  return {
    main: factory('main'),
    sketch: factory('sketch'),
    tabsGate: factory('tabsGate'),
    floatingSync: factory('floatingSync'),
  };
}

export function normalizeCloudSyncPullScopeLabel(value: unknown): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return 'pull';
  const scope = normalizeCloudSyncRealtimeHintScope(trimmed);
  if (scope === 'all') return 'pull';
  return scope || trimmed;
}

export function normalizeCloudSyncRealtimeHintRowName(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildCloudSyncPullTriggerReason(baseReason: string, scope: CloudSyncPullScope): string {
  return buildCloudSyncRealtimeScopedTriggerReason(baseReason, scope);
}

export function buildCloudSyncRealtimeScopedTriggerReason(
  baseReason: string,
  scope: CloudSyncRealtimeScopedHandlerScope
): string {
  const normalizedBaseReason = String(baseReason || 'pullAllNow').trim() || 'pullAllNow';
  return `${normalizedBaseReason}.${scope}`;
}

export function normalizeCloudSyncRealtimeHintScope(value: unknown): CloudSyncRealtimeHintScope | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw === 'all') return 'all';
  for (const scope of CLOUD_SYNC_REALTIME_SCOPE_ORDER) {
    if (raw === scope) return scope;
  }
  return null;
}
