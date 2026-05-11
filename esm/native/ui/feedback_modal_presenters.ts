import type { AppContainer, UiFeedbackConfirmCallback, UiFeedbackPromptCallback } from '../../../types';

import { getBrowserTimers } from '../services/api.js';
import { __uiFeedbackReportNonFatal, getReactFeedback, readAppWithModalState } from './feedback_shared.js';
import { ensureCustomModalBindings } from './feedback_modal_bindings.js';
import {
  ensureModalState,
  getCustomModalEls,
  openConfirmViaWindow,
  openPromptViaWindow,
} from './feedback_modal_dom.js';

export function openCustomPrompt(
  App: AppContainer | null | undefined,
  title: unknown,
  defaultValue: unknown,
  callback: UiFeedbackPromptCallback | null | undefined
): void {
  const reactFeedback = getReactFeedback(App);
  if (reactFeedback && typeof reactFeedback.prompt === 'function') {
    try {
      reactFeedback.prompt(String(title || ''), String(defaultValue || ''), value => {
        try {
          if (typeof callback === 'function') callback(value == null ? '' : String(value));
        } catch (err) {
          __uiFeedbackReportNonFatal(App, 'prompt.reactCallback', err);
        }
      });
      return;
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'prompt.react', err);
    }
  }

  if (!App || typeof App !== 'object') return;
  const appWithState = readAppWithModalState(App);
  if (!appWithState) return;

  ensureCustomModalBindings(appWithState);
  const els = getCustomModalEls(appWithState);
  if (!els.modal) {
    openPromptViaWindow(appWithState, title, defaultValue, callback);
    return;
  }

  const state = ensureModalState(appWithState);
  state.mode = 'prompt';
  state.onPrompt = typeof callback === 'function' ? callback : null;
  state.onConfirm = null;
  state.onCancel = null;

  try {
    if (els.titleEl) els.titleEl.textContent = String(title || '');
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'prompt.title', err);
  }
  try {
    if (els.msgEl) els.msgEl.classList.add('hidden');
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'prompt.hideMessage', err);
  }
  try {
    if (els.input) {
      els.input.classList.remove('hidden');
      els.input.value = defaultValue == null ? '' : String(defaultValue);
    }
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'prompt.input', err);
  }
  try {
    if (els.confirmBtn) els.confirmBtn.className = 'btn btn-save';
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'prompt.confirmClass', err);
  }
  try {
    els.modal.classList.add('open');
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'prompt.open', err);
  }

  getBrowserTimers(appWithState).setTimeout(() => {
    try {
      if (els.input) {
        els.input.focus();
        els.input.select();
      }
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'prompt.focus', err);
    }
  }, 100);
}

export function openCustomConfirm(
  App: AppContainer | null | undefined,
  title: unknown,
  message: unknown,
  onConfirm: UiFeedbackConfirmCallback | null | undefined,
  onCancel?: UiFeedbackConfirmCallback | null | undefined
): void {
  const reactFeedback = getReactFeedback(App);
  if (reactFeedback && typeof reactFeedback.confirm === 'function') {
    try {
      reactFeedback.confirm(
        String(title || ''),
        String(message || ''),
        () => {
          try {
            if (typeof onConfirm === 'function') onConfirm();
          } catch (err) {
            __uiFeedbackReportNonFatal(App, 'confirm.reactCallback', err);
          }
        },
        onCancel ?? null
      );
      return;
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'confirm.react', err);
    }
  }

  if (!App || typeof App !== 'object') return;
  const appWithState = readAppWithModalState(App);
  if (!appWithState) return;

  ensureCustomModalBindings(appWithState);
  const els = getCustomModalEls(appWithState);
  if (!els.modal) {
    openConfirmViaWindow(appWithState, message, onConfirm, onCancel);
    return;
  }

  const state = ensureModalState(appWithState);
  state.mode = 'confirm';
  state.onConfirm = typeof onConfirm === 'function' ? onConfirm : null;
  state.onCancel = typeof onCancel === 'function' ? onCancel : null;
  state.onPrompt = null;

  try {
    if (els.titleEl) els.titleEl.textContent = String(title || '');
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'confirm.title', err);
  }
  try {
    if (els.msgEl) {
      els.msgEl.textContent = String(message || '');
      els.msgEl.classList.remove('hidden');
    }
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'confirm.message', err);
  }
  try {
    if (els.input) els.input.classList.add('hidden');
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'confirm.hideInput', err);
  }
  try {
    if (els.confirmBtn) els.confirmBtn.className = 'btn btn-danger';
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'confirm.confirmClass', err);
  }
  try {
    els.modal.classList.add('open');
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'confirm.open', err);
  }
}
