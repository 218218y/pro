import type {
  AppContainer,
  CloudSyncDiagFn,
  CloudSyncRuntimeStatus,
  CloudSyncSyncPinCommandResult,
} from '../../../types';

import { _cloudSyncReportNonFatal, applyCloudSyncUiPatch, buildRestoreMeta } from './cloud_sync_support.js';
import {
  readFloatingSketchSyncPinnedLocal,
  type CloudSyncSketchConfig,
  type GetCloudSyncRow,
  type StorageLike,
  type UpsertCloudSyncRow,
  writeFloatingSketchSyncPinnedLocal,
} from './cloud_sync_sketch_ops_shared.js';
import type { CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';
import type { CloudSyncAsyncFamilyFlight } from './cloud_sync_async_singleflight.js';

export type CreateCloudSyncFloatingSketchSyncOpsDeps = {
  App: AppContainer;
  cfg: CloudSyncSketchConfig;
  storage: StorageLike;
  getGateBaseRoom?: () => string;
  restUrl: string;
  clientId: string;
  getRow: GetCloudSyncRow;
  upsertRow: UpsertCloudSyncRow;
  emitRealtimeHint: CloudSyncRealtimeHintSender;
  diag: CloudSyncDiagFn;
  runtimeStatus?: CloudSyncRuntimeStatus;
  publishStatus?: () => void;
};

export type CloudSyncFloatingSketchSyncOps = {
  pushFloatingSketchSyncPinnedNow: (enabled: boolean) => Promise<CloudSyncSyncPinCommandResult>;
  pullFloatingSketchSyncPinnedOnce: (isInitial: boolean) => Promise<void>;
  getFloatingSketchSyncEnabled: () => boolean;
  setFloatingSketchSyncEnabledState: (enabled: boolean) => boolean;
  subscribeFloatingSketchSyncEnabledState: (fn: (enabled: boolean) => void) => () => void;
  dispose: () => void;
};

export type CloudSyncFloatingSketchPushKey = 'enabled' | 'disabled';

export type CloudSyncFloatingSketchSyncMutableState = {
  floatingSketchSyncEnabled: boolean;
  lastFloatingSyncUpdatedAt: string;
  floatingSketchSyncListeners: Set<(enabled: boolean) => void>;
};

export const floatingSketchSyncPushFlights = new WeakMap<
  object,
  CloudSyncAsyncFamilyFlight<CloudSyncSyncPinCommandResult, CloudSyncFloatingSketchPushKey>
>();

export function createCloudSyncFloatingSketchSyncMutableState(
  deps: Pick<CreateCloudSyncFloatingSketchSyncOpsDeps, 'App' | 'storage'>
): CloudSyncFloatingSketchSyncMutableState {
  return {
    floatingSketchSyncEnabled: readFloatingSketchSyncPinnedLocal(deps),
    lastFloatingSyncUpdatedAt: '',
    floatingSketchSyncListeners: new Set<(enabled: boolean) => void>(),
  };
}

export function setFloatingSketchSyncEnabledStateInPlace(
  state: CloudSyncFloatingSketchSyncMutableState,
  deps: Pick<CreateCloudSyncFloatingSketchSyncOpsDeps, 'App' | 'storage'>,
  enabled: boolean
): boolean {
  const { App, storage } = deps;
  const next = !!enabled;
  if (state.floatingSketchSyncEnabled === next) return false;
  state.floatingSketchSyncEnabled = next;
  writeFloatingSketchSyncPinnedLocal({ App, storage }, next);
  for (const fn of Array.from(state.floatingSketchSyncListeners)) {
    try {
      fn(state.floatingSketchSyncEnabled);
    } catch (e) {
      _cloudSyncReportNonFatal(App, 'floatingSync.listener', e, { throttleMs: 4000 });
    }
  }
  return true;
}

export function applyFloatingSketchSyncPinnedInPlace(
  state: CloudSyncFloatingSketchSyncMutableState,
  deps: Pick<CreateCloudSyncFloatingSketchSyncOpsDeps, 'App' | 'storage'>,
  enabled: boolean,
  by: string
): void {
  const { App, storage } = deps;
  try {
    writeFloatingSketchSyncPinnedLocal({ App, storage }, !!enabled);
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'floatingSync.apply.writeLocal', e, { throttleMs: 8000 });
  }
  try {
    setFloatingSketchSyncEnabledStateInPlace(state, { App, storage }, !!enabled);
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'floatingSync.apply.setState', e, { throttleMs: 8000 });
  }
  try {
    applyCloudSyncUiPatch(
      App,
      {
        floatingSyncPinned: !!enabled,
        floatingSyncPinnedBy: String(by || ''),
      },
      buildRestoreMeta(App, 'cloudSync:floatingSyncPinned')
    );
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'floatingSync.apply.uiPatch', e, { throttleMs: 8000 });
  }
}

export function subscribeFloatingSketchSyncEnabledStateInPlace(
  state: CloudSyncFloatingSketchSyncMutableState,
  App: AppContainer,
  fn: (enabled: boolean) => void
): () => void {
  try {
    state.floatingSketchSyncListeners.add(fn);
    try {
      fn(state.floatingSketchSyncEnabled);
    } catch (e) {
      _cloudSyncReportNonFatal(App, 'floatingSync.subscribe.immediate', e, { throttleMs: 4000 });
    }
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'floatingSync.subscribe', e, { throttleMs: 4000 });
  }
  return () => {
    try {
      state.floatingSketchSyncListeners.delete(fn);
    } catch (e) {
      _cloudSyncReportNonFatal(App, 'floatingSync.unsubscribe', e, { throttleMs: 4000 });
    }
  };
}

export function disposeFloatingSketchSyncMutableState(state: CloudSyncFloatingSketchSyncMutableState): void {
  state.floatingSketchSyncListeners.clear();
}
