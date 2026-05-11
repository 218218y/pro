import type { AppContainer, UiFeedbackConfirmCallback, UiFeedbackPromptCallback } from '../../../types';

import { get$, getBrowserTimers, getDocumentMaybe } from '../services/api.js';
import { ensureFeedbackModalState } from './feedback_modal_state.js';
import {
  type CustomModalEls,
  __uiFeedbackReportNonFatal,
  asHTMLButtonElement,
  asHTMLElement,
  asHTMLInputElement,
} from './feedback_shared.js';

export function ensureModalState(App: AppContainer) {
  return ensureFeedbackModalState(App);
}

export function getCustomModalEls(App: AppContainer): CustomModalEls {
  const doc = getDocumentMaybe(App);
  if (!doc) return {};
  const $ = get$(App);

  const modal = asHTMLElement($('customPromptModal'));
  if (!modal) return {};

  const input = asHTMLInputElement($('modalInput'));
  const confirmBtn = asHTMLButtonElement($('modalConfirmBtn'));
  const cancelBtn = asHTMLButtonElement($('modalCancelBtn'));
  const titleEl = asHTMLElement($('modalTitle'));

  let msgEl = asHTMLElement($('modalMessage'));
  if (!msgEl) {
    try {
      const p = doc.createElement('p');
      p.id = 'modalMessage';
      p.className = 'modal-message hidden';
      msgEl = p;
      if (titleEl?.parentNode) titleEl.parentNode.insertBefore(p, titleEl.nextSibling);
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'modal.ensureMessage', err);
    }
  }

  return { modal, input, confirmBtn, cancelBtn, titleEl, msgEl };
}

export function closeCustomModal(App: AppContainer, opts?: { cancelled?: boolean }): void {
  const state = ensureModalState(App);
  const els = getCustomModalEls(App);
  if (!els.modal) return;
  const promptCancelCb = opts?.cancelled === true && state.mode === 'prompt' ? state.onPrompt : null;
  const confirmCancelCb = opts?.cancelled === true && state.mode === 'confirm' ? state.onCancel : null;

  try {
    els.modal.classList.remove('open');
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'modal.close', err);
  }

  getBrowserTimers(App).setTimeout(() => {
    try {
      if (els.msgEl) els.msgEl.classList.add('hidden');
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'modal.hideMessage', err);
    }
    try {
      if (els.input) els.input.classList.remove('hidden');
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'modal.showInput', err);
    }
    try {
      if (els.confirmBtn) els.confirmBtn.className = 'btn btn-save';
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'modal.resetConfirmClass', err);
    }
  }, 300);

  state.mode = null;
  state.onPrompt = null;
  state.onConfirm = null;
  state.onCancel = null;

  try {
    if (typeof promptCancelCb === 'function') promptCancelCb(null);
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'modal.promptCancelCallback', err);
  }

  try {
    if (typeof confirmCancelCb === 'function') confirmCancelCb();
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'modal.confirmCancelCallback', err);
  }
}

export function openPromptViaWindow(
  App: AppContainer,
  title: unknown,
  defaultValue: unknown,
  callback: UiFeedbackPromptCallback | null | undefined
): void {
  const doc = getDocumentMaybe(App);
  if (!doc) return;
  try {
    const win = doc.defaultView;
    const value =
      win && typeof win.prompt === 'function'
        ? win.prompt(String(title || ''), String(defaultValue || ''))
        : null;
    if (typeof callback === 'function' && value !== null) callback(String(value));
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'prompt.window', err);
  }
}

export function openConfirmViaWindow(
  App: AppContainer,
  message: unknown,
  onConfirm: UiFeedbackConfirmCallback | null | undefined,
  onCancel?: UiFeedbackConfirmCallback | null | undefined
): void {
  const doc = getDocumentMaybe(App);
  if (!doc) return;
  try {
    const win = doc.defaultView;
    const ok = win && typeof win.confirm === 'function' ? !!win.confirm(String(message || '')) : false;
    if (ok && typeof onConfirm === 'function') onConfirm();
    if (!ok && typeof onCancel === 'function') onCancel();
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'confirm.window', err);
    try {
      if (typeof onCancel === 'function') onCancel();
    } catch (cancelErr) {
      __uiFeedbackReportNonFatal(App, 'confirm.window.cancel', cancelErr);
    }
  }
}
