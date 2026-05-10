import type { OrderPdfDraftLike } from '../../../../types/build.js';

export type OrderPdfDetailsDraftLike = Pick<
  OrderPdfDraftLike,
  'autoDetails' | 'manualDetails' | 'detailsFull' | 'detailsTouched' | 'manualEnabled'
>;

export function coerceOrderPdfTextValue(value: unknown, defaultValue = ''): string {
  return value == null ? defaultValue : String(value);
}

export function hasOrderPdfTextValue(value: unknown): boolean {
  return coerceOrderPdfTextValue(value).trim().length > 0;
}

export function joinOrderPdfAutoAndManualDetails(autoDetails: unknown, manualDetails: unknown): string {
  const autoText = coerceOrderPdfTextValue(autoDetails);
  const manualText = coerceOrderPdfTextValue(manualDetails);
  if (!hasOrderPdfTextValue(manualText)) return autoText;
  if (!hasOrderPdfTextValue(autoText)) return manualText;

  let next = autoText;
  if (!next.endsWith('\n')) next += '\n';
  if (!next.endsWith('\n\n')) next += '\n';
  return `${next}${manualText}`;
}

export function resolveOrderPdfDetailsText(args: {
  autoDetails: unknown;
  manualDetails: unknown;
  detailsFull?: unknown;
  detailsTouched?: unknown;
  manualEnabled?: unknown;
}): string {
  const autoText = coerceOrderPdfTextValue(args.autoDetails);
  const manualText = coerceOrderPdfTextValue(args.manualDetails);
  const detailsFull = !!args.detailsFull;
  const touched = !!args.detailsTouched || !!args.manualEnabled;

  if (detailsFull) {
    return touched ? (hasOrderPdfTextValue(manualText) ? manualText : autoText) : autoText;
  }

  return joinOrderPdfAutoAndManualDetails(autoText, manualText);
}

export function resolveOrderPdfDetailsTextFromDraft(
  draft: OrderPdfDetailsDraftLike | null | undefined,
  autoDetailsOverride?: unknown
): string {
  return resolveOrderPdfDetailsText({
    autoDetails: autoDetailsOverride ?? draft?.autoDetails,
    manualDetails: draft?.manualDetails,
    detailsFull: draft?.detailsFull,
    detailsTouched: draft?.detailsTouched,
    manualEnabled: draft?.manualEnabled,
  });
}
