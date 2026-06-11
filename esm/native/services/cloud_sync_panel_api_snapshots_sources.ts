import type { CloudSyncSite2TabsGateSnapshot } from '../../../types';

import { buildSite2TabsGateFallbackScheduleKey } from './cloud_sync_panel_api_snapshots_shared.js';
import type { CloudSyncPanelSnapshotRuntimeContext } from './cloud_sync_panel_api_snapshots_runtime_shared.js';

export function disposeFloatingPanelSourceSubscription(context: CloudSyncPanelSnapshotRuntimeContext): void {
  const { deps, state, panelApiOp } = context;
  if (typeof state.disposeFloatingPanelSource !== 'function') {
    state.disposeFloatingPanelSource = null;
    return;
  }
  const dispose = state.disposeFloatingPanelSource;
  state.disposeFloatingPanelSource = null;
  try {
    dispose();
  } catch (__wpErr) {
    deps.reportNonFatal(deps.App, panelApiOp('panelSnapshotSourceDispose'), __wpErr, { throttleMs: 4000 });
  }
}

export function ensureFloatingPanelSourceSubscription(context: CloudSyncPanelSnapshotRuntimeContext): void {
  const { deps, state, panelApiOp } = context;
  if (typeof state.disposeFloatingPanelSource === 'function') return;
  try {
    state.disposeFloatingPanelSource = deps.subscribeFloatingSketchSyncEnabledState(() => {
      context.publishPanelSnapshot();
    });
  } catch (__wpErr) {
    deps.reportNonFatal(deps.App, panelApiOp('panelSnapshotSourceSubscribe'), __wpErr, { throttleMs: 4000 });
    state.disposeFloatingPanelSource = null;
  }
}

export function disposeSite2TabsGateSourceSubscription(context: CloudSyncPanelSnapshotRuntimeContext): void {
  const { deps, state, panelApiOp } = context;
  if (typeof state.disposeSite2TabsGateSource !== 'function') {
    state.disposeSite2TabsGateSource = null;
    return;
  }
  const dispose = state.disposeSite2TabsGateSource;
  state.disposeSite2TabsGateSource = null;
  try {
    dispose();
  } catch (__wpErr) {
    deps.reportNonFatal(deps.App, panelApiOp('tabsGateSnapshotSourceDispose'), __wpErr, { throttleMs: 4000 });
  }
}

export function ensureSite2TabsGateSourceSubscription(context: CloudSyncPanelSnapshotRuntimeContext): void {
  const { deps, state, panelApiOp } = context;
  if (!context.hasSite2TabsGateSource) return;
  if (typeof state.disposeSite2TabsGateSource === 'function') return;
  try {
    const dispose = deps.subscribeSite2TabsGateSnapshot?.(() => {
      context.publishSite2TabsGateSnapshot();
    });
    state.disposeSite2TabsGateSource = typeof dispose === 'function' ? dispose : null;
  } catch (__wpErr) {
    deps.reportNonFatal(deps.App, panelApiOp('tabsGateSnapshotSourceSubscribe'), __wpErr, {
      throttleMs: 4000,
    });
    state.disposeSite2TabsGateSource = null;
  }
}

export function clearSite2TabsGateFallbackTimer(context: CloudSyncPanelSnapshotRuntimeContext): void {
  const { deps, state, panelApiOp } = context;
  try {
    if (state.site2TabsGateFallbackTimer) {
      deps.clearTimeoutFn(state.site2TabsGateFallbackTimer);
      state.site2TabsGateFallbackTimer = null;
    }
    state.site2TabsGateFallbackScheduleKey = '';
  } catch (__wpErr) {
    deps.reportNonFatal(deps.App, panelApiOp('tabsGateFallbackTimerClear'), __wpErr, { throttleMs: 4000 });
    state.site2TabsGateFallbackTimer = null;
    state.site2TabsGateFallbackScheduleKey = '';
  }
}

export function scheduleSite2TabsGateFallbackTick(
  context: CloudSyncPanelSnapshotRuntimeContext,
  snapshot: CloudSyncSite2TabsGateSnapshot
): void {
  const { deps, state } = context;
  if (context.hasSite2TabsGateSource) {
    clearSite2TabsGateFallbackTimer(context);
    return;
  }
  if (!state.site2TabsGateSnapshotListeners.size || !snapshot.open || !snapshot.until) {
    clearSite2TabsGateFallbackTimer(context);
    return;
  }
  const remainingMs = snapshot.until - deps.now();
  if (remainingMs <= 0) {
    clearSite2TabsGateFallbackTimer(context);
    return;
  }
  const minutesLeft = snapshot.minutesLeft > 0 ? snapshot.minutesLeft : 1;
  const scheduleKey = buildSite2TabsGateFallbackScheduleKey({ ...snapshot, minutesLeft });
  if (state.site2TabsGateFallbackTimer && state.site2TabsGateFallbackScheduleKey === scheduleKey) return;
  clearSite2TabsGateFallbackTimer(context);
  const nextBoundaryMs = minutesLeft > 1 ? remainingMs - (minutesLeft - 1) * 60000 : remainingMs;
  const delay = Math.max(50, Math.min(Math.ceil(nextBoundaryMs) + 50, 0x7fffffff));
  state.site2TabsGateFallbackScheduleKey = scheduleKey;
  state.site2TabsGateFallbackTimer = deps.setTimeoutFn(() => {
    state.site2TabsGateFallbackTimer = null;
    state.site2TabsGateFallbackScheduleKey = '';
    context.publishSite2TabsGateSnapshot();
  }, delay);
}
