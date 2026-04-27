import {
  getFn,
  getProp,
  orderPdfOverlayReportNonFatal,
  tryClearPdfTextField,
} from './order_pdf_overlay_runtime.js';
import { collectTrailingNonFormPageIndexes } from './order_pdf_overlay_pdf_import_shared.js';
import { loadPdfDocumentCtor, loadPdfNameCtor } from './order_pdf_overlay_pdf_lib.js';

export async function cleanPdfForEditorBackground(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    const PDFDocument = await loadPdfDocumentCtor();
    const PDFName = await loadPdfNameCtor();
    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm ? pdfDoc.getForm() : null;
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
