import type { AppContainer } from '../../../types';

import { getMode } from './store_access.js';
import {
  MODES,
  exitNotesDrawModeViaService,
  get$,
  getDocumentMaybe,
  getModesControllerMaybe,
  getStickyStatusToastElement,
  isNotesScreenDrawMode,
  setModePrimary,
  setStickyStatusToastElement,
} from '../services/api.js';
import { getUiRuntime } from './runtime/ui_runtime.js';
import { __uiFeedbackReportNonFatal, asHTMLElement } from './feedback_shared.js';

export function resolveStickyStatusToastHost(App: AppContainer, doc: Document): HTMLElement {
  try {
    const $ = get$(App);
    const viewer =
      asHTMLElement($('viewer-container')) || asHTMLElement(doc.getElementById('viewer-container'));
    if (viewer) return viewer;
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'stickyToast.resolveHost', err);
  }
  return doc.body;
}

function ensureStickyStatusToastShell(App: AppContainer, doc: Document): HTMLElement | null {
  const $ = get$(App);
  const host = resolveStickyStatusToastHost(App, doc);

  let toast = asHTMLElement($('stickyStatusToast'));
  if (!toast) {
    try {
      const el = doc.createElement('div');
      el.id = 'stickyStatusToast';
      el.className = 'sticky-status-toast';
      host.appendChild(el);
      toast = el;
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'stickyToast.create', err);
      return null;
    }
  } else if (toast.parentElement !== host) {
    try {
      host.appendChild(toast);
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'stickyToast.moveHost', err);
    }
  }

  return toast || null;
}

function installStickyToastDismissBinding(App: AppContainer, toast: HTMLElement): void {
  try {
    const runtime = getUiRuntime(App);
    const key = 'ui:feedback:stickyToastDismiss';

    try {
      const prevEl = getStickyStatusToastElement(App);
      if (prevEl !== toast) {
        try {
          runtime.clearDisposer(key);
        } catch (err) {
          __uiFeedbackReportNonFatal(App, 'stickyToast.clearDisposer', err);
        }
        setStickyStatusToastElement(App, toast);
      }
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'stickyToast.updateOwnerEl', err);
    }

    if (runtime.getDisposer(key)) return;

    runtime.install(key, () => {
      try {
        toast.style.cursor = 'pointer';
      } catch (err) {
        __uiFeedbackReportNonFatal(App, 'stickyToast.cursor', err);
      }

      const onToastPointerDownDismiss = (e: Event) => {
        try {
          const isToastActive = toast.classList?.contains('active');
          if (!isToastActive) return;

          e.preventDefault();
          e.stopPropagation();

          try {
            if (isNotesScreenDrawMode(App)) {
              exitNotesDrawModeViaService(App);
              return;
            }
          } catch (err) {
            __uiFeedbackReportNonFatal(App, 'stickyToast.exitNotesMode', err);
          }

          let primary = 'none';
          try {
            const mode = getMode(App);
            primary = mode && typeof mode.primary === 'string' ? String(mode.primary || 'none') : 'none';
          } catch {
            primary = 'none';
          }
          if (!primary || primary === 'none') return;

          try {
            const controller = getModesControllerMaybe(App);
            if (controller && typeof controller.exitPrimaryMode === 'function') {
              controller.exitPrimaryMode(undefined, { closeDoors: true, source: 'ui:toast:click' });
              return;
            }
          } catch (err) {
            __uiFeedbackReportNonFatal(App, 'stickyToast.exitPrimaryMode', err);
          }

          try {
            setModePrimary(App, MODES.NONE, {}, { source: 'ui:feedback:toastDismiss' });
          } catch (err) {
            __uiFeedbackReportNonFatal(App, 'stickyToast.setModePrimary', err);
          }
        } catch (err) {
          __uiFeedbackReportNonFatal(App, 'stickyToast.pointerdown', err);
        }
      };

      try {
        toast.addEventListener('pointerdown', onToastPointerDownDismiss, { passive: false });
      } catch (err) {
        __uiFeedbackReportNonFatal(App, 'stickyToast.bindPointerdown', err);
      }

      return () => {
        try {
          toast.removeEventListener('pointerdown', onToastPointerDownDismiss, false);
        } catch (err) {
          __uiFeedbackReportNonFatal(App, 'stickyToast.unbindPointerdown', err);
        }
      };
    });
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'stickyToast.installDisposer', err);
  }
}

function resolveStickyDotColor(text: string): string {
  if (text.includes('הסרה') || text.includes('מחיקה') || text.includes('ביטול')) return '#ef4444';
  if (text.includes('הערות')) return '#3b82f6';
  return '#22c55e';
}

function ensureStickyTextWrap(doc: Document, toast: HTMLElement): HTMLElement | null {
  let textWrap: HTMLElement | undefined;
  try {
    textWrap = asHTMLElement(toast.querySelector('.status-texts'));
  } catch {
    textWrap = undefined;
  }
  if (textWrap) return textWrap;

  try {
    const el = doc.createElement('span');
    el.className = 'status-texts';
    toast.appendChild(el);
    return el;
  } catch {
    return null;
  }
}

function ensureStickyChild(
  doc: Document,
  parent: HTMLElement,
  selector: string,
  tagName: 'div' | 'span',
  className: string
): HTMLElement | null {
  let node: HTMLElement | undefined;
  try {
    node = asHTMLElement(parent.querySelector(selector));
  } catch {
    node = undefined;
  }
  if (node) return node;

  try {
    const el = doc.createElement(tagName);
    el.className = className;
    parent.appendChild(el);
    return el;
  } catch {
    return null;
  }
}

function syncStickyToastContent(App: AppContainer, doc: Document, toast: HTMLElement, text: string): void {
  const dot = ensureStickyChild(doc, toast, '.status-dot', 'div', 'status-dot');
  const dotColor = resolveStickyDotColor(text);
  try {
    if (dot) {
      dot.style.backgroundColor = dotColor;
      dot.style.boxShadow = `0 0 5px ${dotColor}`;
    }
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'stickyToast.dotStyle', err);
  }

  const textWrap = ensureStickyTextWrap(doc, toast);
  if (!textWrap) return;

  const label = ensureStickyChild(doc, textWrap, '.status-label', 'span', 'status-label');
  const hint = ensureStickyChild(doc, textWrap, '.status-hint', 'div', 'status-hint');

  try {
    if (label) label.textContent = text;
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'stickyToast.label', err);
  }
  try {
    if (hint) hint.textContent = 'לחץ על ההודעה כדי לצאת ממצב העריכה';
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'stickyToast.hint', err);
  }
}

export function updateEditStateToast(
  App: AppContainer | null | undefined,
  text: unknown,
  isActive: boolean
): void {
  if (!App || typeof App !== 'object') return;
  const doc = getDocumentMaybe(App);
  if (!doc) return;

  const toast = ensureStickyStatusToastShell(App, doc);
  if (!toast) return;

  installStickyToastDismissBinding(App, toast);

  const message = text == null ? '' : String(text);
  const active = !!isActive && message.length > 0;

  if (!active) {
    try {
      toast.classList.remove('active');
    } catch (err) {
      __uiFeedbackReportNonFatal(App, 'stickyToast.deactivate', err);
    }
    return;
  }

  syncStickyToastContent(App, doc, toast, message);
  try {
    toast.classList.add('active');
  } catch (err) {
    __uiFeedbackReportNonFatal(App, 'stickyToast.activate', err);
  }
}
