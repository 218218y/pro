// UI interactions: lightweight accessibility helpers (Pure ESM)
//
// Includes:
// - Keyboard activation (Enter/Space) for clickable rows
// - Toggle-row click => click checkbox
//
// Kept DOM-generic (no hard-coded ids), safe for both classic and React UI.

import type { AppContainer } from '../../../../types';

export type AccessibilityDeps = {
  doc: Document;
};

type ClickableElement = HTMLElement;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

function isElement(v: unknown): v is Element {
  if (typeof Element !== 'undefined' && v instanceof Element) return true;
  if (!isRecord(v)) return false;
  return v.nodeType === 1 && typeof v.closest === 'function' && typeof v.querySelector === 'function';
}

function isEventTargetDocument(v: unknown): v is Document {
  if (typeof Document !== 'undefined' && v instanceof Document) return true;
  if (!isRecord(v)) return false;
  return typeof v.addEventListener === 'function' && typeof v.removeEventListener === 'function';
}

function isContentEditableElement(v: unknown): boolean {
  return v instanceof HTMLElement ? !!v.isContentEditable : false;
}

function readClickableElement(el: unknown): ClickableElement | null {
  return typeof HTMLElement !== 'undefined' && el instanceof HTMLElement ? el : null;
}

function clickElement(el: unknown): void {
  readClickableElement(el)?.click?.();
}

export function installAccessibilityShortcuts(App: AppContainer, deps: AccessibilityDeps): () => void {
  const doc = deps?.doc;
  if (!App || typeof App !== 'object') return () => undefined;
  if (!isEventTargetDocument(doc)) return () => undefined;

  const onKeydown = (e: Event) => {
    try {
      if (!(e instanceof KeyboardEvent)) return;
      const key = e.key;
      if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return;

      const t = e.target;
      if (!isElement(t)) return;

      const tag = (t.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (isContentEditableElement(t)) return;

      const el = t.closest('.type-option, .groove-check-label, .tab');
      if (!el) return;

      e.preventDefault();
      const checkboxEl = el.querySelector('input[type="checkbox"]');
      const checkbox = checkboxEl instanceof HTMLInputElement ? checkboxEl : null;
      if (checkbox) checkbox.click();
      else clickElement(el);
    } catch {
      // swallow
    }
  };

  const onClick = (e: Event) => {
    try {
      const t = e.target;
      if (!isElement(t)) return;

      const row = t.closest('.toggle-row');
      if (!row) return;

      const tag = (t.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'LABEL') return;
      if (t.closest('.toggle-switch')) return;

      const checkboxEl = row.querySelector('input[type="checkbox"]');
      const checkbox = checkboxEl instanceof HTMLInputElement ? checkboxEl : null;
      if (checkbox) checkbox.click();
    } catch {
      // swallow
    }
  };

  try {
    doc.addEventListener('keydown', onKeydown, false);
  } catch {
    // ignore
  }
  try {
    doc.addEventListener('click', onClick, false);
  } catch {
    // ignore
  }

  const dispose = () => {
    try {
      doc.removeEventListener('keydown', onKeydown, false);
    } catch {
      // ignore
    }
    try {
      doc.removeEventListener('click', onClick, false);
    } catch {
      // ignore
    }
  };
  return dispose;
}
