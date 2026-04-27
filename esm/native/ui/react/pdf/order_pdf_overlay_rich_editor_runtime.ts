import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import type { OrderPdfTextApi } from './order_pdf_overlay_text_api.js';
import {
  createOrderPdfDetailsFields,
  resolveOrderPdfRichTextHtml,
} from './order_pdf_overlay_details_fields_runtime.js';
import { createOrderPdfNotesFields } from './order_pdf_overlay_notes_fields_runtime.js';
import { safeStr } from './order_pdf_overlay_text.js';

type ReportNonFatal = (op: string, err: unknown, dedupeMs?: number) => void;

export type OrderPdfRichEditorTextApi = Pick<
  OrderPdfTextApi,
  | 'safeStr'
  | 'textToHtml'
  | 'htmlToTextPreserveNewlines'
  | 'buildDetailsHtmlWithMarkers'
  | 'normalizeForCompare'
>;

export type OrderPdfRichEditorSnapshot = {
  detailsHtml: string;
  notesHtml: string;
};

export type OrderPdfRichEditorSyncValue = {
  html: string;
  text: string;
};

function assignOrderPdfDraftFieldIfChanged<K extends keyof OrderPdfDraft>(args: {
  base: OrderPdfDraft;
  next: OrderPdfDraft | null;
  key: K;
  value: OrderPdfDraft[K];
}): OrderPdfDraft | null {
  const { base, key, value } = args;
  const current = args.next || base;
  if (Object.is(current[key], value)) return args.next;
  const next = args.next ? args.next : { ...base };
  next[key] = value;
  return next;
}

export function readOrderPdfRichEditorSnapshotFromDraft(args: {
  draft: OrderPdfDraft | null | undefined;
  textApi: Pick<OrderPdfRichEditorTextApi, 'safeStr' | 'textToHtml' | 'htmlToTextPreserveNewlines'>;
  reportNonFatal?: ReportNonFatal;
}): OrderPdfRichEditorSnapshot {
  const { draft, textApi, reportNonFatal } = args;
  if (!draft) return { detailsHtml: '', notesHtml: '' };

  const detailsHtml = resolveOrderPdfRichTextHtml({
    text: draft.manualDetails || '',
    html: draft.manualDetailsHtml,
    textApi: { safeStr, textToHtml: textApi.textToHtml },
    reportNonFatal,
    reportOp: 'orderPdfShell:detailsHtml',
  });

  const { notesHtml } = createOrderPdfNotesFields({
    notes: draft.notes || '',
    notesHtml: draft.notesHtml,
    textApi: {
      safeStr: textApi.safeStr,
      textToHtml: textApi.textToHtml,
      htmlToTextPreserveNewlines: textApi.htmlToTextPreserveNewlines,
    },
    reportNonFatal,
    htmlToTextReportOp: 'orderPdfShell:notesHtmlToText',
    htmlReportOp: 'orderPdfShell:notesHtml',
  });

  return { detailsHtml, notesHtml };
}

export function syncOrderPdfDraftFromRichEditorValues(args: {
  draft: OrderPdfDraft | null | undefined;
  details?: OrderPdfRichEditorSyncValue | null;
  notes?: OrderPdfRichEditorSyncValue | null;
  detailsDirty: boolean;
  textApi: OrderPdfRichEditorTextApi;
  reportNonFatal?: ReportNonFatal;
}): OrderPdfDraft | null {
  const { draft, details, notes, detailsDirty, textApi, reportNonFatal } = args;
  if (!draft) return null;

  let next: OrderPdfDraft | null = null;

  if (details) {
    const touchedNow = !!draft.detailsTouched || !!detailsDirty;
    const nextDetails = createOrderPdfDetailsFields({
      autoDetails: draft.autoDetails,
      detailsText: details.text,
      detailsHtml: details.html,
      detailsSeed: draft.detailsSeed || draft.autoDetails || details.text,
      detailsTouched: touchedNow,
      manualEnabled: touchedNow,
      autoRegionTextForMarkers: touchedNow ? null : details.text,
      textApi: {
        safeStr: textApi.safeStr,
        textToHtml: textApi.textToHtml,
        buildDetailsHtmlWithMarkers: textApi.buildDetailsHtmlWithMarkers,
        normalizeForCompare: textApi.normalizeForCompare,
      },
      reportNonFatal,
      markerReportOp: 'orderPdfRichEditorSync:detailsMarkers',
      htmlReportOp: 'orderPdfRichEditorSync:detailsHtml',
    });

    next = assignOrderPdfDraftFieldIfChanged({
      base: draft,
      next,
      key: 'manualDetailsHtml',
      value: nextDetails.manualDetailsHtml,
    });
    next = assignOrderPdfDraftFieldIfChanged({
      base: draft,
      next,
      key: 'manualDetails',
      value: nextDetails.manualDetails,
    });
    next = assignOrderPdfDraftFieldIfChanged({ base: draft, next, key: 'detailsFull', value: true });
    next = assignOrderPdfDraftFieldIfChanged({
      base: draft,
      next,
      key: 'detailsTouched',
      value: nextDetails.detailsTouched,
    });
    next = assignOrderPdfDraftFieldIfChanged({
      base: draft,
      next,
      key: 'manualEnabled',
      value: nextDetails.manualEnabled,
    });
    next = assignOrderPdfDraftFieldIfChanged({
      base: draft,
      next,
      key: 'detailsSeed',
      value: nextDetails.detailsSeed,
    });
  }

  if (notes) {
    const nextNotes = createOrderPdfNotesFields({
      notes: notes.text,
      notesHtml: notes.html,
      textApi: {
        safeStr: textApi.safeStr,
        textToHtml: textApi.textToHtml,
        htmlToTextPreserveNewlines: textApi.htmlToTextPreserveNewlines,
      },
      reportNonFatal,
      htmlToTextReportOp: 'orderPdfRichEditorSync:notesHtmlToText',
      htmlReportOp: 'orderPdfRichEditorSync:notesHtml',
    });
    next = assignOrderPdfDraftFieldIfChanged({
      base: draft,
      next,
      key: 'notesHtml',
      value: nextNotes.notesHtml,
    });
    next = assignOrderPdfDraftFieldIfChanged({ base: draft, next, key: 'notes', value: nextNotes.notes });
  }

  return next;
}
