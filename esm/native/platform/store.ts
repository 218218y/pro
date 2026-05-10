// Store implementation (framework-free public API, Zustand backend).
// Stage 3 (Zustand migration): backend swap under the same store contract.
//
// Design goals:
// - Keep the existing StoreLike surface (getState/patch/subscribe + helpers)
// - Canonical write path: store.patch(payload, meta) (no dispatch envelopes)
// - Avoid hybrid write paths inside the store backend (single backend = Zustand)
// - Preserve actionMeta-aware subscriptions used by platform/slice wrappers

import { createStore as createZustandVanillaStore } from 'zustand/vanilla';
import type { StoreApi as ZustandStoreApi } from 'zustand/vanilla';

import type {
  ActionEnvelope,
  ActionMetaLike,
  RootStateLike,
  StoreLike,
  StoreDebugStats,
} from '../../../types';
import {
  asRecordOrEmpty,
  cloneDebugSources,
  createEmptyDebugState,
  ensureRootState,
  isObj,
  objectIs,
  type StoreDebugState,
  type UnknownRecord,
} from './store_shared.js';
import { createStoreCommitPipeline } from './store_commit_pipeline.js';
import {
  createListenerRegistry,
  createSelectorRegistryEntry,
  type SelectorRegistryEntry,
  type StoreListener,
  type StoreSelector,
  type StoreSelectorEqualityFn,
  type StoreSelectorListener,
  type StoreSelectorOpts,
} from './store_subscriptions.js';

type StoreCreateOpts = {
  initialState?: Partial<RootStateLike> | UnknownRecord;
  getNoneMode?: () => string;

  // Debug/diagnostics (opt-in): trace slow patch commits.
  // This is intentionally store-local so it works in tests/tooling as well.
  tracePatches?: boolean;
  tracePatchThresholdMs?: number;
} & UnknownRecord;

type ZustandRootApi = ZustandStoreApi<RootStateLike>;

type StoreCreateResult = StoreLike<RootStateLike> & {
  getAction: () => ActionEnvelope<string, unknown> | null;
  getDebugStats: () => StoreDebugStats;
  resetDebugStats: () => void;
  __backend: 'zustand';
  __zustand: ZustandRootApi;
};

export function createStore(opts: StoreCreateOpts = {}): StoreCreateResult {
  const storeOpts: StoreCreateOpts = isObj(opts) ? { ...opts } : {};

  const initialState = asRecordOrEmpty(storeOpts.initialState);
  const getNoneMode: () => string =
    typeof storeOpts.getNoneMode === 'function'
      ? storeOpts.getNoneMode
      : function () {
          return 'none';
        };

  const tracePatches = !!storeOpts.tracePatches;
  const tracePatchThresholdMs =
    typeof storeOpts.tracePatchThresholdMs === 'number' && Number.isFinite(storeOpts.tracePatchThresholdMs)
      ? Math.max(0, storeOpts.tracePatchThresholdMs)
      : 12;

  const zustandApi: ZustandRootApi = createZustandVanillaStore<RootStateLike>(function init() {
    return ensureRootState(initialState, getNoneMode);
  });

  const listeners = createListenerRegistry<StoreListener>();
  const selectorListeners = createListenerRegistry<SelectorRegistryEntry>();
  const debugState: StoreDebugState = createEmptyDebugState();
  let lastActionEnvelope: ActionEnvelope<string, unknown> | null = null;

  function getState() {
    return zustandApi.getState();
  }

  function getAction(): ActionEnvelope<string, unknown> | null {
    return lastActionEnvelope;
  }

  function getDebugStats(): StoreDebugStats {
    return {
      commitCount: debugState.commitCount,
      noopSkipCount: debugState.noopSkipCount,
      selectorListenerCount: debugState.selectorListenerCount,
      selectorNotifyCount: debugState.selectorNotifyCount,
      sources: cloneDebugSources(debugState.sources),
    };
  }

  function resetDebugStats(): void {
    debugState.commitCount = 0;
    debugState.noopSkipCount = 0;
    debugState.selectorNotifyCount = 0;
    debugState.sources = {};
  }

  function notify(actionMeta?: ActionMetaLike): void {
    const current = zustandApi.getState();
    listeners.forEach(function callListener(listener) {
      try {
        listener(current, actionMeta);
      } catch {
        // ignore listener errors
      }
    });
  }

  function subscribeState(cb: () => void): () => void {
    if (typeof cb !== 'function') return function () {};
    return zustandApi.subscribe(function onAnyStateChange() {
      try {
        cb();
      } catch {
        // ignore listener errors
      }
    });
  }

  function notifySelectorSubscribers(actionMeta?: ActionMetaLike): void {
    const current = zustandApi.getState();
    selectorListeners.forEach(function callSelectorListener(entry) {
      if (!entry || typeof entry.notify !== 'function') return;
      entry.notify(current, actionMeta);
    });
  }

  function subscribeSelector<T>(
    selector: StoreSelector<T>,
    fn: StoreSelectorListener<T>,
    opts3: StoreSelectorOpts<T> = {}
  ): () => void {
    if (typeof selector !== 'function' || typeof fn !== 'function') return function () {};

    const equalityFn: StoreSelectorEqualityFn<T> =
      typeof opts3.equalityFn === 'function' ? opts3.equalityFn : objectIs;

    const entry = createSelectorRegistryEntry({
      selector,
      listener: fn,
      equalityFn,
      onNotify() {
        debugState.selectorNotifyCount += 1;
      },
    });

    entry.prime(zustandApi.getState());

    const unsub = selectorListeners.add(entry);
    debugState.selectorListenerCount += 1;

    if (opts3.fireImmediately) entry.fireCurrent(undefined);

    return function unsubscribeSelector() {
      if (debugState.selectorListenerCount > 0) debugState.selectorListenerCount -= 1;
      unsub();
    };
  }

  function subscribeMeta(fn: StoreListener) {
    if (typeof fn !== 'function') return function () {};
    return listeners.add(fn);
  }

  const subscribe = subscribeMeta;

  const commits = createStoreCommitPipeline({
    zustandApi,
    getNoneMode,
    tracePatches,
    tracePatchThresholdMs,
    debugState,
    notify,
    notifySelectorSubscribers,
    setLastActionEnvelope(action) {
      lastActionEnvelope = action;
    },
  });

  return {
    getState,
    patch: commits.patch,
    setRoot: commits.setRoot,
    subscribe,
    subscribeState,
    subscribeSelector,
    subscribeMeta,
    setMode: commits.setMode,
    setRuntime: commits.setRuntime,
    setMeta: commits.setMeta,
    setDirty: commits.setDirty,
    setUi: commits.setUi,
    setConfig: commits.setConfig,
    setModePatch: commits.setModePatch,
    getAction,
    getDebugStats,
    resetDebugStats,
    __backend: 'zustand',
    __zustand: zustandApi,
  };
}
