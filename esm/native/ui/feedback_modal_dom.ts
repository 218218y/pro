import type { AppContainer, UiFeedbackConfirmCallback, UiFeedbackPromptCallback } from '../../../types';

import { get$, getBrowserTimers, getDocumentMaybe } from '../services/api.js';
import { formatDisplayScalar, readDisplayScalar } from '../../shared/display_text_shared.js';
import { ensureFeedbackModalState } from './feedback_modal_state.js';
import {
  type CustomModalEls,
  __uiFeedbackReportNonFatal,
  asHTMLButtonElement,
  asHTMLElement,
  asHTMLInputElement,
} from './feedback_shared.js';

function readFeedbackText(value: unknown): string {
  return formatDisplayScalar(readDisplayScalar(value));
}

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
  if (opts?.cancelled === true && state.mode === 'acknowledge') return;
  const els = getCustomModalEls(App);
  if (!els.modal) return;
  const promptCancelCb = opts?.cancelled === true && state.mode === 'prompt' ? state.onPrompt : null;
  const confirmCancelCb = opts?.cancelled === true && state.mode === 'confirm' ? state.onCancel : null;

  try {
    els.modal.classList.remove('open');
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'modal.close', err);
  }

  state.mode = null;
  state.onPrompt = null;
  state.onConfirm = null;
  state.onCancel = null;

  getBrowserTimers(App).setTimeout(() => {
    if (ensureModalState(App).mode !== null) return;
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
      if (els.confirmBtn) {
        els.confirmBtn.className = 'btn btn-save';
        els.confirmBtn.textContent = 'אישור';
      }
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'modal.resetConfirmClass', err);
    }
    try {
      if (els.cancelBtn) els.cancelBtn.classList.remove('hidden');
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'modal.resetCancelVisibility', err);
    }
  }, 300);

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
        ? win.prompt(readFeedbackText(title), readFeedbackText(defaultValue))
        : null;
    if (typeof callback === 'function' && value !== null) callback(value);
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'prompt.window', err);
  }
}

export function openConfirmViaWindow(
  App: AppContainer,
  message: unknown,
  onConfirm: UiFeedbackConfirmCallback | null | undefined,
  onCancel?: UiFeedbackConfirmCallback | null
): void {
  const doc = getDocumentMaybe(App);
  if (!doc) return;
  try {
    const win = doc.defaultView;
    const ok = win && typeof win.confirm === 'function' ? !!win.confirm(readFeedbackText(message)) : false;
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

export function openAcknowledgeViaWindow(
  App: AppContainer,
  message: unknown,
  onAcknowledge?: UiFeedbackConfirmCallback | null
): boolean {
  const doc = getDocumentMaybe(App);
  if (!doc) return false;
  try {
    const win = doc.defaultView;
    if (!win || typeof win.alert !== 'function') return false;
    win.alert(readFeedbackText(message));
    if (typeof onAcknowledge === 'function') onAcknowledge();
    return true;
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'acknowledge.window', err);
    return false;
  }
}
