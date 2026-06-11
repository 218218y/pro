// Canonical runtime barrel for the Order PDF overlay.
// Runtime window helpers keep the PDF.js worker path on a small module worker that silences chatty logs.
// Create a small module worker that silences chatty logs while preserving the real PDF.js worker import path.

export * from './order_pdf_overlay_runtime_shared.js';
export * from './order_pdf_overlay_runtime_window.js';
export * from './order_pdf_overlay_runtime_export.js';
export type {
  InlineDetailsConfirmState,
  OrderPdfDraft,
  PdfJsDocumentLike,
  PdfJsGlobalWorkerOptionsLike,
  PdfJsLibLike,
  PdfJsLoadingTaskLike,
  PdfJsPageLike,
  PdfJsVerbosityLevelLike,
} from './order_pdf_overlay_contracts.js';
