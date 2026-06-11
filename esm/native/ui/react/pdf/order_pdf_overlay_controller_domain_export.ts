import type { OrderPdfDraft, PdfJsLibLike } from './order_pdf_overlay_contracts.js';
import type { OrderPdfRichKind } from './order_pdf_overlay_rich_editors.js';

export type ExportFactoryApi = {
  createOrderPdfOverlayExportOps: (args: {
    docMaybe: Document | null;
    winMaybe: Window | null;
    ensurePdfJs: () => Promise<PdfJsLibLike>;
    _buildInteractivePdfBlobForEditorDraft: (draft: OrderPdfDraft) => Promise<{
      blob: Blob;
      fileName: string;
      projectName: string;
    }>;
    getFn: <T>(obj: unknown, key: string) => T | null;
    getProp: (obj: unknown, key: string) => unknown;
    isPromiseLike: (value: unknown) => value is Promise<unknown>;
    isRecord: (value: unknown) => value is Record<string, unknown>;
    orderPdfOverlayReportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
    canvasToPngBytes: (canvas: HTMLCanvasElement, winMaybe: Window | null | undefined) => Promise<Uint8Array>;
  }) => {
    rasterizeInteractivePdfBytesToImagePdfBytes: (args: {
      inBytes: Uint8Array;
      baseFileName: string;
      draft: OrderPdfDraft;
    }) => Promise<{ outBytes: Uint8Array; outName: string }>;
    buildImagePdfAttachmentFromDraft: (draft: OrderPdfDraft) => Promise<{
      fileName?: string;
      projectName?: string;
      orderNumber?: string;
      pdfBytes: Uint8Array;
      blob: Blob;
    }>;
  };
  createOrderPdfOverlayGmailOps: (args: {
    docMaybe: Document | null;
    winMaybe: Window | null;
    applyTemplate: (
      template: string,
      vars: { projectName: string; orderNumber: string; fileName: string }
    ) => string;
    subjectTemplate: string;
    bodyTemplate: string;
    buildImagePdfAttachmentFromDraft: (draft: OrderPdfDraft) => Promise<{
      fileName?: string;
      projectName?: string;
      orderNumber?: string;
      pdfBytes: Uint8Array;
    }>;
    buildInteractivePdfBlobForEditorDraft: (draft: OrderPdfDraft) => Promise<{
      blob: Blob;
      fileName: string;
      projectName: string;
    }>;
    rasterizeInteractivePdfBytesToImagePdfBytes: (args: {
      inBytes: Uint8Array;
      baseFileName: string;
      draft: OrderPdfDraft;
    }) => Promise<{ outBytes: Uint8Array; outName: string }>;
    triggerBlobDownloadViaBrowser: (
      ctx: { docMaybe: Document | null; winMaybe: Window | null },
      blob: Blob,
      fileName: string
    ) => boolean;
  }) => {
    exportInteractiveToGmail: (draft: OrderPdfDraft) => Promise<{ opened: boolean }>;
    exportInteractiveDownloadAndGmail: (
      draft: OrderPdfDraft
    ) => Promise<{ opened: boolean; downloaded: boolean }>;
  };
};

export type GmailApi = {
  applyTemplate: (
    template: string,
    vars: { projectName: string; orderNumber: string; fileName: string }
  ) => string;
  subjectTemplate: string;
  bodyTemplate: string;
  triggerBlobDownloadViaBrowser: (
    ctx: { docMaybe: Document | null; winMaybe: Window | null },
    blob: Blob,
    fileName: string
  ) => boolean;
};

export type RichProgrammaticApi = {
  markRichProgrammatic: (kind: OrderPdfRichKind) => void;
  clearRichProgrammatic: (kind: OrderPdfRichKind) => void;
  isRichProgrammatic: (kind: OrderPdfRichKind) => boolean;
};
