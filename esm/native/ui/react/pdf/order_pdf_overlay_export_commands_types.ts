import type { MutableRefObject } from 'react';

import type {
  ExportDownloadGmailActionResult,
  ExportGmailActionResult,
  OrderPdfDraft,
  PdfJsLibLike,
} from './order_pdf_overlay_contracts.js';
import type { OrderPdfImportedRichDraftFieldValues } from './order_pdf_overlay_imported_draft_fields_runtime.js';

export type RuntimeApiLike = {
  orderPdfOverlayReportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
};

export type PdfImportApiLike = {
  readPdfFileBytes: (file: File) => Promise<Uint8Array | null>;
  detectTrailingImportedImagePages: (bytes: Uint8Array) => Promise<number[]>;
  extractLoadedPdfDraftFields: (bytes: Uint8Array) => Promise<OrderPdfImportedRichDraftFieldValues>;
  applyExtractedLoadedPdfDraft: (
    draft: OrderPdfDraft | null,
    extracted: OrderPdfImportedRichDraftFieldValues,
    importedTailPages?: number[]
  ) => OrderPdfDraft;
  cleanPdfForEditorBackground: (bytes: Uint8Array) => Promise<Uint8Array>;
  buildInteractivePdfBlobForEditorDraft: (args: {
    app: unknown;
    winMaybe: Window | null | undefined;
    draft: OrderPdfDraft;
    loadedPdfOriginalBytes: Uint8Array | null;
    importedTailIndexes: number[];
  }) => Promise<{ blob: Blob; fileName: string; projectName: string }>;
};

export type LoadPdfCommandArgs = {
  file: File;
  draft: OrderPdfDraft | null;
  pdfImportApi: Pick<
    PdfImportApiLike,
    | 'readPdfFileBytes'
    | 'detectTrailingImportedImagePages'
    | 'extractLoadedPdfDraftFields'
    | 'applyExtractedLoadedPdfDraft'
    | 'cleanPdfForEditorBackground'
  >;
  loadedPdfOriginalBytesRef: MutableRefObject<Uint8Array | null> | { current: Uint8Array | null };
  loadedPdfTailNonFormPageIndexesRef: MutableRefObject<number[]> | { current: number[] };
  setImportedPdfImagePageCount: (count: number | ((prev: number) => number)) => void;
  persistDraft: (next: OrderPdfDraft) => void;
  pdfBytesRef: MutableRefObject<Uint8Array | null> | { current: Uint8Array | null };
  setPdfSourceTick: (next: number | ((prev: number) => number)) => void;
  reportError: RuntimeApiLike['orderPdfOverlayReportNonFatal'];
};

export type DownloadInteractivePdfArgs = {
  draft: OrderPdfDraft | null;
  buildInteractivePdfBlob: (draft: OrderPdfDraft) => Promise<{ blob: Blob; fileName: string }>;
  triggerBlobDownloadViaBrowser: (
    ctx: { docMaybe: Document | null; winMaybe: Window | null },
    blob: Blob,
    fileName: string
  ) => boolean;
  docMaybe: Document | null;
  winMaybe: Window | null;
};

export type DownloadImagePdfArgs = {
  draft: OrderPdfDraft | null;
  imagePdfBusy: boolean;
  buildImagePdfAttachmentFromDraft: (draft: OrderPdfDraft) => Promise<{
    blob: Blob;
    fileName?: string;
  }>;
  triggerBlobDownloadViaBrowser: (
    ctx: { docMaybe: Document | null; winMaybe: Window | null },
    blob: Blob,
    fileName: string
  ) => boolean;
  docMaybe: Document | null;
  winMaybe: Window | null;
};

export type GmailCommandResult = ExportGmailActionResult | ExportDownloadGmailActionResult;

export type GmailCommandArgs = {
  draft: OrderPdfDraft | null;
  gmailBusy: boolean;
  gmailAction: (draft: OrderPdfDraft) => Promise<{ opened: boolean; downloaded?: boolean }>;
  kind: GmailCommandResult['kind'];
};

export type EnsureOrderPdfJsCommandArgs = {
  app: unknown;
  realWorkerUrl: string;
  pdfJsRef: MutableRefObject<PdfJsLibLike | null> | { current: PdfJsLibLike | null };
  ensureOrderPdfJs: (args: {
    app: unknown;
    realWorkerUrl: string;
    pdfJsRef: { current: PdfJsLibLike | null };
    reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
  }) => Promise<PdfJsLibLike>;
  reportNonFatal: RuntimeApiLike['orderPdfOverlayReportNonFatal'];
};
