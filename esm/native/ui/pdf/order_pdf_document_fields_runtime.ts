import {
  ORDER_PDF_FIELD_KEYS,
  ORDER_PDF_FIELD_SPECS,
  type OrderPdfFieldKey,
} from './order_pdf_field_specs_runtime.js';
import { coerceOrderPdfTextValue, hasOrderPdfTextValue } from './order_pdf_details_runtime.js';

export type OrderPdfScalarFieldKey = Exclude<OrderPdfFieldKey, 'details' | 'notes'>;

export type OrderPdfScalarFieldValues = Record<OrderPdfScalarFieldKey, string>;

export type OrderPdfImportedDraftFieldValues = Partial<
  OrderPdfScalarFieldValues & {
    manualDetails: string;
    notes: string;
  }
>;

export const ORDER_PDF_SCALAR_FIELD_KEYS = Object.freeze(
  ORDER_PDF_FIELD_KEYS.filter((key): key is OrderPdfScalarFieldKey => key !== 'details' && key !== 'notes')
);

export const ORDER_PDF_DETAILS_CONTINUATION_FIELD_NAMES = Object.freeze(['wp_order_details_cont']);

function firstDefinedTextValue(values: readonly unknown[], fallback = ''): string {
  for (const value of values) {
    const text = coerceOrderPdfTextValue(value, '');
    if (hasOrderPdfTextValue(text)) return text;
  }
  return coerceOrderPdfTextValue(fallback, '');
}

function buildOrderPdfScalarFieldValues(
  _source: Partial<Record<OrderPdfScalarFieldKey, unknown>> | null | undefined,
  readValue: (key: OrderPdfScalarFieldKey) => string
): OrderPdfScalarFieldValues {
  const valuesByKey = new Map<OrderPdfScalarFieldKey, string>();
  for (const key of ORDER_PDF_SCALAR_FIELD_KEYS) {
    valuesByKey.set(key, readValue(key));
  }
  return {
    projectName: valuesByKey.get('projectName') ?? '',
    orderNumber: valuesByKey.get('orderNumber') ?? '',
    orderDate: valuesByKey.get('orderDate') ?? '',
    deliveryAddress: valuesByKey.get('deliveryAddress') ?? '',
    phone: valuesByKey.get('phone') ?? '',
    mobile: valuesByKey.get('mobile') ?? '',
  };
}

export function getOrderPdfFieldReadNames(key: OrderPdfFieldKey): readonly string[] {
  const spec = ORDER_PDF_FIELD_SPECS[key];
  return Object.freeze([spec.templateFieldName, spec.fallbackFieldName]);
}

export function readOrderPdfScalarFieldValues(
  source: Partial<Record<OrderPdfScalarFieldKey, unknown>> | null | undefined
): OrderPdfScalarFieldValues {
  return buildOrderPdfScalarFieldValues(source, key => coerceOrderPdfTextValue(source?.[key]));
}

export function resolveOrderPdfScalarFieldValues(args: {
  source: Partial<Record<OrderPdfScalarFieldKey, unknown>> | null | undefined;
  fallbackProjectName?: unknown;
  fallbackOrderDate?: unknown;
}): OrderPdfScalarFieldValues {
  const resolved = readOrderPdfScalarFieldValues(args.source);
  resolved.projectName = firstDefinedTextValue([resolved.projectName, args.fallbackProjectName]);
  resolved.orderDate = firstDefinedTextValue([resolved.orderDate, args.fallbackOrderDate]);
  return resolved;
}

export function mergeOrderPdfScalarFieldValues(args: {
  preferred?: Partial<Record<OrderPdfScalarFieldKey, unknown>> | null;
  fallback?: Partial<Record<OrderPdfScalarFieldKey, unknown>> | null;
  fallbackProjectName?: unknown;
}): OrderPdfScalarFieldValues {
  const preferred = readOrderPdfScalarFieldValues(args.preferred);
  const fallback = readOrderPdfScalarFieldValues(args.fallback);
  return {
    projectName: firstDefinedTextValue([
      preferred.projectName,
      fallback.projectName,
      args.fallbackProjectName,
    ]),
    orderNumber: firstDefinedTextValue([preferred.orderNumber, fallback.orderNumber]),
    orderDate: firstDefinedTextValue([preferred.orderDate, fallback.orderDate]),
    deliveryAddress: firstDefinedTextValue([preferred.deliveryAddress, fallback.deliveryAddress]),
    phone: firstDefinedTextValue([preferred.phone, fallback.phone]),
    mobile: firstDefinedTextValue([preferred.mobile, fallback.mobile]),
  };
}

export function applyNonEmptyOrderPdfScalarFieldValues<
  T extends Partial<Record<OrderPdfScalarFieldKey, string>>,
>(args: { target: T; source: Partial<Record<OrderPdfScalarFieldKey, unknown>> | null | undefined }): T {
  for (const key of ORDER_PDF_SCALAR_FIELD_KEYS) {
    const value = coerceOrderPdfTextValue(args.source?.[key]);
    if (hasOrderPdfTextValue(value)) {
      args.target[key] = value;
    }
  }
  return args.target;
}

export function buildOrderPdfFieldValueMap(args: {
  scalarFields: Partial<Record<OrderPdfScalarFieldKey, unknown>> | null | undefined;
  details: unknown;
  notes: unknown;
}): Record<OrderPdfFieldKey, string> {
  return {
    ...readOrderPdfScalarFieldValues(args.scalarFields),
    details: coerceOrderPdfTextValue(args.details),
    notes: coerceOrderPdfTextValue(args.notes),
  };
}

export function readOrderPdfImportedDraftFieldValues(
  readText: (names: readonly string[]) => string
): OrderPdfImportedDraftFieldValues {
  const scalars = buildOrderPdfScalarFieldValues(null, key => readText(getOrderPdfFieldReadNames(key)));
  const detailsPage1 = readText(getOrderPdfFieldReadNames('details'));
  const detailsContinuation = readText(ORDER_PDF_DETAILS_CONTINUATION_FIELD_NAMES);
  const notes = readText(getOrderPdfFieldReadNames('notes'));

  return {
    ...scalars,
    manualDetails: detailsContinuation
      ? detailsPage1
        ? `${detailsPage1}
${detailsContinuation}`
        : detailsContinuation
      : detailsPage1,
    notes,
  };
}

export function hasAnyOrderPdfImportedDraftFieldValue(
  extracted: OrderPdfImportedDraftFieldValues | null | undefined
): boolean {
  if (!extracted) return false;
  for (const key of ORDER_PDF_SCALAR_FIELD_KEYS) {
    if (hasOrderPdfTextValue(extracted[key])) return true;
  }
  return hasOrderPdfTextValue(extracted.manualDetails) || hasOrderPdfTextValue(extracted.notes);
}
