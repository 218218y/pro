import { useMemo } from 'react';

import { triggerBlobDownloadViaBrowser } from '../../../services/api.js';
import {
  GMAIL_BODY_TEMPLATE,
  GMAIL_SUBJECT_TEMPLATE,
  _applyTemplate,
} from './order_pdf_overlay_constants.js';
import {
  asRecord,
  canvasToPngBytes,
  clamp,
  ensureExportApiReady,
  errorNameMessage,
  fetchFirstOk,
  getFn,
  getProp,
  getOrderPdfDraftFn,
  isPromiseLike,
  isRecord,
  orderPdfOverlayReportNonFatal,
} from './order_pdf_overlay_runtime.js';
import {
  buildDetailsHtmlWithMarkers,
  htmlToTextPreserveNewlines,
  normalizeForCompare,
  safeStr,
  textToHtml,
} from './order_pdf_overlay_text.js';
import { createOrderPdfOverlayExportOps } from './order_pdf_overlay_export_ops.js';
import { createOrderPdfOverlayGmailOps } from './order_pdf_overlay_gmail_ops.js';
import {
  buildUntouchedDetailsRefreshDraft,
  createOrderPdfInitialDraft,
  patchOrderPdfDraftField,
  readOrderPdfDraftSeed,
  resolveOrderPdfRefreshAuto,
  syncOrderPdfDraftFromRichEditors,
  toggleOrderPdfDraftFlag,
} from './order_pdf_overlay_draft_state.js';
import {
  applyExtractedLoadedPdfDraft,
  buildInteractivePdfBlobForEditorDraft,
  cleanPdfForEditorBackground,
  detectTrailingImportedImagePages,
  extractLoadedPdfDraftFields,
  readPdfFileBytes,
} from './order_pdf_overlay_pdf_import.js';
import {
  captureStagePointerDown,
  captureStagePointerMove,
  createInitialStageGesture,
  finishStagePointerUp,
  installOrderPdfOverlayFocusTrap,
  installOrderPdfOverlayKeyboardGuards,
  loadPdfFileFromDrop,
  loadPdfFileFromInput,
  preventStageDragEvent,
  resetStageGesture,
} from './order_pdf_overlay_interactions.js';
import {
  cleanupOrderPdfDocTask,
  cleanupOrderPdfLoadedDocument,
  ensureOrderPdfJs,
  fetchOrderPdfTemplateBytes,
  isOrderPdfLoadCancelled,
  loadOrderPdfFirstPage,
  resetOrderPdfRenderSession,
  scheduleOrderPdfCanvasRender,
} from './order_pdf_overlay_pdf_render.js';
import {
  createOrderPdfDetailsEditorHandlers,
  createOrderPdfNotesEditorHandlers,
} from './order_pdf_overlay_rich_editors.js';
import type {
  OrderPdfOverlayControllerApis,
  OrderPdfOverlayControllerEnv,
} from './order_pdf_overlay_controller_shared.js';
import { useOrderPdfOverlayRichProgrammatic } from './order_pdf_overlay_component_runtime_rich.js';

export function useOrderPdfOverlayComponentApis(args: {
  app: OrderPdfOverlayControllerEnv['app'];
  fb: OrderPdfOverlayControllerEnv['fb'];
  docMaybe: Document | null;
  winMaybe: Window | null;
}): OrderPdfOverlayControllerApis {
  const { app, fb, docMaybe, winMaybe } = args;
  void app;
  void fb;
  void docMaybe;
  const richProgrammaticApi = useOrderPdfOverlayRichProgrammatic(winMaybe);

  const runtimeApi = useMemo(
    () => ({
      asRecord,
      ensureExportApiReady,
      getOrderPdfDraftFn,
      orderPdfOverlayReportNonFatal,
      errorNameMessage,
      clamp,
      fetchFirstOk,
      getFn,
      getProp,
      isPromiseLike,
      isRecord,
      canvasToPngBytes,
    }),
    []
  );

  const textApi = useMemo(
    () => ({
      safeStr,
      textToHtml,
      htmlToTextPreserveNewlines,
      buildDetailsHtmlWithMarkers,
      normalizeForCompare,
    }),
    []
  );

  const draftStateApi = useMemo(
    () => ({
      buildUntouchedDetailsRefreshDraft,
      createOrderPdfInitialDraft,
      patchOrderPdfDraftField,
      readOrderPdfDraftSeed,
      resolveOrderPdfRefreshAuto,
      syncOrderPdfDraftFromRichEditors,
      toggleOrderPdfDraftFlag,
    }),
    []
  );

  const pdfImportApi = useMemo(
    () => ({
      applyExtractedLoadedPdfDraft,
      buildInteractivePdfBlobForEditorDraft,
      cleanPdfForEditorBackground,
      detectTrailingImportedImagePages,
      extractLoadedPdfDraftFields,
      readPdfFileBytes,
    }),
    []
  );

  const interactionApi = useMemo(
    () => ({
      captureStagePointerDown,
      captureStagePointerMove,
      createInitialStageGesture,
      finishStagePointerUp,
      installOrderPdfOverlayFocusTrap,
      installOrderPdfOverlayKeyboardGuards,
      loadPdfFileFromDrop,
      loadPdfFileFromInput,
      preventStageDragEvent,
      resetStageGesture,
    }),
    []
  );

  const pdfRenderApi = useMemo(
    () => ({
      cleanupOrderPdfDocTask,
      cleanupOrderPdfLoadedDocument,
      ensureOrderPdfJs,
      fetchOrderPdfTemplateBytes,
      isOrderPdfLoadCancelled,
      loadOrderPdfFirstPage,
      resetOrderPdfRenderSession,
      scheduleOrderPdfCanvasRender,
    }),
    []
  );

  const richEditorApi = useMemo(
    () => ({
      createOrderPdfDetailsEditorHandlers,
      createOrderPdfNotesEditorHandlers,
    }),
    []
  );

  const exportFactoryApi = useMemo(
    () => ({
      createOrderPdfOverlayExportOps,
      createOrderPdfOverlayGmailOps,
    }),
    []
  );

  const gmailApi = useMemo(
    () => ({
      applyTemplate: _applyTemplate,
      subjectTemplate: GMAIL_SUBJECT_TEMPLATE,
      bodyTemplate: GMAIL_BODY_TEMPLATE,
      triggerBlobDownloadViaBrowser,
    }),
    []
  );

  return useMemo(
    () => ({
      runtimeApi,
      textApi,
      draftStateApi,
      pdfImportApi,
      interactionApi,
      pdfRenderApi,
      richEditorApi,
      exportFactoryApi,
      gmailApi,
      richProgrammaticApi,
    }),
    [
      runtimeApi,
      textApi,
      draftStateApi,
      pdfImportApi,
      interactionApi,
      pdfRenderApi,
      richEditorApi,
      exportFactoryApi,
      gmailApi,
      richProgrammaticApi,
    ]
  );
}
