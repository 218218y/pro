import {
  getFn,
  getProp,
  orderPdfOverlayReportNonFatal,
  tryClearPdfTextField,
} from './order_pdf_overlay_runtime.js';
import { collectTrailingNonFormPageIndexes } from './order_pdf_overlay_pdf_import_shared.js';
import {
  loadPdfDocumentCtor,
  loadPdfLibNamespace,
  loadPdfNameCtor,
  type PdfLibDrawablePageLike,
} from './order_pdf_overlay_pdf_lib.js';
import {
  getOrderPdfFieldReadNames,
  ORDER_PDF_DETAILS_CONTINUATION_FIELD_NAMES,
} from '../../pdf/order_pdf_document_fields_runtime.js';
import { ORDER_PDF_FIELD_KEYS, ORDER_PDF_FIELD_SPECS } from '../../pdf/order_pdf_field_specs_runtime.js';

const ORDER_PDF_EDITOR_BACKGROUND_REDACTION_BLEED = 2;
const ORDER_PDF_TEMPLATE_PAGE_WIDTH = 595;

type PdfLibRgbFn = (r: number, g: number, b: number) => unknown;
type PdfLibFormLookupLike = {
  getTextField?: (name: string) => unknown;
};
type PdfLibFieldWidgetSource = {
  acroField?: unknown;
  getText?: () => string | undefined;
};

function asFieldWidgetSource(value: unknown): PdfLibFieldWidgetSource | null {
  return value && typeof value === 'object' ? (value as PdfLibFieldWidgetSource) : null;
}

function readFieldWidgets(field: unknown): unknown[] {
  const src = asFieldWidgetSource(field);
  const acro = getProp(src, 'acroField');
  const getWidgets = getFn<() => unknown[]>(acro, 'getWidgets');
  if (!getWidgets) return [];
  try {
    const widgets = getWidgets();
    return Array.isArray(widgets) ? widgets : [];
  } catch {
    return [];
  }
}

function getTextFieldMaybe(form: PdfLibFormLookupLike, name: string): unknown {
  if (!name || typeof form.getTextField !== 'function') return null;
  try {
    return form.getTextField(name);
  } catch {
    return null;
  }
}

function readHiddenImportFieldNames(): readonly string[] {
  const names: string[] = [];
  for (const key of ORDER_PDF_FIELD_KEYS) {
    const readNames = getOrderPdfFieldReadNames(key);
    const fallbackName = String(readNames[1] || '');
    if (fallbackName) names.push(fallbackName);
  }
  const continuation = String(ORDER_PDF_DETAILS_CONTINUATION_FIELD_NAMES[0] || '');
  if (continuation) names.push(continuation);
  return Object.freeze(names);
}

function hasWidgetlessOrderPdfImageImportFields(form: unknown): boolean {
  if (!form || typeof form !== 'object') return false;
  const lookup = form as PdfLibFormLookupLike;
  let foundWidgetlessImportFields = 0;

  for (const name of readHiddenImportFieldNames()) {
    const field = getTextFieldMaybe(lookup, name);
    if (!field) continue;
    if (readFieldWidgets(field).length > 0) return false;
    foundWidgetlessImportFields += 1;
  }

  // The image-PDF exporter writes a set of metadata-style fields without page widgets.
  // Requiring at least two of them avoids treating a random unattached helper field as
  // a flattened order PDF whose visible raster text should be blanked from the editor background.
  return foundWidgetlessImportFields >= 2;
}

function asDrawablePage(value: unknown): PdfLibDrawablePageLike | null {
  return value && typeof value === 'object' ? (value as PdfLibDrawablePageLike) : null;
}

function readPageSize(page: PdfLibDrawablePageLike): { width: number; height: number } {
  try {
    if (typeof page.getSize === 'function') {
      const size = page.getSize();
      const width = Number(size?.width);
      const height = Number(size?.height);
      if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
        return { width, height };
      }
    }
  } catch {
    // fall through to the template size
  }
  return { width: ORDER_PDF_TEMPLATE_PAGE_WIDTH, height: 842 };
}

