import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';

export type PdfImportApi = {
  applyExtractedLoadedPdfDraft: (
    draft: OrderPdfDraft | null,
    extracted: {
      orderNumber?: string;
      orderDate?: string;
      projectName?: string;
      deliveryAddress?: string;
      phone?: string;
      mobile?: string;
      manualDetails?: string;
      manualDetailsHtml?: string;
      notes?: string;
      notesHtml?: string;
    },
    importedTailPages?: number[]
  ) => OrderPdfDraft;
  buildInteractivePdfBlobForEditorDraft: (args: {
    app: unknown;
    winMaybe: Window | null | undefined;
    draft: OrderPdfDraft;
    loadedPdfOriginalBytes: Uint8Array | null;
    importedTailIndexes: number[];
  }) => Promise<{ blob: Blob; fileName: string; projectName: string }>;
  cleanPdfForEditorBackground: (bytes: Uint8Array) => Promise<Uint8Array>;
  detectTrailingImportedImagePages: (bytes: Uint8Array) => Promise<number[]>;
  extractLoadedPdfDraftFields: (bytes: Uint8Array) => Promise<{
    orderNumber?: string;
    orderDate?: string;
    projectName?: string;
    deliveryAddress?: string;
    phone?: string;
    mobile?: string;
    manualDetails?: string;
    manualDetailsHtml?: string;
    notes?: string;
    notesHtml?: string;
  }>;
  readPdfFileBytes: (file: File) => Promise<Uint8Array | null>;
};
