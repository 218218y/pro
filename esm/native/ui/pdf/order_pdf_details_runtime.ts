import type { OrderPdfDraftLike } from '../../../../types/build.js';

export type OrderPdfDetailsDraftLike = Pick<
  OrderPdfDraftLike,
  'autoDetails' | 'detailsText' | 'detailsTouched'
>;

export function coerceOrderPdfTextValue(value: unknown, defaultValue = ''): string {
  return value == null ? defaultValue : String(value);
}

export function hasOrderPdfTextValue(value: unknown): boolean {
  return coerceOrderPdfTextValue(value).trim().length > 0;
}

export function resolveOrderPdfDetailsText(args: {
  autoDetails: unknown;
  detailsText: unknown;
  detailsTouched?: unknown;
}): string {
  const autoText = coerceOrderPdfTextValue(args.autoDetails);
  const detailsText = coerceOrderPdfTextValue(args.detailsText);
  return args.detailsTouched && hasOrderPdfTextValue(detailsText) ? detailsText : autoText;
}

export function resolveOrderPdfDetailsTextFromDraft(
  draft: OrderPdfDetailsDraftLike | null | undefined,
  autoDetailsOverride?: unknown
): string {
  return resolveOrderPdfDetailsText({
    autoDetails: autoDetailsOverride ?? draft?.autoDetails,
    detailsText: draft?.detailsText,
    detailsTouched: draft?.detailsTouched,
  });
}
