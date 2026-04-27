import type {
  OrderPdfBuilderContextLike,
  OrderPdfFieldSpecLike,
  PdfRectLike,
  PdfTextFieldLike,
} from './export_order_pdf_builder_shared.js';

export type OrderPdfBuilderFieldAcrobatOps = {
  configureFieldForAcrobat: (
    field: PdfTextFieldLike,
    fontSize: number,
    spec: Pick<OrderPdfFieldSpecLike, 'align' | 'multiline'>,
    errorPrefix: string
  ) => void;
  writeFieldText: (field: PdfTextFieldLike, value: string, errorPrefix: string) => void;
};

export type OrderPdfBuilderFieldTextOps = {
  resolveFieldFontSize: (spec: OrderPdfFieldSpecLike) => number;
  getOrCreateTextField: (
    templateFieldName: string,
    fallbackFieldName: string,
    box: PdfRectLike,
    fontSize: number
  ) => PdfTextFieldLike | null;
};

export function readOrderPdfNumberField(value: unknown): { asNumber?: () => number } | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

export function reportOrderPdfBuilderFieldError(
  ctx: OrderPdfBuilderContextLike,
  op: string,
  err: unknown,
  throttleMs = 1500
): void {
  ctx.deps._exportReportThrottled(ctx.App, op, err, { throttleMs });
}
