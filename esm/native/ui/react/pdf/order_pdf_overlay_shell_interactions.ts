import type { InlineDetailsConfirmState } from './order_pdf_overlay_contracts.js';
import { CAPTURE_TRUE } from './order_pdf_overlay_constants.js';
import type { RefBox } from './order_pdf_overlay_interactions_shared.js';
import { installDomEventListener } from '../effects/dom_event_cleanup.js';
import {
  createOrderPdfOverlayInitialFocusSession,
  resolveOrderPdfOverlayKeyboardGuardAction,
  trapOrderPdfOverlayTabKey,
} from './order_pdf_overlay_shell_interactions_runtime.js';
type ReportNonFatal = (op: string, err: unknown, dedupeMs?: number) => void;
type FocusTrapDeps = {
  open: boolean;
  docMaybe: Document | null;
  winMaybe: Window | null;
  overlayRef: RefBox<HTMLDivElement | null>;
  orderNoInputRef: RefBox<HTMLInputElement | null>;
  prevFocusRef: RefBox<HTMLElement | null>;
  didInitialFocusRef: RefBox<boolean>;
  reportNonFatal: ReportNonFatal;
};

type KeyboardGuardDeps = {
  open: boolean;
  docMaybe: Document | null;
  winMaybe: Window | null;
  inlineConfirm: InlineDetailsConfirmState | null;
  confirmInlineOk: () => void;
  confirmInlineCancel: () => void;
  close: () => void;
  reportNonFatal: ReportNonFatal;
};
export function installOrderPdfOverlayKeyboardGuards(deps: KeyboardGuardDeps): () => void {
  const {
    open,
    docMaybe,
    winMaybe,
    inlineConfirm,
    confirmInlineOk,
    confirmInlineCancel,
    close,
    reportNonFatal,
  } = deps;
  if (!open) return () => {};

  const doc = docMaybe;
  const win = (doc && doc.defaultView ? doc.defaultView : null) || winMaybe || null;
  if (!win) return () => {};

  const onKey = (event: KeyboardEvent) => {
    try {
      const action = resolveOrderPdfOverlayKeyboardGuardAction({ event, inlineConfirm, doc });
      if (!action) return;
      try {
        event.preventDefault();
        event.stopPropagation();
      } catch (__wpErr) {
        const op =
          action === 'confirm-ok'
            ? 'orderPdfKeyboard:confirmEnterPreventDefault'
            : action === 'confirm-cancel'
              ? 'orderPdfKeyboard:confirmEscapePreventDefault'
              : 'orderPdfKeyboard:escapePreventDefault';
        reportNonFatal(op, __wpErr);
      }
      if (action === 'confirm-ok') {
        confirmInlineOk();
        return;
      }
      if (action === 'confirm-cancel') {
        confirmInlineCancel();
        return;
      }
      close();
    } catch (__wpErr) {
      reportNonFatal('orderPdfKeyboard:onKey', __wpErr);
    }
  };

  return installDomEventListener({
    target: win,
    type: 'keydown',
    listener: onKey as EventListener,
    options: CAPTURE_TRUE,
    label: 'orderPdfKeyboard',
    onError: reportNonFatal,
  });
}
export function installOrderPdfOverlayFocusTrap(deps: FocusTrapDeps): () => void {
  const {
    open,
    docMaybe,
    winMaybe,
    overlayRef,
    orderNoInputRef,
    prevFocusRef,
    didInitialFocusRef,
    reportNonFatal,
  } = deps;

  if (!open) {
    didInitialFocusRef.current = false;
    return () => {};
  }

  const doc = docMaybe;
  const win = (doc && doc.defaultView ? doc.defaultView : null) || winMaybe || null;
  if (!doc || !win) return () => {};

  if (!prevFocusRef.current) {
    try {
      const active = doc.activeElement;
      prevFocusRef.current =
        active && typeof active === 'object' && (active as { nodeType?: unknown }).nodeType === 1
          ? (active as HTMLElement)
          : null;
    } catch (__wpErr) {
      reportNonFatal('orderPdfFocusTrap:readPrevFocus', __wpErr);
    }
  }

  const focusSession = createOrderPdfOverlayInitialFocusSession({
    win,
    orderNoInputRef,
    reportNonFatal,
  });

  if (!didInitialFocusRef.current) {
    didInitialFocusRef.current = true;
    focusSession.schedule();
  }

  const onKeyDown = (event: KeyboardEvent) => {
    try {
      trapOrderPdfOverlayTabKey({
        event,
        doc,
        win,
        overlayRef,
        orderNoInputRef,
        reportNonFatal,
      });
    } catch (__wpErr) {
      reportNonFatal('orderPdfFocusTrap:onKeyDown', __wpErr);
    }
  };

  const cleanupKeydown = installDomEventListener({
    target: win,
    type: 'keydown',
    listener: onKeyDown as EventListener,
    options: CAPTURE_TRUE,
    label: 'orderPdfFocusTrap',
    onError: reportNonFatal,
  });

  return () => {
    focusSession.cancel();
    cleanupKeydown();
    try {
      const prev = prevFocusRef.current;
      prevFocusRef.current = null;
      if (prev) prev.focus();
    } catch (__wpErr) {
      reportNonFatal('orderPdfFocusTrap:restorePrevFocus', __wpErr);
    }
  };
}
