import type { OrderPdfDraftLike } from '../../../../types/build.js';
import { normalizeOrderPdfExportDraft } from './export_order_pdf_draft_runtime.js';

type UnknownRecord = Record<string, unknown>;

type AsRecordLike = (value: unknown) => UnknownRecord | null;

export function normalizeOrderPdfDraft(asRecordFn: AsRecordLike, value: unknown): OrderPdfDraftLike {
  return normalizeOrderPdfExportDraft(asRecordFn, value);
}
