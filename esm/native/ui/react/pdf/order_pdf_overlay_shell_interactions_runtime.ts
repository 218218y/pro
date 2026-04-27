import { getElementByIdHtml } from '../../dom_helpers.js';
import { SCROLL_CENTER } from './order_pdf_overlay_constants.js';
import type { InlineDetailsConfirmState } from './order_pdf_overlay_contracts.js';
import type { RefBox } from './order_pdf_overlay_interactions_shared.js';

type ReportNonFatal = (op: string, err: unknown, dedupeMs?: number) => void;

function isHtmlFocusableNode(value: unknown): value is HTMLElement {
  return !!value && typeof value === 'object' && (value as { nodeType?: unknown }).nodeType === 1;
}

export type OrderPdfOverlayKeyboardGuardAction = 'confirm-ok' | 'confirm-cancel' | 'close' | null;

export function resolveOrderPdfOverlayKeyboardGuardAction(args: {
  event: Pick<KeyboardEvent, 'key'> | null | undefined;
  inlineConfirm: InlineDetailsConfirmState | null;
  doc: Document | null;
}): OrderPdfOverlayKeyboardGuardAction {
  const { event, inlineConfirm, doc } = args;
  if (!event) return null;
  if (inlineConfirm && inlineConfirm.open) {
    if (event.key === 'Enter') return 'confirm-ok';
    if (event.key === 'Escape') return 'confirm-cancel';
    return null;
  }
  if (event.key !== 'Escape') return null;
  const globalModal = doc ? getElementByIdHtml(doc, 'customPromptModal') : null;
  const globalOpen = !!(globalModal && globalModal.classList && globalModal.classList.contains('open'));
  return globalOpen ? null : 'close';
}

export function focusOrderPdfOverlayOrderNumberInput(args: {
  orderNoInputRef: RefBox<HTMLInputElement | null>;
  reportNonFatal: ReportNonFatal;
}): boolean {
  const { orderNoInputRef, reportNonFatal } = args;
  try {
    const el = orderNoInputRef.current;
    if (!el) return false;
    try {
      el.scrollIntoView(SCROLL_CENTER);
    } catch (__wpErr) {
      reportNonFatal('orderPdfFocusTrap:scrollOrderNo', __wpErr);
    }
    el.focus();
    try {
      el.select();
    } catch (__wpErr) {
      reportNonFatal('orderPdfFocusTrap:selectOrderNo', __wpErr);
    }
    return true;
  } catch (__wpErr) {
    reportNonFatal('orderPdfFocusTrap:focusOrderNo', __wpErr);
    return false;
  }
}

export function createOrderPdfOverlayInitialFocusSession(args: {
  win: Window;
  orderNoInputRef: RefBox<HTMLInputElement | null>;
  reportNonFatal: ReportNonFatal;
}) {
  const { win, orderNoInputRef, reportNonFatal } = args;
  let activeVersion = 0;
  let raf1 = 0;
  let raf2 = 0;

  const cancel = () => {
    activeVersion += 1;
    try {
      if (raf1 && typeof win.cancelAnimationFrame === 'function') {
        win.cancelAnimationFrame(raf1);
      }
      if (raf2 && typeof win.cancelAnimationFrame === 'function') {
        win.cancelAnimationFrame(raf2);
      }
    } catch (__wpErr) {
      reportNonFatal('orderPdfFocusTrap:cancelInitialFocusRaf', __wpErr);
    }
    raf1 = 0;
    raf2 = 0;
  };

  const schedule = () => {
    activeVersion += 1;
    const version = activeVersion;
    try {
      if (typeof win.requestAnimationFrame !== 'function') {
        focusOrderPdfOverlayOrderNumberInput({ orderNoInputRef, reportNonFatal });
        return;
      }
      raf1 = win.requestAnimationFrame(() => {
        if (version !== activeVersion) return;
        focusOrderPdfOverlayOrderNumberInput({ orderNoInputRef, reportNonFatal });
        if (typeof win.requestAnimationFrame !== 'function') return;
        raf2 = win.requestAnimationFrame(() => {
          if (version !== activeVersion) return;
          focusOrderPdfOverlayOrderNumberInput({ orderNoInputRef, reportNonFatal });
        });
      });
    } catch (__wpErr) {
      reportNonFatal('orderPdfFocusTrap:initialFocusRaf', __wpErr);
    }
  };

  return { schedule, cancel };
}

