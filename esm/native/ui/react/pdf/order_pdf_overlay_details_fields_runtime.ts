import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import { sanitizeHtmlByPolicy } from '../../html_sanitize_runtime.js';
import type { OrderPdfTextApi } from './order_pdf_overlay_text_api.js';

export type OrderPdfDetailsFields = Pick<
  OrderPdfDraft,
  'autoDetails' | 'detailsText' | 'detailsHtml' | 'detailsSeed' | 'detailsTouched'
>;

export type OrderPdfDetailsTextApi = Pick<
  OrderPdfTextApi,
  'safeStr' | 'textToHtml' | 'buildDetailsHtmlWithMarkers' | 'normalizeForCompare'
>;

type ReportNonFatal = (op: string, err: unknown, dedupeMs?: number) => void;

type StoredOrderPdfDetailsFields = {
  detailsText: string;
  detailsHtml: string;
};

function trimTextValue(value: string): string {
  return String(value || '').trim();
}

export function hasOrderPdfTextValue(value: unknown): boolean {
  return trimTextValue(typeof value === 'string' ? value : value == null ? '' : String(value)).length > 0;
}

export function resolveOrderPdfRichTextHtml(args: {
  text: unknown;
  html: unknown;
  textApi: Pick<OrderPdfDetailsTextApi, 'safeStr' | 'textToHtml'>;
  reportNonFatal?: ReportNonFatal;
  reportOp?: string;
}): string {
  const { textApi, reportNonFatal, reportOp } = args;
  const html = sanitizeHtmlByPolicy(null, textApi.safeStr(args.html), 'order-pdf-rich');
  if (html) return html;
  const text = textApi.safeStr(args.text);
  if (!text) return '';
  try {
    return textApi.textToHtml(text);
  } catch (err) {
    reportNonFatal?.(reportOp || 'orderPdfRichTextHtml', err);
    return '';
  }
}

function resolveOrderPdfDetailsMarkerHtml(args: {
  detailsText: string;
  autoRegionText: string | null;
  textApi: Pick<OrderPdfDetailsTextApi, 'textToHtml' | 'buildDetailsHtmlWithMarkers'>;
  reportNonFatal?: ReportNonFatal;
  reportOp?: string;
}): string {
  const { detailsText, autoRegionText, textApi, reportNonFatal, reportOp } = args;
  if (typeof autoRegionText === 'string') {
    try {
      return textApi.buildDetailsHtmlWithMarkers(detailsText, autoRegionText);
    } catch (err) {
      reportNonFatal?.(reportOp || 'orderPdfDetails:markers', err);
    }
  }
  try {
    return textApi.textToHtml(detailsText);
  } catch (err) {
    reportNonFatal?.(reportOp || 'orderPdfDetails:textToHtml', err);
    return '';
  }
}

function readStoredOrderPdfDetailsFields(
  rec: Record<string, unknown>,
  textApi: Pick<OrderPdfDetailsTextApi, 'safeStr'>
): StoredOrderPdfDetailsFields {
  const detailsText = textApi.safeStr(rec.detailsText);
  const detailsHtml = textApi.safeStr(rec.detailsHtml);

  return {
    detailsText,
    detailsHtml,
  };
}

export function createOrderPdfDetailsFields(args: {
  autoDetails: unknown;
  detailsText: unknown;
  detailsHtml?: unknown;
  detailsSeed?: unknown;
  detailsTouched?: unknown;
  autoRegionTextForMarkers?: unknown;
  textApi: Pick<OrderPdfDetailsTextApi, 'safeStr' | 'textToHtml' | 'buildDetailsHtmlWithMarkers'>;
  reportNonFatal?: ReportNonFatal;
  markerReportOp?: string;
  htmlReportOp?: string;
}): OrderPdfDetailsFields {
  const { textApi, reportNonFatal } = args;
  const autoDetails = textApi.safeStr(args.autoDetails);
  const detailsText = textApi.safeStr(args.detailsText);
  const detailsTouched = !!args.detailsTouched;
  const detailsSeed = textApi.safeStr(args.detailsSeed) || autoDetails || detailsText;

  let detailsHtml = sanitizeHtmlByPolicy(null, textApi.safeStr(args.detailsHtml), 'order-pdf-rich');
  if (!detailsHtml && detailsText) {
    const autoRegionTextRaw = textApi.safeStr(args.autoRegionTextForMarkers);
    const autoRegionText = autoRegionTextRaw || null;
    detailsHtml = resolveOrderPdfDetailsMarkerHtml({
      detailsText,
      autoRegionText,
      textApi,
      reportNonFatal,
      reportOp: args.markerReportOp || args.htmlReportOp,
    });
  }

  return {
    autoDetails,
    detailsText,
    detailsHtml,
    detailsSeed,
    detailsTouched,
  };
}

