import type { BuildStateLike, TimeoutHandleLike, UnknownRecord } from '../../../types';

import { scheduleAutosaveViaService } from '../runtime/autosave_access.js';
import { getBrowserTimers } from '../runtime/api.js';
import { hasLiveHandle } from '../runtime/install_idempotency_patterns.js';

import type { StateApiHistoryMetaReactivityContext } from './state_api_history_meta_reactivity_contracts.js';
import { readKernelBuilderRequestForce, requestKernelBuilderBuild } from './kernel_builder_request_policy.js';
import { mergeStateApiDelayedBuildMeta } from './state_api_history_store_reactivity_build_meta.js';

export function installStateApiStoreReactivityRuntime(ctx: StateApiHistoryMetaReactivityContext): void {
  const { A, store, storeNs, historyNs, asObj } = ctx;

  if (typeof storeNs.installReactivity !== 'function') {
    storeNs.installReactivity = function installReactivity() {
      if (hasLiveHandle(storeNs, '__unsubStore')) return true;

      const sub = typeof store.subscribe === 'function' ? store.subscribe : null;
      if (typeof sub !== 'function') return false;

      const getState = store.getState;
      if (typeof getState !== 'function') return false;

      let lastVersion = -1;
      let buildTimer: TimeoutHandleLike | null = null;
      let pendingBuildMeta: UnknownRecord | null = null;

      const timers = getBrowserTimers(A);

      const clearPendingBuildTimer = (): void => {
        if (!buildTimer) return;
        try {
          timers.clearTimeout(buildTimer);
        } catch (_e) {}
        buildTimer = null;
      };

      const clearPendingBuild = (): void => {
        clearPendingBuildTimer();
        pendingBuildMeta = null;
      };

      const takePendingBuildMeta = (clearTimer = true): UnknownRecord | null => {
        const nextMeta = pendingBuildMeta;
        if (clearTimer) clearPendingBuildTimer();
        pendingBuildMeta = null;
        return nextMeta;
      };

      let unsub: (() => void) | null = null;

      const disposeStoreReactivity = (): void => {
        clearPendingBuild();
        try {
          unsub?.();
        } catch (_e) {
          // ignore unsubscriber cleanup failures
        }
        unsub = null;
        storeNs['__unsubStore'] = null;
      };

      const scheduleDelayedBuild = (metaAny: UnknownRecord | null): void => {
        pendingBuildMeta = mergeStateApiDelayedBuildMeta(pendingBuildMeta, metaAny);
        if (buildTimer) return;
        buildTimer = timers.setTimeout(() => {
          const nextMeta = takePendingBuildMeta(false);
          buildTimer = null;
          requestKernelBuilderBuild(A, nextMeta, { source: 'store', immediate: false });
        }, 45);
      };

      const scheduleAutosave = (metaAny: UnknownRecord | null): void => {
        if (metaAny && (metaAny.silent || metaAny.noAutosave || metaAny.noPersist)) return;
        try {
          scheduleAutosaveViaService(A);
        } catch (_e) {}
      };

      const isRestoringNow = (stateAny: BuildStateLike): boolean => {
        try {
          const rt = asObj(stateAny.runtime);
          return !!(rt && rt.restoring === true);
        } catch (_e) {}
        return false;
      };

      unsub = sub.call(store, function onStoreCommit(st: unknown, actMeta: unknown) {
        try {
          const stateAny = asObj<BuildStateLike>(st) || {};
          const metaSlice = asObj(stateAny.meta) || {};
          const vParsed =
            typeof metaSlice.version === 'number'
              ? metaSlice.version
              : parseInt(String(metaSlice.version ?? ''), 10);
          const v = Number.isFinite(vParsed) ? vParsed | 0 : null;
          if (v != null) {
            if (v === lastVersion) return;
            lastVersion = v;
          }

          const a0 = asObj(actMeta) || asObj(metaSlice.lastAction) || null;
          const forceBuild = readKernelBuilderRequestForce(a0);
          if (isRestoringNow(stateAny) && !forceBuild) {
            clearPendingBuild();
            return;
          }

          scheduleAutosave(a0);
          try {
            historyNs.schedulePush?.(a0 || {});
          } catch (_e) {}

          const suppressBuild = !!(a0 && (a0.silent || (a0.noBuild && !forceBuild)));
          if (suppressBuild) return;

          const immediate = !!(a0 && a0.immediate);
          if (immediate) {
            const pendingMeta = takePendingBuildMeta();
            const nextImmediateMeta = mergeStateApiDelayedBuildMeta(pendingMeta, a0);
            requestKernelBuilderBuild(A, nextImmediateMeta, { source: 'store', immediate: true });
            return;
          }

          scheduleDelayedBuild(a0);
        } catch (_e) {
          // Best-effort: never break store commits.
        }
      });

      storeNs['__unsubStore'] = function unsubscribeStoreReactivity() {
        disposeStoreReactivity();
      };

      return true;
    };
  }

  if (typeof storeNs.hasReactivityInstalled !== 'function') {
    storeNs.hasReactivityInstalled = function hasReactivityInstalled() {
      return hasLiveHandle(storeNs, '__unsubStore');
    };
  }
}
