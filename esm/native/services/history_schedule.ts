import type { ActionMetaLike, AppContainer, HistoryPushRequestLike } from '../../../types';
import {
  clearHistoryTimer,
  ensureHistoryRuntimeState,
  getHistorySystem,
  isRestoring,
  normalizePendingAction,
} from './history_shared.js';
import { getBrowserTimers } from '../runtime/api.js';
import { pushNow } from './history_runtime.js';

export { hasPendingPush } from './history_shared.js';

export function cancelPendingPush(App: AppContainer): void {
  const state = ensureHistoryRuntimeState(App);
  if (!state) return;
  clearHistoryTimer(App, state);
  state.pendingAction = null;
}

export function flushPendingPush(App: AppContainer, opts?: HistoryPushRequestLike): void {
  const safeOpts = opts && typeof opts === 'object' ? opts : {};
  const state = ensureHistoryRuntimeState(App);
  if (!state) return;

  const pending = normalizePendingAction(state.pendingAction);
  const hadPending = state.timer != null || pending != null;
  cancelPendingPush(App);
  if (!hadPending) return;
  if (safeOpts.noPush === true) return;

  const merged = pending ? Object.assign({}, pending, safeOpts) : safeOpts;
  pushNow(App, merged);
}

export function schedulePush(App: AppContainer, action?: ActionMetaLike): void {
  const safeAction = action && typeof action === 'object' ? action : {};
  if (safeAction.noHistory === true || safeAction.silent === true) return;
  if (isRestoring(App)) return;

  const HS = getHistorySystem(App);
  if (!HS || typeof HS.pushState !== 'function') return;
  if (HS.isPaused) return;

  const state = ensureHistoryRuntimeState(App);
  if (!state) return;

  clearHistoryTimer(App, state);

  state.pendingAction = normalizePendingAction(safeAction);

  if (safeAction.immediate === true) {
    const pending = normalizePendingAction(state.pendingAction) || safeAction;
    state.pendingAction = null;
    state.gen += 1;
    pushNow(App, pending);
    return;
  }

  const timers = getBrowserTimers(App);
  const gen = ++state.gen;
  state.timer = timers.setTimeout(() => {
    state.timer = null;
    if (gen !== state.gen) return;
    const pending = normalizePendingAction(state.pendingAction) || safeAction;
    state.pendingAction = null;
    pushNow(App, pending);
  }, 220);
}
