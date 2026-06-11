import { readInnerHtml } from '../../dom_helpers.js';
import type { InlineDetailsConfirmState, OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import {
  createOrderPdfDetailsFields,
  createOrderPdfInitialDetailsFields,
} from './order_pdf_overlay_details_fields_runtime.js';
import { resolveOrderPdfSketchImageDraftFlags } from './order_pdf_overlay_sketch_image_slots_runtime.js';
import {
  buildOrderPdfInitialDraftSupportFields,
  buildOrderPdfRefreshCarryFields,
} from './order_pdf_overlay_draft_support_runtime.js';
import { patchOrderPdfDraftScalarFieldValue } from './order_pdf_overlay_draft_record_runtime.js';
import { syncOrderPdfDraftFromRichEditorValues } from './order_pdf_overlay_rich_editor_runtime.js';
import { asRecord } from './order_pdf_overlay_runtime.js';
import {
  readOrderPdfScalarFieldValues,
  type OrderPdfScalarFieldKey,
} from '../../pdf/order_pdf_document_fields_runtime.js';
import {
  buildDetailsHtmlWithMarkers,
  htmlToTextPreserveNewlines,
  makeEmptyDraft,
  mergeAutoDetailsWithInlineManual,
  normalizeForCompare,
  richEditorToText,
  safeStr,
  textToHtml,
} from './order_pdf_overlay_text.js';

export type OrderPdfDraftSeed = {
  projectName: string;
  orderNumber: string;
  orderDate: string;
  deliveryAddress: string;
  phone: string;
  mobile: string;
  autoDetails: string;
  manualDetails: string;
  manualDetailsHtml: string;
  manualEnabled: boolean;
  notes: string;
  notesHtml: string;
};

export type OrderPdfRefreshAutoResult =
  | { kind: 'persist'; next: OrderPdfDraft }
  | { kind: 'confirm'; confirm: InlineDetailsConfirmState };

export function readOrderPdfDraftSeed(value: unknown): OrderPdfDraftSeed {
  const rec = asRecord(value);
  return {
    ...readOrderPdfScalarFieldValues(rec),
    autoDetails: safeStr(rec?.autoDetails),
    manualDetails: safeStr(rec?.manualDetails),
    manualDetailsHtml: safeStr(rec?.manualDetailsHtml),
    manualEnabled: !!rec?.manualEnabled,
    notes: safeStr(rec?.notes),
    notesHtml: safeStr(rec?.notesHtml),
  };
}

export function createOrderPdfInitialDraft(seed: OrderPdfDraftSeed): {
  draft: OrderPdfDraft;
  detailsDirty: boolean;
} {
  const initialDetails = createOrderPdfInitialDetailsFields({
    autoDetails: seed.autoDetails,
    manualDetails: seed.manualDetails,
    manualDetailsHtml: seed.manualDetailsHtml,
    manualEnabled: seed.manualEnabled,
    textApi: { safeStr, textToHtml, buildDetailsHtmlWithMarkers, normalizeForCompare },
  });

  const initialSupportFields = buildOrderPdfInitialDraftSupportFields({
    seed,
    textApi: { safeStr, textToHtml, htmlToTextPreserveNewlines },
    fallbackProjectName: 'פרויקט',
  });

  return {
    draft: {
      ...initialSupportFields,
      ...initialDetails.fields,
    },
    detailsDirty: initialDetails.detailsDirty,
  };
}

export type OrderPdfEditableScalarField = OrderPdfScalarFieldKey;

type OrderPdfToggleField = keyof Pick<OrderPdfDraft, 'includeRenderSketch' | 'includeOpenClosed'>;

export function patchOrderPdfDraftField<K extends OrderPdfEditableScalarField>(
  draft: OrderPdfDraft | null | undefined,
  key: K,
  value: OrderPdfDraft[K]
): OrderPdfDraft {
  return patchOrderPdfDraftScalarFieldValue({ draft, key, value });
}

export function toggleOrderPdfDraftFlag<K extends OrderPdfToggleField>(
  draft: OrderPdfDraft | null | undefined,
  key: K
): OrderPdfDraft {
  const next: OrderPdfDraft = { ...(draft || makeEmptyDraft()) };
  const current = resolveOrderPdfSketchImageDraftFlags(next)[key];
  next[key] = !current;
  return next;
}

export function buildUntouchedDetailsRefreshDraft(args: {
  draft: OrderPdfDraft;
  newAutoDetails: string;
}): OrderPdfDraft | null {
  const { draft, newAutoDetails } = args;
  const curAutoCmp = normalizeForCompare(safeStr(draft.autoDetails));
  const nextAutoCmp = normalizeForCompare(newAutoDetails);
  if (!newAutoDetails || curAutoCmp === nextAutoCmp) return null;

  const next: OrderPdfDraft = { ...draft };
  Object.assign(
    next,
    createOrderPdfDetailsFields({
      autoDetails: newAutoDetails,
      detailsText: newAutoDetails,
      detailsSeed: newAutoDetails,
      detailsTouched: false,
      manualEnabled: false,
      autoRegionTextForMarkers: newAutoDetails,
      textApi: { safeStr, textToHtml, buildDetailsHtmlWithMarkers, normalizeForCompare },
    })
  );
  return next;
}

export function syncOrderPdfDraftFromRichEditors(args: {
  draft: OrderPdfDraft | null | undefined;
  detailsEl: HTMLDivElement | null;
  notesEl: HTMLDivElement | null;
  detailsDirty: boolean;
}): OrderPdfDraft | null {
  const { draft, detailsEl, notesEl, detailsDirty } = args;
  return syncOrderPdfDraftFromRichEditorValues({
    draft,
    details: detailsEl
      ? {
          html: readInnerHtml(detailsEl),
          text: richEditorToText(detailsEl),
        }
      : null,
    notes: notesEl
      ? {
          html: readInnerHtml(notesEl),
          text: richEditorToText(notesEl),
        }
      : null,
    detailsDirty,
    textApi: {
      safeStr,
      textToHtml,
      htmlToTextPreserveNewlines,
      buildDetailsHtmlWithMarkers,
      normalizeForCompare,
    },
  });
}

export function resolveOrderPdfRefreshAuto(args: {
  source: OrderPdfDraftSeed;
  currentDraft: OrderPdfDraft | null | undefined;
  detailsEl: HTMLDivElement | null;
  docMaybe: Document | null;
  detailsDirty: boolean;
}): OrderPdfRefreshAutoResult {
  const { source, currentDraft, detailsEl, docMaybe, detailsDirty } = args;
  const newAutoDetails = source.autoDetails;
  const prev = currentDraft || null;
  const prevSeed = prev ? safeStr(prev.detailsSeed) : '';
  const prevAuto = prev ? safeStr(prev.autoDetails) : '';
  const prevHtml = detailsEl ? readInnerHtml(detailsEl) : prev ? safeStr(prev.manualDetailsHtml) : '';
  const prevText = detailsEl ? richEditorToText(detailsEl) : prev ? safeStr(prev.manualDetails) : '';
  const prevTouched = !!(prev && prev.detailsTouched) || !!detailsDirty;

  const buildNext = (detailsText: string, autoRegionForMarkers: string): OrderPdfDraft => {
    const detailsTouched = prevTouched || !!detailsDirty;

    return {
      ...buildOrderPdfRefreshCarryFields({
        currentDraft: prev,
        source,
        textApi: { safeStr, textToHtml, htmlToTextPreserveNewlines },
        fallbackProjectName: 'פרויקט',
      }),
      ...createOrderPdfDetailsFields({
        autoDetails: newAutoDetails,
        detailsText,
        detailsSeed: newAutoDetails,
        detailsTouched,
        manualEnabled: false,
        autoRegionTextForMarkers: autoRegionForMarkers,
        textApi: { safeStr, textToHtml, buildDetailsHtmlWithMarkers, normalizeForCompare },
      }),
    };
  };

  if (!prevTouched) {
    return { kind: 'persist', next: buildNext(newAutoDetails, newAutoDetails) };
  }

  const merged = mergeAutoDetailsWithInlineManual({
    prevText,
    prevHtml,
    doc: docMaybe || null,
    prevAuto,
    prevSeed,
    newAuto: newAutoDetails,
  });

  if (merged.kind === 'inline') {
    return {
      kind: 'confirm',
      confirm: {
        open: true,
        title: 'עדכון פרוט הזמנה',
        message:
          'מצאתי הערות/שינויים ידניים שנדחפו בתוך הטקסט המובנה של פרוט הזמנה.\n' +
          'אישור = לשמור את ההערות בתוך הטקסט ולעדכן מסביב.\n' +
          'ביטול = לעדכן לטקסט מובנה נקי (בלי ההערות שבתוך).',
        preview: merged.preview,
        okLabel: 'אישור',
        cancelLabel: 'ביטול',
        nextOk: buildNext(merged.keepText, merged.keepAutoRegion),
        nextCancel: buildNext(merged.cleanText, merged.cleanAutoRegion),
        toastOk: { text: 'עודכן מהפרויקט', kind: 'success' },
        toastCancel: { text: 'עודכן מהפרויקט', kind: 'success' },
      },
    };
  }

  if (merged.kind === 'ambiguous') {
    return {
      kind: 'confirm',
      confirm: {
        open: true,
        title: 'עדכון פרוט הזמנה',
        message:
          'לא הצלחתי לזהות בוודאות איפה הטקסט המובנה הישן נמצא בתוך התיבה.\n' +
          'כדי למנוע כפילויות:\n' +
          'עדכן נקי = להחליף לטקסט מובנה נקי.\n' +
          'בטל עדכון = להשאיר הכל כמו שהוא.',
        preview: '',
        okLabel: 'עדכן נקי',
        cancelLabel: 'בטל עדכון',
        nextOk: buildNext(newAutoDetails, newAutoDetails),
        nextCancel: null,
        toastOk: { text: 'עודכן מהפרויקט (נקי)', kind: 'success' },
        toastCancel: { text: 'בוטל עדכון', kind: 'info' },
      },
    };
  }

  return {
    kind: 'persist',
    next: buildNext(merged.cleanText, merged.cleanAutoRegion),
  };
}
