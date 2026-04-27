import type { OrderPdfDraftLike } from '../../../../types/build.js';
import type { OrderPdfResolvedDraftLike } from './export_order_pdf_builder_contracts.js';
import { resolveOrderPdfDetailsTextFromDraft } from '../pdf/order_pdf_details_runtime.js';
import { resolveOrderPdfScalarFieldValues } from '../pdf/order_pdf_document_fields_runtime.js';
import { readOrderPdfDraftRecord } from '../react/pdf/order_pdf_overlay_draft_record_runtime.js';
import { resolveOrderPdfSketchImageDraftFlags } from '../react/pdf/order_pdf_overlay_sketch_image_slots_runtime.js';
import {
  buildDetailsHtmlWithMarkers,
  htmlToTextPreserveNewlines,
  normalizeForCompare,
  safeStr,
  textToHtml,
} from '../react/pdf/order_pdf_overlay_text.js';

type UnknownRecord = Record<string, unknown>;
type AsRecordLike = (value: unknown) => UnknownRecord | null;

const EXPORT_ORDER_PDF_TEXT_API = Object.freeze({
  safeStr,
  textToHtml,
  htmlToTextPreserveNewlines,
  buildDetailsHtmlWithMarkers,
  normalizeForCompare,
});

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

function asUnknownRecord(value: unknown): UnknownRecord | null {
  return isUnknownRecord(value) ? value : null;
}

export function normalizeOrderPdfExportDraft(asRecordFn: AsRecordLike, value: unknown): OrderPdfDraftLike {
  const rec = asRecordFn(value) ?? {};
  return readOrderPdfDraftRecord({
    rec,
    detailsDirtyRef: { current: false },
    textApi: EXPORT_ORDER_PDF_TEXT_API,
    reportNonFatal: () => undefined,
    preserveUndefinedFlags: true,
  });
}

export function resolveOrderPdfExportDraft(args: {
  draft: OrderPdfDraftLike | null | undefined;
  fallbackProjectName?: unknown;
  fallbackOrderDate?: unknown;
  autoDetailsFallback?: unknown;
}): OrderPdfResolvedDraftLike {
  const normalizedDraft = normalizeOrderPdfExportDraft(asUnknownRecord, args.draft);
  const scalarFields = resolveOrderPdfScalarFieldValues({
    source: normalizedDraft,
    fallbackProjectName: args.fallbackProjectName,
    fallbackOrderDate: args.fallbackOrderDate,
  });

  const imageFlags = resolveOrderPdfSketchImageDraftFlags(normalizedDraft);

  return {
    ...scalarFields,
    notes: safeStr(normalizedDraft.notes),
    orderDetails: resolveOrderPdfDetailsTextFromDraft(normalizedDraft, args.autoDetailsFallback),
    includeRenderSketch: imageFlags.includeRenderSketch,
    includeOpenClosed: imageFlags.includeOpenClosed,
  };
}