export function createOrderPdfInitialDetailsFields(args: {
  autoDetails: unknown;
  detailsText?: unknown;
  detailsHtml?: unknown;
  detailsTouched?: unknown;
  textApi: Pick<
    OrderPdfDetailsTextApi,
    'safeStr' | 'textToHtml' | 'buildDetailsHtmlWithMarkers' | 'normalizeForCompare'
  >;
  reportNonFatal?: ReportNonFatal;
}): { fields: OrderPdfDetailsFields; detailsDirty: boolean } {
  const { textApi, reportNonFatal } = args;
  const autoDetails = textApi.safeStr(args.autoDetails);
  const storedDetailsText = textApi.safeStr(args.detailsText);
  const storedDetailsHtml = textApi.safeStr(args.detailsHtml);
  const detailsText = storedDetailsText || autoDetails;
  const detailsTouched =
    !!args.detailsTouched &&
    textApi.normalizeForCompare(detailsText) !== textApi.normalizeForCompare(autoDetails);

  return {
    fields: createOrderPdfDetailsFields({
      autoDetails,
      detailsText,
      detailsHtml: storedDetailsHtml,
      detailsSeed: autoDetails,
      detailsTouched,
      textApi,
      reportNonFatal,
      htmlReportOp: 'orderPdfInitialDraft:detailsHtml',
    }),
    detailsDirty: detailsTouched,
  };
}

export function buildOrderPdfDetailsFieldsFromUiRecord(args: {
  rec: Record<string, unknown>;
  detailsDirtyRef: { current: boolean };
  textApi: OrderPdfDetailsTextApi;
  reportNonFatal: ReportNonFatal;
}): OrderPdfDetailsFields {
  const { rec, detailsDirtyRef, textApi, reportNonFatal } = args;
  const autoDetails = textApi.safeStr(rec.autoDetails);
  const storedDetails = readStoredOrderPdfDetailsFields(rec, textApi);

  let detailsText = storedDetails.detailsText;
  let detailsHtml = storedDetails.detailsHtml;
  let detailsSeed = textApi.safeStr(rec.detailsSeed);
  let detailsTouched = !!rec.detailsTouched;
  let markerAutoRegionText: string | null = null;

  if (!detailsText && autoDetails) {
    detailsText = autoDetails;
    detailsHtml = '';
    detailsSeed = detailsText;
    detailsTouched = false;
  }

  if (!detailsSeed) detailsSeed = autoDetails || detailsText || '';

  try {
    const autoCmp = textApi.normalizeForCompare(autoDetails || '');
    const curCmp = textApi.normalizeForCompare(detailsText || '');

    if (detailsTouched && autoCmp === curCmp) {
      detailsTouched = false;
      detailsDirtyRef.current = false;
    }

    if (!detailsTouched && autoCmp !== curCmp) {
      detailsText = autoDetails || '';
      detailsSeed = detailsText;
      detailsTouched = false;
      detailsHtml = '';
    }
  } catch (err) {
    reportNonFatal('orderPdfDraftSync:normalize', err);
  }

  if (!detailsTouched) {
    markerAutoRegionText = detailsText || '';
  }

  const fields = createOrderPdfDetailsFields({
    autoDetails,
    detailsText,
    detailsHtml,
    detailsSeed,
    detailsTouched,
    autoRegionTextForMarkers: markerAutoRegionText,
    textApi,
    reportNonFatal,
    markerReportOp: 'orderPdfDraftSync:markers',
    htmlReportOp: 'orderPdfDraftSync:textToHtml',
  });

  detailsDirtyRef.current = !!fields.detailsTouched;
  return fields;
}
