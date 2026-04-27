// UI interactions: history shortcuts (Pure ESM)
//
// Goals:
// - Keep key interaction logic out of ui/wiring.
// - Provide a single installer that binds keyboard shortcuts (React-only UI):
//   - Undo/Redo (Ctrl/Cmd+Z/Y, Ctrl/Cmd+Shift+Z)
//   - Copy-to-clipboard (Ctrl/Cmd+C) when not typing and there's no text selection
// - Avoid dependency on legacy DOM ids / legacy UI buttons.
// - Installer is pure; idempotency is handled by UiRuntime (uiRt.install).

import type { AppContainer } from '../../../../types';

import { runHistoryRedoMaybe, runHistoryUndoMaybe } from '../../services/api.js';
import { hasSuspendedHistoryShortcuts } from './history_ui_shortcut_guard.js';

const __historyUiReportNonFatalSeen = new Map<string, number>();

type ErrorInfoLike = { stack?: unknown; message?: unknown };

function readErrorInfo(value: unknown): ErrorInfoLike | null {
  return value && typeof value === 'object' ? value : null;
}

function __historyUiReportNonFatal(op: string, err: unknown, throttleMs = 4000): void {
  const now = Date.now();
  let msg = 'unknown';
  if (typeof err === 'string') msg = err;
  else if (typeof err === 'number' || typeof err === 'boolean') msg = String(err);
  else if (err && typeof err === 'object') {
    const e = readErrorInfo(err);
    if (e && typeof e.stack === 'string' && e.stack) msg = e.stack.split('\n')[0] || e.stack;
    else if (e && typeof e.message === 'string' && e.message) msg = e.message;
  }
  const key = `${op}::${msg}`;
  const prev = __historyUiReportNonFatalSeen.get(key) || 0;
  if (throttleMs > 0 && prev && now - prev < throttleMs) return;
  __historyUiReportNonFatalSeen.set(key, now);
  if (__historyUiReportNonFatalSeen.size > 600) {
    const pruneOlderThan = Math.max(10000, throttleMs * 4);
    for (const [k, ts] of __historyUiReportNonFatalSeen) {
      if (now - ts > pruneOlderThan) __historyUiReportNonFatalSeen.delete(k);
    }
  }
  console.error(`[WardrobePro][history_ui] ${op}`, err);
}

function isDocumentWithEvents(v: unknown): v is Document {
  return !!v && typeof v === 'object' && 'addEventListener' in v && typeof v.addEventListener === 'function';
}

function getElementTagName(el: Element | null): string {
  return el ? String(el.tagName || '').toLowerCase() : '';
}

export type HistoryUiDeps = {
  doc: Document | null;
  /** Optional (React-only): invoke the Export "copy to clipboard" action. */
  copyToClipboard?: () => unknown;
};

export function installHistoryUI(App: AppContainer, deps: Partial<HistoryUiDeps>): () => void {
  if (!App || typeof App !== 'object') return () => undefined;

  const doc = isDocumentWithEvents(deps?.doc) ? deps.doc : null;
  const copyToClipboard = typeof deps?.copyToClipboard === 'function' ? deps.copyToClipboard : null;

  if (!doc) return () => undefined;

  const onKeydown = (e: Event): void => {
    if (!(e instanceof KeyboardEvent)) return;
    if (e.defaultPrevented) return;
    try {
      if (hasSuspendedHistoryShortcuts(doc, e.target)) return;
      const active = doc.activeElement instanceof Element ? doc.activeElement : null;
      const tag = getElementTagName(active);
      const isTyping =
        tag === 'input' || tag === 'textarea' || (active instanceof HTMLElement && active.isContentEditable);

      const hasSelection = (() => {
        try {
          const sel = doc.getSelection ? doc.getSelection() : null;
          return !!(sel && !sel.isCollapsed && String(sel.toString() || '').trim());
        } catch {
          return false;
        }
      })();

      const k = typeof e.key === 'string' ? e.key : '';
      const isUndoKey = e.code === 'KeyZ' || k === 'z' || k === 'Z' || k === 'ז';
      const isRedoKey = e.code === 'KeyY' || k === 'y' || k === 'Y' || k === 'ט';
      const isCopyKey = e.code === 'KeyC' || k === 'c' || k === 'C' || k === 'ב';

      if ((e.ctrlKey || e.metaKey) && isCopyKey && !isTyping && !hasSelection) {
        if (!copyToClipboard) return;
        e.preventDefault();
        try {
          if (typeof e.stopPropagation === 'function') e.stopPropagation();
        } catch {
          // ignore
        }
        try {
          copyToClipboard();
        } catch (err) {
          __historyUiReportNonFatal('copyToClipboard', err);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && isUndoKey && !e.shiftKey && !isTyping) {
        e.preventDefault();
        try {
          runHistoryUndoMaybe(App);
        } catch (err) {
          __historyUiReportNonFatal('undo', err);
        }
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        !isTyping &&
        ((isRedoKey && !e.shiftKey) || (isUndoKey && e.shiftKey))
      ) {
        e.preventDefault();
        try {
          runHistoryRedoMaybe(App);
        } catch (err) {
          __historyUiReportNonFatal('redo', err);
        }
        return;
      }
    } catch (err) {
      __historyUiReportNonFatal('keydown', err);
    }
  };

  try {
    doc.addEventListener('keydown', onKeydown, false);
  } catch (err) {
    __historyUiReportNonFatal('bind', err);
  }

  const dispose = () => {
    try {
      doc.removeEventListener('keydown', onKeydown, false);
    } catch (err) {
      __historyUiReportNonFatal('unbind', err);
    }
  };
  return dispose;
}
