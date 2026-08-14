import type {
  AppContainer,
  UiFeedbackAcknowledgeCallback,
  UiFeedbackConfirmCallback,
  UiFeedbackPromptCallback,
} from '../../../types';

import { getBrowserTimers } from '../services/api.js';
import { formatDisplayScalar, readDisplayScalar } from '../../shared/display_text_shared.js';
import {
  type CustomModalEls,
  __uiFeedbackReportNonFatal,
  getReactFeedback,
  readAppWithModalState,
} from './feedback_shared.js';
import { ensureCustomModalBindings } from './feedback_modal_bindings.js';
import {
  ensureModalState,
  getCustomModalEls,
  openAcknowledgeViaWindow,
  openConfirmViaWindow,
  openPromptViaWindow,
} from './feedback_modal_dom.js';

function readFeedbackText(value: unknown): string {
  return formatDisplayScalar(readDisplayScalar(value));
}

type AcknowledgementRequest = {
  title: string;
  message: string;
  onAcknowledge: UiFeedbackAcknowledgeCallback | null;
};

type AcknowledgementQueueState = {
  active: boolean;
  pending: AcknowledgementRequest[];
};

const acknowledgementQueues = new WeakMap<AppContainer, AcknowledgementQueueState>();

function configureModalActions(
  App: AppContainer,
  els: CustomModalEls,
  mode: 'prompt' | 'confirm' | 'acknowledge'
): void {
  try {
    if (els.confirmBtn) {
      els.confirmBtn.className = mode === 'confirm' ? 'btn btn-danger' : 'btn btn-save';
      els.confirmBtn.textContent = mode === 'acknowledge' ? 'קראתי והבנתי' : 'אישור';
    }
  } catch (err) {
    __uiFeedbackReportNonFatal(App, `${mode}.confirmAction`, err);
  }
  try {
    if (els.cancelBtn) {
      if (mode === 'acknowledge') els.cancelBtn.classList.add('hidden');
      else els.cancelBtn.classList.remove('hidden');
    }
  } catch (err) {
    __uiFeedbackReportNonFatal(App, `${mode}.cancelVisibility`, err);
  }
}

function presentCustomAcknowledgement(
  App: AppContainer,
  request: AcknowledgementRequest,
  onComplete: () => void
): boolean {
  const reactFeedback = getReactFeedback(App);
  if (reactFeedback && typeof reactFeedback.acknowledge === 'function') {
    try {
      reactFeedback.acknowledge(request.title, request.message, onComplete);
      return true;
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'acknowledge.react', err);
    }
  }

  ensureCustomModalBindings(App);
  const els = getCustomModalEls(App);
  if (!els.modal) return openAcknowledgeViaWindow(App, request.message, onComplete);

  const state = ensureModalState(App);
  state.mode = 'acknowledge';
  state.onConfirm = onComplete;
  state.onCancel = null;
  state.onPrompt = null;

  try {
    if (els.titleEl) els.titleEl.textContent = request.title;
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'acknowledge.title', err);
  }
  try {
    if (els.msgEl) {
      els.msgEl.textContent = request.message;
      els.msgEl.classList.remove('hidden');
    }
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'acknowledge.message', err);
  }
  try {
    if (els.input) els.input.classList.add('hidden');
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'acknowledge.hideInput', err);
  }
  configureModalActions(App, els, 'acknowledge');
  try {
    els.modal.classList.add('open');
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'acknowledge.open', err);
  }

  getBrowserTimers(App).setTimeout(() => {
    try {
      els.confirmBtn?.focus();
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'acknowledge.focus', err);
    }
  }, 100);
  return true;
}

function pumpAcknowledgementQueue(App: AppContainer, queue: AcknowledgementQueueState): void {
  if (queue.active) return;
  const request = queue.pending.shift();
  if (!request) {
    acknowledgementQueues.delete(App);
    return;
  }

  queue.active = true;
  const complete = () => {
    try {
      request.onAcknowledge?.();
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'acknowledge.callback', err);
    } finally {
      queue.active = false;
      pumpAcknowledgementQueue(App, queue);
    }
  };

  if (presentCustomAcknowledgement(App, request, complete)) return;
  queue.active = false;
  pumpAcknowledgementQueue(App, queue);
}

export function openCustomAcknowledge(
  App: AppContainer | null | undefined,
  title: unknown,
  message: unknown,
  onAcknowledge?: UiFeedbackAcknowledgeCallback | null
): void {
  if (!App || typeof App !== 'object') return;
  const appWithState = readAppWithModalState(App);
  if (!appWithState) return;

  const request: AcknowledgementRequest = {
    title: readFeedbackText(title),
    message: readFeedbackText(message),
    onAcknowledge: typeof onAcknowledge === 'function' ? onAcknowledge : null,
  };
  const queue = acknowledgementQueues.get(appWithState) || { active: false, pending: [] };
  if (!acknowledgementQueues.has(appWithState)) acknowledgementQueues.set(appWithState, queue);
  queue.pending.push(request);
  pumpAcknowledgementQueue(appWithState, queue);
}

export function openCustomPrompt(
  App: AppContainer | null | undefined,
  title: unknown,
  defaultValue: unknown,
  callback: UiFeedbackPromptCallback | null | undefined
): void {
  const reactFeedback = getReactFeedback(App);
  if (reactFeedback && typeof reactFeedback.prompt === 'function') {
    try {
      reactFeedback.prompt(readFeedbackText(title), readFeedbackText(defaultValue), value => {
        try {
          if (typeof callback === 'function') callback(typeof value === 'string' ? value : '');
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
    if (els.titleEl) els.titleEl.textContent = readFeedbackText(title);
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
      els.input.value = readFeedbackText(defaultValue);
    }
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'prompt.input', err);
  }
  configureModalActions(App, els, 'prompt');
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
  onCancel?: UiFeedbackConfirmCallback | null
): void {
  const reactFeedback = getReactFeedback(App);
  if (reactFeedback && typeof reactFeedback.confirm === 'function') {
    try {
      reactFeedback.confirm(
        readFeedbackText(title),
        readFeedbackText(message),
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
    if (els.titleEl) els.titleEl.textContent = readFeedbackText(title);
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'confirm.title', err);
  }
  try {
    if (els.msgEl) {
      els.msgEl.textContent = readFeedbackText(message);
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
  configureModalActions(App, els, 'confirm');
  try {
    els.modal.classList.add('open');
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'confirm.open', err);
  }
}
