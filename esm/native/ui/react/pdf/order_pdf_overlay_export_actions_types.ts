import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type {
  InteractivePdfBuildResult,
  OrderPdfDraft,
  OrderPdfOverlayActionResult,
  OrderPdfSketchPreviewEntry,
  PdfJsLibLike,
} from './order_pdf_overlay_contracts.js';
import type {
  ExportFactoryApi,
  GmailApi,
  OrderPdfOverlayControllerEnv,
  PdfImportApi,
  PdfRenderApi,
  RuntimeApi,
} from './order_pdf_overlay_controller_shared.js';

export type OrderPdfOverlayExportActionsArgs = {
  env: Pick<OrderPdfOverlayControllerEnv, 'app' | 'fb' | 'docMaybe' | 'winMaybe' | 'pdfJsRealWorkerUrl'>;
  draft: OrderPdfDraft | null;
  gmailBusy: boolean;
  imagePdfBusy: boolean;
  setGmailBusy: Dispatch<SetStateAction<boolean>>;
  setImagePdfBusy: Dispatch<SetStateAction<boolean>>;
  setImportedPdfImagePageCount: Dispatch<SetStateAction<number>>;
  pdfSourceTick: number;
  setPdfSourceTick: Dispatch<SetStateAction<number>>;
  pdfJsRef: MutableRefObject<PdfJsLibLike | null>;
  pdfBytesRef: MutableRefObject<Uint8Array | null>;
  loadedPdfOriginalBytesRef: MutableRefObject<Uint8Array | null>;
  loadedPdfTailNonFormPageIndexesRef: MutableRefObject<number[]>;
  persistDraft: (next: OrderPdfDraft) => void;
  pdfImportApi: PdfImportApi;
  pdfRenderApi: Pick<PdfRenderApi, 'ensureOrderPdfJs'>;
  exportFactoryApi: ExportFactoryApi;
  gmailApi: GmailApi;
  runtimeApi: Pick<
    RuntimeApi,
    'canvasToPngBytes' | 'getFn' | 'getProp' | 'isPromiseLike' | 'isRecord' | 'orderPdfOverlayReportNonFatal'
  >;
};

export type OrderPdfOverlayExportActionsApi = {
  ensurePdfJs: () => Promise<PdfJsLibLike>;
  loadPdfIntoEditor: (file: File) => Promise<OrderPdfOverlayActionResult>;
  exportInteractive: () => Promise<OrderPdfOverlayActionResult>;
  exportImagePdf: () => Promise<OrderPdfOverlayActionResult>;
  exportInteractiveToGmail: () => Promise<OrderPdfOverlayActionResult>;
  exportInteractiveDownloadAndGmail: () => Promise<OrderPdfOverlayActionResult>;
  buildSketchPreview: () => Promise<OrderPdfSketchPreviewEntry[]>;
};

export type OrderPdfOverlayActionToastApplier = (
  result: OrderPdfOverlayActionResult
) => OrderPdfOverlayActionResult;

export type OrderPdfOverlayInteractivePdfBlobBuilder = (
  draft: OrderPdfDraft
) => Promise<InteractivePdfBuildResult>;

export type OrderPdfOverlayExportOps = ReturnType<ExportFactoryApi['createOrderPdfOverlayExportOps']>;
export type OrderPdfOverlayGmailOps = ReturnType<ExportFactoryApi['createOrderPdfOverlayGmailOps']>;
