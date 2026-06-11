import type { AppContainer } from '../../../types';

import {
  type EventListenerLike,
  type EventTargetLike,
  __uiFeedbackReportNonFatal,
} from './feedback_shared.js';
import { closeCustomModal, ensureModalState, getCustomModalEls } from './feedback_modal_dom.js';

export function ensureCustomModalBindings(App: AppContainer): void {
  const state = ensureModalState(App);
  const els = getCustomModalEls(App);
  const nextInput = els.input || null;
  const sameTargets =
    state.boundConfirmBtn === els.confirmBtn &&
    state.boundCancelBtn === els.cancelBtn &&
    state.boundInput === nextInput;

  if (!els.confirmBtn || !els.cancelBtn) {
    try {
      state.bindingsCleanup?.();
    } catch (err) {
      __uiFeedbackReportNonFatal('modal.cleanup.previous', err);
    }
    state.bindingsInstalled = false;
    state.bindingsCleanup = null;
    state.boundConfirmBtn = null;
    state.boundCancelBtn = null;
    state.boundInput = null;
    return;
  }

  if (state.bindingsInstalled === true && typeof state.bindingsCleanup === 'function' && sameTargets) return;

  try {
    state.bindingsCleanup?.();
  } catch (err) {
    __uiFeedbackReportNonFatal('modal.cleanup.previous', err);
  }
  state.bindingsInstalled = false;
  state.bindingsCleanup = null;
  state.boundConfirmBtn = null;
  state.boundCancelBtn = null;
  state.boundInput = null;

  const cleanups: Array<() => void> = [];

  const handleConfirm = () => {
    if (!state.mode) return;
    const { input } = getCustomModalEls(App);
    if (state.mode === 'prompt') {
      const value = input ? String(input.value || '').trim() : '';
      const cb = state.onPrompt;
      closeCustomModal(App);
      if (typeof cb === 'function') cb(value);
      return;
    }
    const cb = state.onConfirm;
    closeCustomModal(App);
    if (typeof cb === 'function') cb();
  };

  const handleCancel = () => {
    closeCustomModal(App, { cancelled: true });
  };

  const handleKeydown = (e: Event) => {
    if (!e || !('key' in e && typeof e.key === 'string')) return;
    if (e.key === 'Enter') {
      try {
        e.preventDefault();
      } catch (err) {
        __uiFeedbackReportNonFatal('modal.keydown.enter', err);
      }
      handleConfirm();
    }
    if (e.key === 'Escape') {
      try {
        e.preventDefault();
      } catch (err) {
        __uiFeedbackReportNonFatal('modal.keydown.escape', err);
      }
      handleCancel();
    }
  };

  const listen = (
    el: EventTargetLike | null | undefined,
    type: string,
    handler: EventListenerLike,
    opts?: boolean | AddEventListenerOptions
  ): void => {
    try {
      if (!el || typeof el.addEventListener !== 'function') return;
      el.addEventListener(type, handler, opts);
      cleanups.push(() => {
        try {
          if (typeof el.removeEventListener !== 'function') return;
          el.removeEventListener(type, handler, opts);
        } catch (err) {
          __uiFeedbackReportNonFatal(`modal.unbind:${type}`, err);
        }
      });
    } catch (err) {
      __uiFeedbackReportNonFatal(`modal.bind:${type}`, err);
    }
  };

  listen(els.confirmBtn, 'click', handleConfirm, { passive: false });
  listen(els.cancelBtn, 'click', handleCancel, { passive: false });
  if (els.input) listen(els.input, 'keydown', handleKeydown, { passive: false });

  state.bindingsInstalled = true;
  state.boundConfirmBtn = els.confirmBtn;
  state.boundCancelBtn = els.cancelBtn;
  state.boundInput = nextInput;
  const cleanupBindings = () => {
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop();
      try {
        cleanup?.();
      } catch (err) {
        __uiFeedbackReportNonFatal('modal.cleanup', err);
      }
    }
    state.bindingsInstalled = false;
    if (state.bindingsCleanup === cleanupBindings) state.bindingsCleanup = null;
    state.boundConfirmBtn = null;
    state.boundCancelBtn = null;
    state.boundInput = null;
  };
  state.bindingsCleanup = cleanupBindings;
}
