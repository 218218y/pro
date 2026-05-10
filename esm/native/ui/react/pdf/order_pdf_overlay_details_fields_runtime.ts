import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import { sanitizeHtmlByPolicy } from '../../html_sanitize_runtime.js';
import type { OrderPdfTextApi } from './order_pdf_overlay_text_api.js';

export type OrderPdfDetailsFields = Pick<
  OrderPdfDraft,
  | 'autoDetails'
  | 'manualDetails'
  | 'manualDetailsHtml'
  | 'detailsFull'
  | 'detailsSeed'
  | 'detailsTouched'
  | 'manualEnabled'
>;

export type OrderPdfDetailsTextApi = Pick<
  OrderPdfTextApi,
  | 'safeStr'
  | 'textToHtml'
  | 'htmlToTextPreserveNewlines'
  | 'buildDetailsHtmlWithMarkers'
  | 'normalizeForCompare'
>;

type ReportNonFatal = (op: string, err: unknown, dedupeMs?: number) => void;

type StoredOrderPdfDetailsFields = {
  detailsText: string;
  detailsHtml: string;
  hasDetailsValue: boolean;
  detailsFull: boolean;
  manualEnabled: boolean;
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
  textApi: Pick<OrderPdfDetailsTextApi, 'safeStr' | 'htmlToTextPreserveNewlines'>
): StoredOrderPdfDetailsFields {
  const manualText = textApi.safeStr(rec.manualDetails);
  const manualHtml = textApi.safeStr(rec.manualDetailsHtml);
  const textFromHtml = manualText
    ? ''
    : manualHtml
      ? textApi.htmlToTextPreserveNewlines(null, manualHtml)
      : '';
  const detailsText = manualText || textFromHtml;

  return {
    detailsText,
    detailsHtml: manualHtml,
    hasDetailsValue: hasOrderPdfTextValue(detailsText) || hasOrderPdfTextValue(manualHtml),
    detailsFull: !!rec.detailsFull,
    manualEnabled: !!rec.manualEnabled,
  };
}

function mergeOrderPdfStoredInlineDetails(autoDetails: string, manualText: string): string {
  if (!autoDetails) return manualText;
  let out = autoDetails;
  if (!out.endsWith('\n')) out += '\n';
  if (!out.endsWith('\n\n')) out += '\n';
  return `${out}${manualText}`;
}

export function createOrderPdfDetailsFields(args: {
  autoDetails: unknown;
  detailsText: unknown;
  detailsHtml?: unknown;
  detailsSeed?: unknown;
  detailsTouched?: unknown;
  manualEnabled?: unknown;
  autoRegionTextForMarkers?: unknown;
  textApi: Pick<
    OrderPdfDetailsTextApi,
    'safeStr' | 'textToHtml' | 'buildDetailsHtmlWithMarkers' | 'normalizeForCompare'
  >;
  reportNonFatal?: ReportNonFatal;
  markerReportOp?: string;
  htmlReportOp?: string;
}): OrderPdfDetailsFields {
  const { textApi, reportNonFatal } = args;
  const autoDetails = textApi.safeStr(args.autoDetails);
  const detailsText = textApi.safeStr(args.detailsText);
  const detailsTouched = !!args.detailsTouched;
  const detailsSeed = textApi.safeStr(args.detailsSeed) || autoDetails || detailsText;

  let manualDetailsHtml = sanitizeHtmlByPolicy(null, textApi.safeStr(args.detailsHtml), 'order-pdf-rich');
  if (!manualDetailsHtml && detailsText) {
    const autoRegionTextRaw = textApi.safeStr(args.autoRegionTextForMarkers);
    const autoRegionText = autoRegionTextRaw || null;
    manualDetailsHtml = resolveOrderPdfDetailsMarkerHtml({
      detailsText,
      autoRegionText,
      textApi,
      reportNonFatal,
      reportOp: args.markerReportOp || args.htmlReportOp,
    });
  }

  const manualEnabledRequested = !!args.manualEnabled;
  const manualEnabled =
    manualEnabledRequested &&
    (detailsTouched || textApi.normalizeForCompare(detailsText) !== textApi.normalizeForCompare(autoDetails));

  return {
    autoDetails,
    manualDetails: detailsText,
    manualDetailsHtml,
    detailsFull: true,
    detailsSeed,
    detailsTouched,
    manualEnabled,
  };
}

export function createOrderPdfInitialDetailsFields(args: {
  autoDetails: unknown;
  manualDetails?: unknown;
  manualDetailsHtml?: unknown;
  manualEnabled?: unknown;
  textApi: Pick<
    OrderPdfDetailsTextApi,
    'safeStr' | 'textToHtml' | 'buildDetailsHtmlWithMarkers' | 'normalizeForCompare'
  >;
  reportNonFatal?: ReportNonFatal;
}): { fields: OrderPdfDetailsFields; detailsDirty: boolean } {
  const { textApi, reportNonFatal } = args;
  const autoDetails = textApi.safeStr(args.autoDetails);
  const manualDetails = textApi.safeStr(args.manualDetails);
  const manualDetailsHtml = textApi.safeStr(args.manualDetailsHtml);
  const detailsText = manualDetails || autoDetails;
  const detailsTouched =
    !!manualDetails &&
    textApi.normalizeForCompare(manualDetails) !== textApi.normalizeForCompare(autoDetails);

  return {
    fields: createOrderPdfDetailsFields({
      autoDetails,
      detailsText,
      detailsHtml: manualDetailsHtml,
      detailsSeed: autoDetails,
      detailsTouched,
      manualEnabled:
        !!args.manualEnabled ||
        hasOrderPdfTextValue(manualDetails) ||
        hasOrderPdfTextValue(manualDetailsHtml),
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
  const detailsFullRaw = storedDetails.detailsFull;

  let detailsText = storedDetails.detailsText;
  let detailsHtml = storedDetails.detailsHtml;
  let detailsSeed = textApi.safeStr(rec.detailsSeed);
  let detailsTouched = !!rec.detailsTouched;
  let markerAutoRegionText: string | null = null;

  if (!detailsFullRaw) {
    const hasManual = storedDetails.hasDetailsValue || storedDetails.manualEnabled;
    if (hasManual) {
      detailsText = mergeOrderPdfStoredInlineDetails(autoDetails, storedDetails.detailsText);
    } else {
      detailsText = autoDetails || '';
    }
    detailsHtml = '';
    detailsSeed = detailsText;
    detailsTouched = hasManual;
  } else {
    if (!detailsText && autoDetails) {
      detailsText = autoDetails;
      detailsHtml = '';
      detailsSeed = detailsText;
      detailsTouched = false;
    }
  }

  if (!detailsSeed) detailsSeed = autoDetails || detailsText || '';

  try {
    const autoCmp = textApi.normalizeForCompare(autoDetails || '');
    const curCmp = textApi.normalizeForCompare(detailsText || '');

    if (
      !detailsTouched &&
      detailsFullRaw &&
      storedDetails.manualEnabled &&
      storedDetails.hasDetailsValue &&
      autoCmp !== curCmp
    ) {
      detailsTouched = true;
    }

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
    manualEnabled: storedDetails.manualEnabled || storedDetails.hasDetailsValue,
    autoRegionTextForMarkers: markerAutoRegionText,
    textApi,
    reportNonFatal,
    markerReportOp: 'orderPdfDraftSync:markers',
    htmlReportOp: 'orderPdfDraftSync:textToHtml',
  });

  detailsDirtyRef.current = !!fields.detailsTouched;
  return fields;
}
