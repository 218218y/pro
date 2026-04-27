import {
  readOrderPdfScalarFieldValues,
  type OrderPdfScalarFieldKey,
} from '../../pdf/order_pdf_document_fields_runtime.js';
import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import {
  areOrderPdfSketchAnnotationsEqual,
  readOrderPdfSketchAnnotations,
} from './order_pdf_overlay_sketch_annotation_state_runtime.js';
import {
  buildOrderPdfDetailsFieldsFromUiRecord,
  type OrderPdfDetailsTextApi,
} from './order_pdf_overlay_details_fields_runtime.js';
import {
  buildOrderPdfNotesFieldsFromUiRecord,
  type OrderPdfNotesTextApi,
} from './order_pdf_overlay_notes_fields_runtime.js';
import { readOrderPdfSketchImageDraftFlags } from './order_pdf_overlay_sketch_image_slots_runtime.js';
import { makeEmptyDraft } from './order_pdf_overlay_text.js';

export type OrderPdfDraftRecordFieldKey =
  | OrderPdfScalarFieldKey
  | 'autoDetails'
  | 'manualDetails'
  | 'manualDetailsHtml'
  | 'detailsFull'
  | 'detailsSeed'
  | 'detailsTouched'
  | 'manualEnabled'
  | 'notes'
  | 'notesHtml'
  | 'includeRenderSketch'
  | 'includeOpenClosed';

export const ORDER_PDF_DRAFT_RECORD_FIELD_KEYS: readonly OrderPdfDraftRecordFieldKey[] = Object.freeze([
  'projectName',
  'orderNumber',
  'orderDate',
  'deliveryAddress',
  'phone',
  'mobile',
  'autoDetails',
  'manualDetails',
  'manualDetailsHtml',
  'detailsFull',
  'detailsSeed',
  'detailsTouched',
  'manualEnabled',
  'notes',
  'notesHtml',
  'includeRenderSketch',
  'includeOpenClosed',
]);

export function readOrderPdfDraftRecord(args: {
  rec: Record<string, unknown>;
  detailsDirtyRef: { current: boolean };
  textApi: OrderPdfDetailsTextApi & OrderPdfNotesTextApi;
  reportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
  preserveUndefinedFlags?: boolean;
}): OrderPdfDraft {
  const { rec, detailsDirtyRef, textApi, reportNonFatal } = args;
  const detailsFields = buildOrderPdfDetailsFieldsFromUiRecord({
    rec,
    detailsDirtyRef,
    textApi,
    reportNonFatal,
  });
  const notesFields = buildOrderPdfNotesFieldsFromUiRecord({
    rec,
    textApi,
    reportNonFatal,
  });

  return {
    ...readOrderPdfScalarFieldValues(rec),
    ...detailsFields,
    ...notesFields,
    ...readOrderPdfSketchImageDraftFlags({
      source: rec,
      preserveUndefinedFlags: !!args.preserveUndefinedFlags,
    }),
    sketchAnnotations: readOrderPdfSketchAnnotations(rec.sketchAnnotations),
  };
}

export function areOrderPdfDraftRecordsEqual(
  a: OrderPdfDraft | null | undefined,
  b: OrderPdfDraft | null | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  for (const key of ORDER_PDF_DRAFT_RECORD_FIELD_KEYS) {
    if (!Object.is(a[key], b[key])) return false;
  }
  return areOrderPdfSketchAnnotationsEqual(a.sketchAnnotations, b.sketchAnnotations);
}

export function patchOrderPdfDraftScalarFieldValue<K extends OrderPdfScalarFieldKey>(args: {
  draft: OrderPdfDraft | null | undefined;
  key: K;
  value: OrderPdfDraft[K];
}): OrderPdfDraft {
  const { draft, key, value } = args;
  if (draft && Object.is(draft[key], value)) return draft;
  const next: OrderPdfDraft = { ...(draft || makeEmptyDraft()) };
  next[key] = value;
  return next;
}
