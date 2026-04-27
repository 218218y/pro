import type { OrderPdfTextApi } from './order_pdf_overlay_text_api.js';
import {
  hasOrderPdfTextValue,
  resolveOrderPdfRichTextHtml,
} from './order_pdf_overlay_details_fields_runtime.js';

export type OrderPdfNotesFields = {
  notes: string;
  notesHtml: string;
};

export type OrderPdfNotesTextApi = Pick<
  OrderPdfTextApi,
  'safeStr' | 'textToHtml' | 'htmlToTextPreserveNewlines'
>;

type ReportNonFatal = (op: string, err: unknown, dedupeMs?: number) => void;

export function createOrderPdfNotesFields(args: {
  notes: unknown;
  notesHtml?: unknown;
  textApi: OrderPdfNotesTextApi;
  reportNonFatal?: ReportNonFatal;
  htmlToTextReportOp?: string;
  htmlReportOp?: string;
}): OrderPdfNotesFields {
  const { textApi, reportNonFatal } = args;
  const explicitNotes = textApi.safeStr(args.notes);
  const explicitHtml = textApi.safeStr(args.notesHtml);

  let notes = explicitNotes;
  if (!notes && explicitHtml) {
    try {
      notes = textApi.htmlToTextPreserveNewlines(null, explicitHtml);
    } catch (err) {
      reportNonFatal?.(args.htmlToTextReportOp || 'orderPdfNotes:htmlToText', err);
      notes = '';
    }
  }

  const notesHtml = hasOrderPdfTextValue(notes)
    ? resolveOrderPdfRichTextHtml({
        text: notes,
        html: explicitHtml,
        textApi: { safeStr: textApi.safeStr, textToHtml: textApi.textToHtml },
        reportNonFatal,
        reportOp: args.htmlReportOp || 'orderPdfNotes:textToHtml',
      })
    : '';

  return {
    notes,
    notesHtml,
  };
}

export function buildOrderPdfNotesFieldsFromUiRecord(args: {
  rec: Record<string, unknown>;
  textApi: OrderPdfNotesTextApi;
  reportNonFatal?: ReportNonFatal;
}): OrderPdfNotesFields {
  return createOrderPdfNotesFields({
    notes: args.rec.notes,
    notesHtml: args.rec.notesHtml,
    textApi: args.textApi,
    reportNonFatal: args.reportNonFatal,
    htmlToTextReportOp: 'orderPdfNotesDraftSync:htmlToText',
    htmlReportOp: 'orderPdfNotesDraftSync:textToHtml',
  });
}
