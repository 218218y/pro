import type { ActionMetaLike, HistoryPushRequestLike } from '../../../types';

import {
  flushOrPushHistoryStateOnServiceMaybe,
  flushHistoryPendingPushOnServiceMaybe,
  getHistorySystemFromServiceMaybe,
  pushHistoryStateOnSystemMaybe,
  scheduleHistoryPushOnServiceMaybe,
  setHistorySystemOnService,
} from '../runtime/history_system_access.js';

import type { StateApiHistoryMetaReactivityContext } from './state_api_history_meta_reactivity_contracts.js';

export function installStateApiHistoryNamespace(ctx: StateApiHistoryMetaReactivityContext): void {
  const { A, historyNs, asObj, safeCall } = ctx;

  if (typeof historyNs.getSystem !== 'function') {
    historyNs.getSystem = function getSystem() {
      return getHistorySystemFromServiceMaybe(A);
    };
  }

  if (typeof historyNs.setSystem !== 'function') {
    historyNs.setSystem = function setSystem(system: unknown) {
      const hs = asObj<Parameters<typeof setHistorySystemOnService>[1]>(system);
      if (!hs) return null;
      return setHistorySystemOnService(A, hs);
    };
  }

  if (typeof historyNs.batch !== 'function') {
    historyNs.batch = function batch(fn: () => unknown, meta?: ActionMetaLike) {
      const m = asObj(meta) || {};
      if (m.noHistory === true || m.silent === true) return typeof fn === 'function' ? fn() : undefined;

      const hs = asObj(safeCall(() => getHistorySystemFromServiceMaybe(A)));
      const pause = hs ? hs['pause'] : null;
      const resume = hs ? hs['resume'] : null;

      let didPause = false;
      try {
        if (hs && typeof pause === 'function') {
          pause.call(hs);
          didPause = true;
        }
      } catch (_e) {}

      try {
        return typeof fn === 'function' ? fn() : undefined;
      } finally {
        try {
          if (didPause && hs && typeof resume === 'function') resume.call(hs);
        } catch (_e) {}
        try {
          scheduleHistoryPushOnServiceMaybe(A, m);
        } catch (_e) {}
      }
    };
  }

  if (typeof historyNs.flushPendingPush !== 'function') {
    historyNs.flushPendingPush = function flushPendingPush(opts?: HistoryPushRequestLike) {
      const safeOpts = asObj(opts) || {};
      return safeCall(() => flushHistoryPendingPushOnServiceMaybe(A, safeOpts));
    };
  }

  if (typeof historyNs.schedulePush !== 'function') {
    historyNs.schedulePush = function schedulePush(meta?: ActionMetaLike) {
      const safeMeta = asObj(meta) || {};
      return safeCall(() => scheduleHistoryPushOnServiceMaybe(A, safeMeta));
    };
  }

  if (typeof historyNs.pushState !== 'function') {
    historyNs.pushState = function pushState(opts?: HistoryPushRequestLike) {
      const safeOpts = asObj(opts) || {};
      return safeCall(() => pushHistoryStateOnSystemMaybe(A, safeOpts));
    };
  }

  if (typeof historyNs.flushOrPush !== 'function') {
    historyNs.flushOrPush = function flushOrPush(opts?: HistoryPushRequestLike) {
      const safeOpts = asObj(opts) || {};
      return safeCall(() => flushOrPushHistoryStateOnServiceMaybe(A, safeOpts));
    };
  }
}
