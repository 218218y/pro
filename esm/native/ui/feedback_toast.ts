import type { AppContainer } from '../../../types';

import { getBrowserTimers } from '../services/api.js';
import { type ToastType, __uiFeedbackReportNonFatal, getReactFeedback } from './feedback_shared.js';
import {
  ensureToastContainer,
  normalizeToastKind,
  resolveToastDocument,
  resolveToastIcon,
} from './feedback_toast_base.js';
export { resolveStickyStatusToastHost, updateEditStateToast } from './feedback_toast_sticky.js';

export function showToast(
  App: AppContainer | null | undefined,
  message: unknown,
  type: ToastType | string = 'success'
): void {
  const reactFeedback = getReactFeedback(App);
  if (reactFeedback && typeof reactFeedback.toast === 'function') {
    try {
      reactFeedback.toast(message == null ? '' : String(message), normalizeToastKind(type));
      return;
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'toast.react', err);
    }
  }

  if (!App || typeof App !== 'object') return;
  const doc = resolveToastDocument(App);
  if (!doc) return;

  const container = ensureToastContainer(App, doc);
  if (!container) return;

  const kind = normalizeToastKind(type);
  const toast = doc.createElement('div');
  toast.className = `toast toast-${kind}`;

  const iconEl = doc.createElement('i');
  iconEl.className = `fas ${resolveToastIcon(kind)}`;

  const textEl = doc.createElement('span');
  textEl.textContent = message == null ? '' : String(message);

  toast.appendChild(iconEl);
  toast.appendChild(doc.createTextNode(' '));
  toast.appendChild(textEl);
  container.appendChild(toast);

  getBrowserTimers(App).setTimeout(() => {
    try {
      toast.classList.add('show');
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'toast.show', err);
    }
  }, 10);

  getBrowserTimers(App).setTimeout(() => {
    try {
      toast.classList.remove('show');
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'toast.hide', err);
    }
    getBrowserTimers(App).setTimeout(() => {
      try {
        toast.remove();
      } catch (err) {
        __uiFeedbackReportNonFatal(App, 'toast.remove', err);
      }
    }, 300);
  }, 3000);
}
