import type { AppContainer } from '../../../../types/app.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import type { ExportOrderPdfTextOps } from './export_order_pdf_text_contracts.js';
import type { PdfWidthFontLike } from './export_order_pdf_contracts_shared.js';

export type PdfRectLike = { x: number; y: number; w: number; h: number };
export type PdfClassLike = abstract new (...init: readonly unknown[]) => Record<string, unknown>;

export interface PdfImageLike {
  width: number;
  height: number;
  [k: string]: unknown;
}

export interface PdfPageLike {
  getSize: () => { width: number; height: number };
  drawImage: (img: unknown, opts: { x: number; y: number; width: number; height: number }) => unknown;
  [k: string]: unknown;
}

export interface PdfFormLike {
  getTextField: (name: string) => PdfTextFieldLike;
  createTextField: (name: string) => PdfTextFieldLike;
  setNeedAppearances?: (v: boolean) => unknown;
  acroForm?: unknown;
  [k: string]: unknown;
}

export interface PdfFieldAddToPageOptionsLike {
  x: number;
  y: number;
  width: number;
  height: number;
  font?: unknown;
  fontSize?: number;
  textColor?: unknown;
  borderWidth?: number;
  [k: string]: unknown;
}

export interface PdfEmbedFontOptionsLike {
  subset?: boolean;
  [k: string]: unknown;
}

export interface PdfSaveOptionsLike {
  updateFieldAppearances?: boolean;
  [k: string]: unknown;
}

export interface PdfTextFieldLike {
  acroField?: unknown;
  addToPage: (page: unknown, opts?: PdfFieldAddToPageOptionsLike) => unknown;
  enableMultiline: () => unknown;
  setAlignment: (align: unknown) => unknown;
  setMaxLength: (n: number) => unknown;
  setReadOnly: (v: boolean) => unknown;
  setText: (text: string) => unknown;
  setFontSize: (n: number) => unknown;
  [k: string]: unknown;
}

export interface PdfDocLike {
  registerFontkit?: (fk: unknown) => unknown;
  embedFont: (bytes: Uint8Array, opts?: PdfEmbedFontOptionsLike) => Promise<PdfWidthFontLike>;
  embedPng: (bytes: Uint8Array) => Promise<PdfImageLike>;
  getPages: () => PdfPageLike[];
  addPage: (size?: unknown) => PdfPageLike;
  getForm: () => PdfFormLike;
  save: (opts?: PdfSaveOptionsLike) => Promise<Uint8Array>;
  context?: unknown;
  catalog?: unknown;
  [k: string]: unknown;
}

export type OrderPdfResolvedDraftLike = {
  projectName: string;
  orderNumber: string;
  orderDate: string;
  deliveryAddress: string;
  phone: string;
  mobile: string;
  notes: string;
  orderDetails: string;
  includeRenderSketch: boolean;
  includeOpenClosed: boolean;
};

export type OrderPdfDetailsSplitLike = {
  page1Text: string;
  overflowText: string;
};

export type OrderPdfBuilderRuntimeLike = {
  pdfDoc: PdfDocLike;
  form: PdfFormLike;
  font: PdfWidthFontLike;
  firstPage: PdfPageLike;
  pageWidth: number;
  pageHeight: number;
  black: unknown;
  TextAlignment: Record<string, unknown>;
  updateDefaultAppearance:
    | ((acroField: unknown, color: unknown, font: unknown, fontSize: number) => unknown)
    | null;
  PDFName: { of: (name: string) => unknown };
  PDFNumber: { of: (n: number) => unknown };
  PDFBool: { True?: unknown } | null;
  PDFDict: PdfClassLike;
  PDFArray: PdfClassLike;
  PDFRef: PdfClassLike;
  PDFString: (PdfClassLike & { of?: (s: string) => unknown }) | null;
  PDFHexString: PdfClassLike | null;
  asText: (obj: unknown) => string;
  parseFontNamesFromDA: (daObj: unknown) => string[];
};

export type OrderPdfFieldSpecLike = {
  templateFieldName: string;
  fallbackFieldName: string;
  key: string;
  value: string;
  box: PdfRectLike;
  multiline?: boolean;
  align?: unknown;
};

export type OrderPdfBuilderContextLike = {
  App: AppContainer;
  deps: ExportOrderPdfDeps;
  textOps: ExportOrderPdfTextOps;
  runtime: OrderPdfBuilderRuntimeLike;
};

export type OrderPdfBuilderTemplateOps = {
  validateTemplate: (requiredTemplateFields: readonly string[]) => { ok: boolean; problems: string[] };
  applyNeedAppearances: () => void;
};

export type OrderPdfBuilderFieldOps = {
  setFieldText: (spec: OrderPdfFieldSpecLike) => void;
  addOverflowDetailsPage: (text: string, align: unknown) => Promise<void>;
  addCompositeImagesPage: (pngBytes: Uint8Array) => Promise<void>;
};
