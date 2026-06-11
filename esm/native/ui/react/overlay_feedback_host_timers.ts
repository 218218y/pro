import type { AppContainer } from '../../../../types';

import { getBrowserTimers } from '../../services/api.js';

export type OverlayFeedbackTimeoutHandle = ReturnType<ReturnType<typeof getBrowserTimers>['setTimeout']>;
export type OverlayFeedbackAnimationHandle = ReturnType<
  ReturnType<typeof getBrowserTimers>['requestAnimationFrame']
>;

export type OverlayFeedbackToastTimerState = {
  token: number;
  showHandle: OverlayFeedbackTimeoutHandle | null;
  hideHandle: OverlayFeedbackTimeoutHandle | null;
  removeHandle: OverlayFeedbackTimeoutHandle | null;
};

export type OverlayFeedbackPromptFocusTimerState = {
  token: number;
  animationHandle: OverlayFeedbackAnimationHandle | null;
  immediateHandle: OverlayFeedbackTimeoutHandle | null;
  fallbackHandle: OverlayFeedbackTimeoutHandle | null;
};

export function createOverlayFeedbackToastTimerState(): OverlayFeedbackToastTimerState {
  return {
    token: 0,
    showHandle: null,
    hideHandle: null,
    removeHandle: null,
  };
}

export function createOverlayFeedbackPromptFocusTimerState(): OverlayFeedbackPromptFocusTimerState {
  return {
    token: 0,
    animationHandle: null,
    immediateHandle: null,
    fallbackHandle: null,
  };
}

function clearTimeoutHandle(
  App: AppContainer,
  handle: OverlayFeedbackTimeoutHandle | null | undefined
): void {
  if (handle == null) return;
  try {
    getBrowserTimers(App).clearTimeout(handle);
  } catch {
    // ignore
  }
}

export function clearOverlayFeedbackToastTimers(
  App: AppContainer,
  state: OverlayFeedbackToastTimerState
): void {
  state.token += 1;
  clearTimeoutHandle(App, state.showHandle);
  clearTimeoutHandle(App, state.hideHandle);
  clearTimeoutHandle(App, state.removeHandle);
  state.showHandle = null;
  state.hideHandle = null;
  state.removeHandle = null;
}

export function scheduleOverlayFeedbackToastTimers(args: {
  App: AppContainer;
  state: OverlayFeedbackToastTimerState;
  itemId: number;
  setShown: (shown: boolean) => void;
  onRemove: (id: number) => void;
  report: (op: string, err: unknown) => void;
  showDelayMs?: number;
  hideDelayMs?: number;
  removeDelayMs?: number;
}): void {
  const {
    App,
    state,
    itemId,
    setShown,
    onRemove,
    report,
    showDelayMs = 10,
    hideDelayMs = 3000,
    removeDelayMs = 320,
  } = args;

  clearOverlayFeedbackToastTimers(App, state);

  const token = state.token;
  const timers = getBrowserTimers(App);

  const showHandle = timers.setTimeout(() => {
    if (state.token !== token || state.showHandle !== showHandle) return;
    state.showHandle = null;
    try {
      setShown(true);
    } catch (err) {
      report('feedback-host:toast-show', err);
    }
  }, showDelayMs);
  state.showHandle = showHandle;

  const hideHandle = timers.setTimeout(() => {
    if (state.token !== token || state.hideHandle !== hideHandle) return;
    state.hideHandle = null;
    try {
      setShown(false);
    } catch (err) {
      report('feedback-host:toast-hide', err);
    }

    const removeHandle = timers.setTimeout(() => {
      if (state.token !== token || state.removeHandle !== removeHandle) return;
      state.removeHandle = null;
      onRemove(itemId);
    }, removeDelayMs);

    state.removeHandle = removeHandle;
  }, hideDelayMs);
  state.hideHandle = hideHandle;
}

export function clearOverlayFeedbackPromptFocusTimers(
  App: AppContainer,
  state: OverlayFeedbackPromptFocusTimerState
): void {
  state.token += 1;

  const timers = getBrowserTimers(App);

  if (state.animationHandle != null) {
    try {
      timers.cancelAnimationFrame(state.animationHandle);
    } catch {
      // ignore
    }
  }

  clearTimeoutHandle(App, state.immediateHandle);
  clearTimeoutHandle(App, state.fallbackHandle);
  state.animationHandle = null;
  state.immediateHandle = null;
  state.fallbackHandle = null;
}

export function scheduleOverlayFeedbackPromptFocusTimers(args: {
  App: AppContainer;
  state: OverlayFeedbackPromptFocusTimerState;
  report: (op: string, err: unknown) => void;
  scheduleAnimationFrame: (focusAndSelect: () => void) => OverlayFeedbackAnimationHandle | null;
  runFocusAndSelect: () => void;
  immediateDelayMs?: number;
  fallbackDelayMs?: number;
}): void {
  const {
    App,
    state,
    report,
    scheduleAnimationFrame,
    runFocusAndSelect,
    immediateDelayMs = 0,
    fallbackDelayMs = 60,
  } = args;

  clearOverlayFeedbackPromptFocusTimers(App, state);

  const token = state.token;
  const timers = getBrowserTimers(App);

  const runFocus = () => {
    if (state.token !== token) return;
    runFocusAndSelect();
  };

  try {
    state.animationHandle = scheduleAnimationFrame(() => {
      if (state.token !== token) return;
      state.animationHandle = null;
      runFocus();
    });
  } catch (err) {
    report('feedback-host:prompt-raf', err);
  }

  const immediateHandle = timers.setTimeout(() => {
    if (state.token !== token || state.immediateHandle !== immediateHandle) return;
    state.immediateHandle = null;
    runFocus();
  }, immediateDelayMs);
  state.immediateHandle = immediateHandle;

  const fallbackHandle = timers.setTimeout(() => {
    if (state.token !== token || state.fallbackHandle !== fallbackHandle) return;
    state.fallbackHandle = null;
    runFocus();
  }, fallbackDelayMs);
  state.fallbackHandle = fallbackHandle;
}
