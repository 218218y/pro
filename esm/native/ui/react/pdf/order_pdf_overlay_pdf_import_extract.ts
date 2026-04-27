import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import { orderPdfOverlayReportNonFatal } from './order_pdf_overlay_runtime.js';
import {
  applyOrderPdfImportedDraftFields,
  type OrderPdfImportedRichDraftFieldValues,
} from './order_pdf_overlay_imported_draft_fields_runtime.js';
import { loadPdfDocumentCtor } from './order_pdf_overlay_pdf_lib.js';
import { readOrderPdfImportedDraftFieldValues } from '../../pdf/order_pdf_document_fields_runtime.js';

export type ExtractedLoadedPdfDraftFields = OrderPdfImportedRichDraftFieldValues;

export async function readPdfFileBytes(file: File): Promise<Uint8Array | null> {
  try {
    const ab = await file.arrayBuffer();
    return new Uint8Array(ab);
  } catch {
    return null;
  }
}

type PdfFormFieldNameSource = { getName?: () => string } | null | undefined;

function readPdfFormFieldNames(form: { getFields?: () => unknown[] } | null): Set<string> {
  if (!form || typeof form.getFields !== 'function') return new Set<string>();
  const fields = form.getFields();
  const names = new Set<string>();
  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i] as PdfFormFieldNameSource;
    const name = field && typeof field.getName === 'function' ? String(field.getName() || '') : '';
    if (name) names.add(name);
  }
  return names;
}

export async function extractLoadedPdfDraftFields(bytes: Uint8Array): Promise<ExtractedLoadedPdfDraftFields> {
  try {
    const PDFDocument = await loadPdfDocumentCtor();
    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm ? pdfDoc.getForm() : null;
    const formFieldNames = readPdfFormFieldNames(form);

    const readText = (names: readonly string[]): string => {
      for (const name of names) {
        if (!formFieldNames.has(name)) continue;
        try {
          const field =
            form && typeof form.getTextField === 'function'
              ? (form.getTextField(name) as { getText?: () => string } | null)
              : null;
          const text = field && typeof field.getText === 'function' ? field.getText() : '';
          const normalized = String(text || '').trimEnd();
          if (normalized) return normalized;
        } catch (__wpErr) {
          orderPdfOverlayReportNonFatal('orderPdfImport:readTextField', __wpErr);
        }
      }
      return '';
    };

    return readOrderPdfImportedDraftFieldValues(readText);
  } catch {
    return {};
  }
}

export function applyExtractedLoadedPdfDraft(
  baseDraft: OrderPdfDraft | null | undefined,
  extracted: ExtractedLoadedPdfDraftFields,
  importedTailPages: number[] | null | undefined
): OrderPdfDraft {
  return applyOrderPdfImportedDraftFields({
    baseDraft,
    extracted,
    importedTailPages,
    reportNonFatal: orderPdfOverlayReportNonFatal,
  });
}
