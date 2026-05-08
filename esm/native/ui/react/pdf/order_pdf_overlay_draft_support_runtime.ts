import {
  mergeOrderPdfScalarFieldValues,
  type OrderPdfScalarFieldKey,
} from '../../pdf/order_pdf_document_fields_runtime.js';
import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import {
  createOrderPdfNotesFields,
  type OrderPdfNotesTextApi,
} from './order_pdf_overlay_notes_fields_runtime.js';
import { cloneOrderPdfSketchAnnotations } from './order_pdf_overlay_sketch_annotation_state_runtime.js';
import { resolveOrderPdfSketchImageDraftFlags } from './order_pdf_overlay_sketch_image_slots_runtime.js';

export type OrderPdfDraftSupportSeedLike = Partial<
  Pick<OrderPdfDraft, OrderPdfScalarFieldKey | 'notes' | 'notesHtml'>
>;

export type OrderPdfInitialDraftSupportFields = Pick<
  OrderPdfDraft,
  OrderPdfScalarFieldKey | 'notes' | 'notesHtml'
>;

export type OrderPdfRefreshCarryFields = Pick<
  OrderPdfDraft,
  | OrderPdfScalarFieldKey
  | 'notes'
  | 'notesHtml'
  | 'includeRenderSketch'
  | 'includeOpenClosed'
  | 'sketchAnnotations'
>;

export function buildOrderPdfInitialDraftSupportFields(args: {
  seed: OrderPdfDraftSupportSeedLike | null | undefined;
  textApi: OrderPdfNotesTextApi;
  defaultProjectName?: unknown;
}): OrderPdfInitialDraftSupportFields {
  const { seed, textApi } = args;
  return {
    ...mergeOrderPdfScalarFieldValues({ preferred: seed, defaultProjectName: args.defaultProjectName }),
    ...createOrderPdfNotesFields({
      notes: seed?.notes,
      notesHtml: seed?.notesHtml,
      textApi,
    }),
  };
}

export function buildOrderPdfRefreshCarryFields(args: {
  currentDraft: OrderPdfDraft | null | undefined;
  source: OrderPdfDraftSupportSeedLike | null | undefined;
  textApi: OrderPdfNotesTextApi;
  defaultProjectName?: unknown;
}): OrderPdfRefreshCarryFields {
  const { currentDraft, source, textApi } = args;
  const prev = currentDraft || null;
  return {
    ...mergeOrderPdfScalarFieldValues({
      preferred: prev,
      secondary: source,
      defaultProjectName: args.defaultProjectName,
    }),
    ...createOrderPdfNotesFields({
      notes: prev ? prev.notes : source?.notes,
      notesHtml: prev ? prev.notesHtml : source?.notesHtml,
      textApi,
    }),
    ...resolveOrderPdfSketchImageDraftFlags(prev),
    sketchAnnotations: cloneOrderPdfSketchAnnotations(prev?.sketchAnnotations),
  };
}
