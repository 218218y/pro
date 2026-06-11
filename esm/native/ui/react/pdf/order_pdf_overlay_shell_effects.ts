import { useEffect } from 'react';

import { setSanitizedElementHtmlIfChanged } from '../../html_sanitize_runtime.js';
import type { InlineDetailsConfirmState, OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import type { InteractionApi, RichProgrammaticApi, TextApi } from './order_pdf_overlay_controller_shared.js';
import { readOrderPdfRichEditorSnapshotFromDraft } from './order_pdf_overlay_rich_editor_runtime.js';

export function useOrderPdfOverlayShellEffects(args: {
  open: boolean;
  draft: OrderPdfDraft | null;
  docMaybe: Document | null;
  winMaybe: Window | null;
  detailsRichRef: { current: HTMLDivElement | null };
  notesRichRef: { current: HTMLDivElement | null };
  overlayRef: { current: HTMLDivElement | null };
  orderNoInputRef: { current: HTMLInputElement | null };
  prevFocusRef: { current: HTMLElement | null };
  didInitialFocusRef: { current: boolean };
  detailsUserIntentRef: { current: boolean };
  inlineConfirm: InlineDetailsConfirmState | null;
  confirmInlineOk: () => void;
  confirmInlineCancel: () => void;
  close: () => void;
  markRichProgrammatic: RichProgrammaticApi['markRichProgrammatic'];
  textApi: Pick<TextApi, 'safeStr' | 'textToHtml' | 'htmlToTextPreserveNewlines'>;
  interactionApi: Pick<
    InteractionApi,
    'installOrderPdfOverlayFocusTrap' | 'installOrderPdfOverlayKeyboardGuards'
  >;
  reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
}): void {
  const {
    open,
    draft,
    docMaybe,
    winMaybe,
    detailsRichRef,
    notesRichRef,
    overlayRef,
    orderNoInputRef,
    prevFocusRef,
    didInitialFocusRef,
    detailsUserIntentRef,
    inlineConfirm,
    confirmInlineOk,
    confirmInlineCancel,
    close,
    markRichProgrammatic,
    textApi,
    interactionApi,
    reportNonFatal,
  } = args;
  const { safeStr, textToHtml, htmlToTextPreserveNewlines } = textApi;
  const { installOrderPdfOverlayFocusTrap, installOrderPdfOverlayKeyboardGuards } = interactionApi;

  useEffect(
    () =>
      installOrderPdfOverlayKeyboardGuards({
        open,
        docMaybe,
        winMaybe,
        inlineConfirm,
        confirmInlineOk,
        confirmInlineCancel,
        close,
        reportNonFatal,
      }),
    [
      open,
      docMaybe,
      winMaybe,
      inlineConfirm,
      confirmInlineOk,
      confirmInlineCancel,
      close,
      installOrderPdfOverlayKeyboardGuards,
      reportNonFatal,
    ]
  );

  useEffect(
    () =>
      installOrderPdfOverlayFocusTrap({
        open,
        docMaybe,
        winMaybe,
        overlayRef,
        orderNoInputRef,
        prevFocusRef,
        didInitialFocusRef,
        reportNonFatal,
      }),
    [
      open,
      docMaybe,
      winMaybe,
      overlayRef,
      orderNoInputRef,
      prevFocusRef,
      didInitialFocusRef,
      installOrderPdfOverlayFocusTrap,
      reportNonFatal,
    ]
  );

  useEffect(() => {
    if (!open || !draft || !docMaybe) return;

    const active = docMaybe.activeElement;
    const snapshot = readOrderPdfRichEditorSnapshotFromDraft({
      draft,
      textApi: { safeStr, textToHtml, htmlToTextPreserveNewlines },
      reportNonFatal,
    });

    const detailsEl = detailsRichRef.current;
    if (detailsEl && active !== detailsEl) {
      const detailsWrite = setSanitizedElementHtmlIfChanged({
        el: detailsEl,
        html: snapshot.detailsHtml,
        doc: docMaybe,
        policy: 'order-pdf-rich',
      });
      if (detailsWrite.changed) {
        markRichProgrammatic('details');
        detailsUserIntentRef.current = false;
      }
    }

    const notesEl = notesRichRef.current;
    if (notesEl && active !== notesEl) {
      const notesWrite = setSanitizedElementHtmlIfChanged({
        el: notesEl,
        html: snapshot.notesHtml,
        doc: docMaybe,
        policy: 'order-pdf-rich',
      });
      if (notesWrite.changed) {
        markRichProgrammatic('notes');
      }
    }
  }, [
    open,
    draft,
    docMaybe,
    detailsRichRef,
    notesRichRef,
    markRichProgrammatic,
    detailsUserIntentRef,
    safeStr,
    textToHtml,
    htmlToTextPreserveNewlines,
    reportNonFatal,
  ]);
}