export function listOrderPdfOverlayFocusableWithin(args: {
  scope: HTMLElement;
  doc: Document;
  win: Window;
}): HTMLElement[] {
  const { scope, doc, win } = args;
  let nodes: HTMLElement[] = [];
  try {
    const q =
      'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
    nodes = Array.from(scope.querySelectorAll<HTMLElement>(q));
  } catch {
    nodes = [];
  }
  return nodes.filter(node => {
    try {
      if (!node) return false;
      if (node.offsetParent === null && node !== doc.activeElement) return false;
      const style = win.getComputedStyle ? win.getComputedStyle(node) : null;
      if (style && (style.visibility === 'hidden' || style.display === 'none')) return false;
      return true;
    } catch {
      return true;
    }
  });
}

export function resolveOrderPdfOverlayFocusScope(args: {
  doc: Document;
  overlayRef: RefBox<HTMLDivElement | null>;
  reportNonFatal: ReportNonFatal;
}): HTMLElement | null {
  const { doc, overlayRef, reportNonFatal } = args;
  try {
    const inlineModal = getElementByIdHtml(doc, 'orderPdfInlineConfirmModal');
    const inlineOpen = !!(inlineModal && inlineModal.classList && inlineModal.classList.contains('open'));
    if (inlineOpen && inlineModal) return inlineModal;
  } catch (__wpErr) {
    reportNonFatal('orderPdfFocusTrap:resolveInlineScope', __wpErr);
  }

  try {
    const root = overlayRef.current;
    if (!root) return null;
    const page = root.querySelector<HTMLElement>('.wp-pdf-editor-page');
    return page || root;
  } catch {
    return overlayRef.current;
  }
}

export function trapOrderPdfOverlayTabKey(args: {
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault' | 'stopPropagation'> | null | undefined;
  doc: Document;
  win: Window;
  overlayRef: RefBox<HTMLDivElement | null>;
  orderNoInputRef: RefBox<HTMLInputElement | null>;
  reportNonFatal: ReportNonFatal;
}): boolean {
  const { event, doc, win, overlayRef, orderNoInputRef, reportNonFatal } = args;
  if (!event || event.key !== 'Tab') return false;
  const scope = resolveOrderPdfOverlayFocusScope({ doc, overlayRef, reportNonFatal });
  if (!scope) return false;

  const globalModal = getElementByIdHtml(doc, 'customPromptModal');
  const globalOpen = !!(globalModal && globalModal.classList && globalModal.classList.contains('open'));
  if (globalOpen) return false;

  const active = isHtmlFocusableNode(doc.activeElement) ? doc.activeElement : null;
  const inside = !!(active && scope.contains(active));
  const focusables = listOrderPdfOverlayFocusableWithin({ scope, doc, win });
  if (!focusables.length) return false;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const scopeIsInlineConfirm = scope.id === 'orderPdfInlineConfirmModal';

  if (!inside) {
    try {
      event.preventDefault();
      event.stopPropagation();
    } catch (__wpErr) {
      reportNonFatal('orderPdfFocusTrap:redirectPreventDefault', __wpErr);
    }
    if (scopeIsInlineConfirm) {
      try {
        first.focus();
      } catch (__wpErr) {
        reportNonFatal('orderPdfFocusTrap:focusInlineConfirm', __wpErr);
      }
      return true;
    }
    if (!focusOrderPdfOverlayOrderNumberInput({ orderNoInputRef, reportNonFatal })) {
      try {
        first.focus();
      } catch (__wpErr) {
        reportNonFatal('orderPdfFocusTrap:focusFallback', __wpErr);
      }
    }
    return true;
  }

  if (event.shiftKey) {
    if (active === first || active === scope) {
      try {
        event.preventDefault();
        event.stopPropagation();
      } catch (__wpErr) {
        reportNonFatal('orderPdfFocusTrap:shiftTabPreventDefault', __wpErr);
      }
      try {
        last.focus();
      } catch (__wpErr) {
        reportNonFatal('orderPdfFocusTrap:focusLast', __wpErr);
      }
      return true;
    }
    return false;
  }

  if (active === last) {
    try {
      event.preventDefault();
      event.stopPropagation();
    } catch (__wpErr) {
      reportNonFatal('orderPdfFocusTrap:tabPreventDefault', __wpErr);
    }
    try {
      first.focus();
    } catch (__wpErr) {
      reportNonFatal('orderPdfFocusTrap:focusFirst', __wpErr);
    }
    return true;
  }
  return false;
}
