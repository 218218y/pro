import type { ActionMetaLike, HistoryPushRequestLike, HistorySystemLike } from '../../../types';
import { asRecord } from './record.js';
import { callActionsHistory, hasActionsHistoryFn } from './history_system_access_actions.js';
import type { HistoryStatusLike, HistoryStatusListener } from './history_system_access_shared.js';
import {
  callHistorySystemMethod,
  asHistoryStatus,
  emptyHistoryStatus,
  type HistoryMetaInvoker,
  type HistoryStatusSubscribeInvoker,
  type HistoryVoidInvoker,
  isCallable,
  readHistorySystemMethod,
} from './history_system_access_shared.js';
import {
  flushHistoryPendingPushOnServiceMaybe,
  flushOrPushHistoryStateOnServiceMaybe,
  getHistorySystemFromServiceMaybe,
  pushHistoryStateOnSystemMaybe,
  scheduleHistoryPushOnServiceMaybe,
} from './history_system_access_services.js';

type HistoryStatusChangeCallback = NonNullable<HistorySystemLike['onStatusChange']>;
type WrappedHistoryStatusChangeCallback = HistoryStatusChangeCallback & {
  __wpHistoryStatusPrev?: HistoryStatusChangeCallback | undefined;
  __wpHistoryStatusWrapped?: true;
};

function isWrappedHistoryStatusChangeCallback(value: unknown): value is WrappedHistoryStatusChangeCallback {
  return typeof value === 'function' && Reflect.get(value, '__wpHistoryStatusWrapped') === true;
}

function asWrappedHistoryStatusChangeCallback(value: unknown): WrappedHistoryStatusChangeCallback | null {
  return isWrappedHistoryStatusChangeCallback(value) ? value : null;
}

function createWrappedHistoryStatusChangeCallback(
  listener: HistoryStatusListener,
  prev: HistoryStatusChangeCallback | undefined
): WrappedHistoryStatusChangeCallback {
  const wrapped = Object.assign(
    (status: unknown, meta?: ActionMetaLike) => {
      const safeStatus = asHistoryStatus(status);
      listener(safeStatus, meta);
      const prevListener = wrapped.__wpHistoryStatusPrev;
      if (typeof prevListener === 'function') {
        prevListener(safeStatus, meta);
      }
    },
    {
      __wpHistoryStatusPrev: prev,
      __wpHistoryStatusWrapped: true as const,
    }
  );
  return wrapped;
}

function unlinkWrappedHistoryStatusChangeCallback(
  hs: HistorySystemLike,
  wrapped: WrappedHistoryStatusChangeCallback
): void {
  const current = typeof hs.onStatusChange === 'function' ? hs.onStatusChange : undefined;
  if (current === wrapped) {
    hs.onStatusChange = wrapped.__wpHistoryStatusPrev;
    return;
  }

  let node = asWrappedHistoryStatusChangeCallback(current);
  while (node) {
    if (node.__wpHistoryStatusPrev === wrapped) {
      node.__wpHistoryStatusPrev = wrapped.__wpHistoryStatusPrev;
      return;
    }
    node = asWrappedHistoryStatusChangeCallback(node.__wpHistoryStatusPrev);
  }
}

export function getHistorySystemMaybe(App: unknown): HistorySystemLike | null {
  try {
    if (hasActionsHistoryFn(App, 'getSystem')) {
      const hs0 = asRecord(callActionsHistory(App, 'getSystem'));
      if (hs0) return hs0;
    }

    const hs1 = getHistorySystemFromServiceMaybe(App);
    if (hs1) return hs1;

    return null;
  } catch {
    return null;
  }
}

export function flushHistoryPendingPushMaybe(App: unknown, opts?: HistoryPushRequestLike): boolean {
  try {
    const safeOpts = asRecord(opts) || {};
    if (hasActionsHistoryFn(App, 'flushPendingPush')) {
      const out = callActionsHistory(App, 'flushPendingPush', safeOpts);
      return out === false ? false : true;
    }
    return flushHistoryPendingPushOnServiceMaybe(App, safeOpts);
  } catch {
    return false;
  }
}

export function scheduleHistoryPushMaybe(App: unknown, meta?: ActionMetaLike): boolean {
  try {
    const safeMeta = asRecord(meta) || {};
    if (hasActionsHistoryFn(App, 'schedulePush')) {
      const out = callActionsHistory(App, 'schedulePush', safeMeta);
      return out === false ? false : true;
    }
    return scheduleHistoryPushOnServiceMaybe(App, safeMeta);
  } catch {
    return false;
  }
}