function redactFlattenedOrderTextBoxesFromFirstPage(args: {
  pdfDoc: { getPages?: () => unknown[] };
  rgb: PdfLibRgbFn | null;
}): boolean {
  const { pdfDoc, rgb } = args;
  if (!rgb || typeof pdfDoc.getPages !== 'function') return false;
  const pages = pdfDoc.getPages();
  const page = asDrawablePage(Array.isArray(pages) ? pages[0] : null);
  if (!page || typeof page.drawRectangle !== 'function') return false;

  const pageSize = readPageSize(page);
  const sx = pageSize.width / ORDER_PDF_TEMPLATE_PAGE_WIDTH;
  const sy = pageSize.height / 842;
  const white = rgb(1, 1, 1);

  for (const key of ORDER_PDF_FIELD_KEYS) {
    const box = ORDER_PDF_FIELD_SPECS[key].templateBox;
    const bleedX = ORDER_PDF_EDITOR_BACKGROUND_REDACTION_BLEED * sx;
    const bleedY = ORDER_PDF_EDITOR_BACKGROUND_REDACTION_BLEED * sy;
    const x = Math.max(0, box.x * sx - bleedX);
    const y = Math.max(0, box.y * sy - bleedY);
    page.drawRectangle({
      x,
      y,
      width: Math.max(1, Math.min(pageSize.width - x, box.w * sx + bleedX * 2)),
      height: Math.max(1, Math.min(pageSize.height - y, box.h * sy + bleedY * 2)),
      color: white,
      borderWidth: 0,
      opacity: 1,
    });
  }

  return true;
}

async function loadPdfRgbCtor(): Promise<PdfLibRgbFn | null> {
  try {
    const pdfLib = await loadPdfLibNamespace();
    return typeof pdfLib.rgb === 'function' ? (pdfLib.rgb as PdfLibRgbFn) : null;
  } catch {
    return null;
  }
}

export async function cleanPdfForEditorBackground(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    const PDFDocument = await loadPdfDocumentCtor();
    const PDFName = await loadPdfNameCtor();
    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm ? pdfDoc.getForm() : null;
    const shouldRedactFlattenedOrderText = hasWidgetlessOrderPdfImageImportFields(form);
    const fields = form && typeof form.getFields === 'function' ? form.getFields() : [];

    for (const field of fields || []) {
      try {
        tryClearPdfTextField(field);
      } catch (__wpErr) {
        orderPdfOverlayReportNonFatal('orderPdfImport:clearTextField', __wpErr);
      }
      try {
        const acro = getProp(field, 'acroField');
        const getWidgets = getFn<() => unknown[]>(acro, 'getWidgets');
        const widgets = getWidgets ? getWidgets() : [];
        for (const widget of widgets || []) {
          const dict = getProp(widget, 'dict');
          const del = getFn<(k: unknown) => unknown>(dict, 'delete');
          if (del) del(PDFName.of('AP'));
        }
      } catch (__wpErr) {
        orderPdfOverlayReportNonFatal('orderPdfImport:clearWidgetAppearance', __wpErr);
      }
    }

    try {
      const acroForm =
        pdfDoc.catalog && typeof pdfDoc.catalog.get === 'function'
          ? pdfDoc.catalog.get(PDFName.of('AcroForm'))
          : null;
      if (acroForm) {
        const del = getFn<(k: unknown) => unknown>(acroForm, 'delete');
        if (del) del(PDFName.of('NeedAppearances'));
      }
    } catch (__wpErr) {
      orderPdfOverlayReportNonFatal('orderPdfImport:clearNeedAppearances', __wpErr);
    }

    if (shouldRedactFlattenedOrderText) {
      try {
        redactFlattenedOrderTextBoxesFromFirstPage({ pdfDoc, rgb: await loadPdfRgbCtor() });
      } catch (__wpErr) {
        orderPdfOverlayReportNonFatal('orderPdfImport:redactFlattenedOrderText', __wpErr);
      }
    }

    if (typeof pdfDoc.save !== 'function') return bytes;
    const out = await pdfDoc.save({ updateFieldAppearances: false });
    return out;
  } catch {
    return bytes;
  }
}

export async function detectTrailingImportedImagePages(bytes: Uint8Array): Promise<number[]> {
  try {
    const PDFDocument = await loadPdfDocumentCtor();
    const pdfDoc = await PDFDocument.load(bytes);
    return await collectTrailingNonFormPageIndexes(pdfDoc);
  } catch {
    return [];
  }
}
