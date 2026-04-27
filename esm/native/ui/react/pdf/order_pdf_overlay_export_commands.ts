import type { MutableRefObject } from 'react';

import { normalizeUnknownError } from '../../../services/api.js';
import {
  hasAnyOrderPdfImportedRichDraftFieldValue,
  type OrderPdfImportedRichDraftFieldValues,
} from './order_pdf_overlay_imported_draft_fields_runtime.js';
import type {
  ExportDownloadGmailActionResult,
  ExportGmailActionResult,
  ExportImagePdfActionResult,
  ExportInteractiveActionResult,
  LoadPdfActionResult,
  OrderPdfDraft,
  PdfJsLibLike,
} from './order_pdf_overlay_contracts.js';

type RuntimeApiLike = {
  orderPdfOverlayReportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
};

type PdfImportApiLike = {
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

type LoadPdfCommandArgs = {
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

type DownloadInteractivePdfArgs = {
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

type DownloadImagePdfArgs = {
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

type GmailCommandResult = ExportGmailActionResult | ExportDownloadGmailActionResult;

type GmailCommandArgs = {
  draft: OrderPdfDraft | null;
  gmailBusy: boolean;
  gmailAction: (draft: OrderPdfDraft) => Promise<{ opened: boolean; downloaded?: boolean }>;
  kind: GmailCommandResult['kind'];
};

function readErrorDetail(error: unknown): string {
  return normalizeUnknownError(error).message.trim();
}

function buildLoadPdfError(error: unknown): Extract<LoadPdfActionResult, { ok: false }> {
  const detail = readErrorDetail(error);
  return detail
    ? { ok: false, kind: 'load-pdf', reason: 'error', detail }
    : { ok: false, kind: 'load-pdf', reason: 'error' };
}

function buildExportInteractiveError(error: unknown): Extract<ExportInteractiveActionResult, { ok: false }> {
  const detail = readErrorDetail(error);
  return detail
    ? { ok: false, kind: 'export-interactive', reason: 'error', detail }
    : { ok: false, kind: 'export-interactive', reason: 'error' };
}

function buildExportImagePdfError(error: unknown): Extract<ExportImagePdfActionResult, { ok: false }> {
  const detail = readErrorDetail(error);
  return detail
    ? { ok: false, kind: 'export-image-pdf', reason: 'error', detail }
    : { ok: false, kind: 'export-image-pdf', reason: 'error' };
}

function buildGmailError(
  kind: GmailCommandResult['kind'],
  error: unknown
): Extract<GmailCommandResult, { ok: false }> {
  const detail = readErrorDetail(error);
  return detail ? { ok: false, kind, reason: 'error', detail } : { ok: false, kind, reason: 'error' };
}

export async function loadOrderPdfIntoEditorWithDeps(args: LoadPdfCommandArgs): Promise<LoadPdfActionResult> {
  const {
    file,
    draft,
    pdfImportApi,
    loadedPdfOriginalBytesRef,
    loadedPdfTailNonFormPageIndexesRef,
    setImportedPdfImagePageCount,
    persistDraft,
    pdfBytesRef,
    setPdfSourceTick,
    reportError,
  } = args;

  try {
    const bytes = await pdfImportApi.readPdfFileBytes(file);
    if (!bytes || !bytes.length) {
      return { ok: false, kind: 'load-pdf', reason: 'invalid-file' };
    }

    const importedTailPages = await pdfImportApi.detectTrailingImportedImagePages(bytes);
    const extracted = await pdfImportApi.extractLoadedPdfDraftFields(bytes);
    const next = pdfImportApi.applyExtractedLoadedPdfDraft(draft, extracted, importedTailPages);
    const fieldsFound = hasAnyOrderPdfImportedRichDraftFieldValue(extracted);
    const cleaned = await pdfImportApi.cleanPdfForEditorBackground(bytes);

    loadedPdfOriginalBytesRef.current = bytes;
    loadedPdfTailNonFormPageIndexesRef.current = importedTailPages;
    setImportedPdfImagePageCount(importedTailPages.length);
    persistDraft(next);
    pdfBytesRef.current = cleaned;
    setPdfSourceTick(t => Number(t) + 1);

    return { ok: true, kind: 'load-pdf', fieldsFound };
  } catch (error) {
    reportError('orderPdfLoad:command', error);
    return buildLoadPdfError(error);
  }
}

export async function exportOrderPdfInteractiveWithDeps(
  args: DownloadInteractivePdfArgs
): Promise<ExportInteractiveActionResult> {
  const { draft, buildInteractivePdfBlob, triggerBlobDownloadViaBrowser, docMaybe, winMaybe } = args;
  if (!draft) return { ok: false, kind: 'export-interactive', reason: 'not-ready' };

  try {
    const built = await buildInteractivePdfBlob(draft);
    const downloadStarted = triggerBlobDownloadViaBrowser({ docMaybe, winMaybe }, built.blob, built.fileName);
    return { ok: true, kind: 'export-interactive', downloadStarted };
  } catch (error) {
    return buildExportInteractiveError(error);
  }
}

export async function exportOrderPdfImageWithDeps(
  args: DownloadImagePdfArgs
): Promise<ExportImagePdfActionResult> {
  const {
    draft,
    imagePdfBusy,
    buildImagePdfAttachmentFromDraft,
    triggerBlobDownloadViaBrowser,
    docMaybe,
    winMaybe,
  } = args;
  if (!draft) return { ok: false, kind: 'export-image-pdf', reason: 'not-ready' };
  if (imagePdfBusy) return { ok: false, kind: 'export-image-pdf', reason: 'busy' };

  try {
    const built = await buildImagePdfAttachmentFromDraft(draft);
    const fileName = String(built.fileName || 'order_image.pdf');
    const downloadStarted = triggerBlobDownloadViaBrowser({ docMaybe, winMaybe }, built.blob, fileName);
    return { ok: true, kind: 'export-image-pdf', downloadStarted };
  } catch (error) {
    return buildExportImagePdfError(error);
  }
}

export async function exportOrderPdfViaGmailWithDeps(args: GmailCommandArgs): Promise<GmailCommandResult> {
  const { draft, gmailBusy, gmailAction, kind } = args;
  if (!draft) return { ok: false, kind, reason: 'not-ready' };
  if (gmailBusy) return { ok: false, kind, reason: 'busy' };

  try {
    const result = await gmailAction(draft);
    return {
      ok: true,
      kind,
      gmailOpened: !!result.opened,
      downloadStarted: typeof result.downloaded === 'boolean' ? result.downloaded : undefined,
    };
  } catch (error) {
    return buildGmailError(kind, error);
  }
}

export async function ensureOrderPdfJsWithDeps(args: {
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
}): Promise<PdfJsLibLike> {
  const { app, realWorkerUrl, pdfJsRef, ensureOrderPdfJs, reportNonFatal } = args;
  return await ensureOrderPdfJs({
    app,
    realWorkerUrl,
    pdfJsRef,
    reportNonFatal,
  });
}