export function pushHistoryStateMaybe(App: unknown, opts?: HistoryPushRequestLike): boolean {
  try {
    const safeOpts = asRecord(opts) || {};
    if (hasActionsHistoryFn(App, 'pushState')) {
      const out = callActionsHistory(App, 'pushState', safeOpts);
      return out === false ? false : true;
    }
    return pushHistoryStateOnSystemMaybe(App, safeOpts);
  } catch {
    return false;
  }
}

export function resetHistoryBaselineMaybe(App: unknown, meta?: ActionMetaLike): boolean {
  try {
    const hs = getHistorySystemMaybe(App);
    if (!hs) return false;
    const resetBaseline = readHistorySystemMethod<HistoryMetaInvoker>(hs, 'resetBaseline');
    if (!resetBaseline) return false;
    Reflect.apply(resetBaseline, hs, [asRecord(meta) || {}]);
    return true;
  } catch {
    return false;
  }
}

export function resetHistoryBaselineOrThrow(
  App: unknown,
  meta?: ActionMetaLike,
  label = 'history.resetBaseline'
): void {
  const hs = getHistorySystemMaybe(App);
  if (!hs) return;
  const resetBaseline = readHistorySystemMethod<HistoryMetaInvoker>(hs, 'resetBaseline');
  if (!resetBaseline) {
    throw new Error(`[WardrobePro] ${label} requires history.system.resetBaseline(meta).`);
  }
  Reflect.apply(resetBaseline, hs, [asRecord(meta) || {}]);
}

export function resetHistoryBaselineRequiredOrThrow(
  App: unknown,
  meta?: ActionMetaLike,
  label = 'history.resetBaseline'
): void {
  const hs = getHistorySystemMaybe(App);
  if (!hs) {
    throw new Error(`[WardrobePro] ${label} requires a canonical history system.`);
  }
  const resetBaseline = readHistorySystemMethod<HistoryMetaInvoker>(hs, 'resetBaseline');
  if (!resetBaseline) {
    throw new Error(`[WardrobePro] ${label} requires history.system.resetBaseline(meta).`);
  }
  Reflect.apply(resetBaseline, hs, [asRecord(meta) || {}]);
}

export function flushOrPushHistoryStateMaybe(App: unknown, opts?: HistoryPushRequestLike): boolean {
  try {
    const safeOpts = asRecord(opts) || {};
    if (hasActionsHistoryFn(App, 'flushOrPush')) {
      const out = callActionsHistory(App, 'flushOrPush', safeOpts);
      return out === false ? false : true;
    }
    return flushOrPushHistoryStateOnServiceMaybe(App, safeOpts);
  } catch {
    return false;
  }
}

export function getHistoryStatusMaybe(App: unknown): HistoryStatusLike {
  try {
    const hs = getHistorySystemMaybe(App);
    if (!hs) return emptyHistoryStatus();
    const getStatus = readHistorySystemMethod<HistoryVoidInvoker>(hs, 'getStatus');
    if (!getStatus) return asHistoryStatus(hs);
    return asHistoryStatus(Reflect.apply(getStatus, hs, []));
  } catch {
    return emptyHistoryStatus();
  }
}

export function subscribeHistoryStatusMaybe(App: unknown, listener: HistoryStatusListener): () => void {
  if (typeof listener !== 'function') return () => undefined;
  try {
    const hs = getHistorySystemMaybe(App);
    if (!hs) return () => undefined;

    const subscribe = readHistorySystemMethod<HistoryStatusSubscribeInvoker>(hs, 'subscribeStatus');
    if (subscribe) {
      const unsubscribe = Reflect.apply(subscribe, hs, [
        (status: unknown, meta?: ActionMetaLike) => {
          listener(asHistoryStatus(status), meta);
        },
      ]);
      return isCallable<() => void>(unsubscribe) ? unsubscribe : () => undefined;
    }

    const prev = typeof hs.onStatusChange === 'function' ? hs.onStatusChange : undefined;
    const wrapped = createWrappedHistoryStatusChangeCallback(listener, prev);
    hs.onStatusChange = wrapped;
    return () => {
      try {
        unlinkWrappedHistoryStatusChangeCallback(hs, wrapped);
      } catch {
        // ignore cleanup failures
      }
    };
  } catch {
    return () => undefined;
  }
}

export function runHistoryUndoMaybe(App: unknown): boolean {
  return callHistorySystemMethod(getHistorySystemMaybe(App), 'undo');
}

export function runHistoryRedoMaybe(App: unknown): boolean {
  return callHistorySystemMethod(getHistorySystemMaybe(App), 'redo');
}
