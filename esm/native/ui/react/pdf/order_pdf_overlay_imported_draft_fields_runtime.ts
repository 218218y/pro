import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import {
  createOrderPdfInitialDetailsFields,
  hasOrderPdfTextValue,
} from './order_pdf_overlay_details_fields_runtime.js';
import { createOrderPdfNotesFields } from './order_pdf_overlay_notes_fields_runtime.js';
import { applyOrderPdfImportedImageDefaultsToDraft } from './order_pdf_overlay_sketch_image_slots_runtime.js';
import {
  buildDetailsHtmlWithMarkers,
  htmlToTextPreserveNewlines,
  makeEmptyDraft,
  normalizeForCompare,
  safeStr,
  textToHtml,
} from './order_pdf_overlay_text.js';
import {
  applyNonEmptyOrderPdfScalarFieldValues,
  hasAnyOrderPdfImportedDraftFieldValue,
  type OrderPdfImportedDraftFieldValues,
} from '../../pdf/order_pdf_document_fields_runtime.js';

export type OrderPdfImportedRichDraftFieldValues = OrderPdfImportedDraftFieldValues & {
  manualDetailsHtml?: string;
  notesHtml?: string;
};

type ReportNonFatal = (op: string, err: unknown, dedupeMs?: number) => void;

function normalizeExtractedRichText(value: unknown): string {
  return safeStr(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasAnyOrderPdfImportedRichDraftFieldValue(
  extracted: OrderPdfImportedRichDraftFieldValues | null | undefined
): boolean {
  if (!extracted) return false;
  return (
    hasAnyOrderPdfImportedDraftFieldValue(extracted) ||
    normalizeExtractedRichText(extracted.manualDetailsHtml).length > 0 ||
    normalizeExtractedRichText(extracted.notesHtml).length > 0
  );
}

function readImportedRichTextAsPlainText(args: {
  text: unknown;
  html: unknown;
  reportOp: string;
  reportNonFatal?: ReportNonFatal;
}): string {
  const explicitText = safeStr(args.text);
  if (explicitText) return explicitText;
  const html = safeStr(args.html);
  if (!html) return '';
  try {
    return htmlToTextPreserveNewlines(null, html).trimEnd();
  } catch (err) {
    args.reportNonFatal?.(args.reportOp, err);
    return '';
  }
}

export function applyOrderPdfImportedDraftFields(args: {
  baseDraft: OrderPdfDraft | null | undefined;
  extracted: OrderPdfImportedRichDraftFieldValues;
  importedTailPages?: number[] | null | undefined;
  reportNonFatal?: ReportNonFatal;
}): OrderPdfDraft {
  const { extracted, importedTailPages, reportNonFatal } = args;
  const base: OrderPdfDraft = args.baseDraft || makeEmptyDraft();
  const next: OrderPdfDraft = { ...base };

  applyNonEmptyOrderPdfScalarFieldValues({ target: next, source: extracted });

  const manualDetails = readImportedRichTextAsPlainText({
    text: extracted.manualDetails,
    html: extracted.manualDetailsHtml,
    reportOp: 'orderPdfImport:manualDetailsHtmlToText',
    reportNonFatal,
  });
  const manualDetailsHtml = safeStr(extracted.manualDetailsHtml);
  if (hasOrderPdfTextValue(manualDetails) || normalizeExtractedRichText(manualDetailsHtml).length > 0) {
    Object.assign(
      next,
      createOrderPdfInitialDetailsFields({
        autoDetails: next.autoDetails,
        manualDetails,
        manualDetailsHtml,
        manualEnabled: true,
        textApi: { safeStr, textToHtml, buildDetailsHtmlWithMarkers, normalizeForCompare },
        reportNonFatal,
      }).fields
    );
  }

  const importedNotes = readImportedRichTextAsPlainText({
    text: extracted.notes,
    html: extracted.notesHtml,
    reportOp: 'orderPdfImport:notesHtmlToText',
    reportNonFatal,
  });

  const nextNotes = createOrderPdfNotesFields({
    notes: importedNotes,
    notesHtml: extracted.notesHtml,
    textApi: { safeStr, textToHtml, htmlToTextPreserveNewlines },
    reportNonFatal,
    htmlToTextReportOp: 'orderPdfImport:notesHtmlToText',
    htmlReportOp: 'orderPdfImport:notesHtml',
  });
  if (hasOrderPdfTextValue(nextNotes.notes) || normalizeExtractedRichText(extracted.notesHtml).length > 0) {
    Object.assign(next, nextNotes);
  }

  return applyOrderPdfImportedImageDefaultsToDraft({
    draft: next,
    importedTailPageIndexes: importedTailPages,
  });
}
