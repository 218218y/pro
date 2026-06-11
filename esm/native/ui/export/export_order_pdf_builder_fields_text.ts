import type {
  OrderPdfBuilderContextLike,
  OrderPdfFieldSpecLike,
  PdfRectLike,
  PdfTextFieldLike,
} from './export_order_pdf_builder_shared.js';
import {
  reportOrderPdfBuilderFieldError,
  type OrderPdfBuilderFieldAcrobatOps,
  type OrderPdfBuilderFieldTextOps,
} from './export_order_pdf_builder_fields_shared.js';

export function createOrderPdfBuilderFieldTextOps(
  ctx: OrderPdfBuilderContextLike,
  acrobatOps: OrderPdfBuilderFieldAcrobatOps
): OrderPdfBuilderFieldTextOps & { setFieldText: (spec: OrderPdfFieldSpecLike) => void } {
  const { textOps, runtime } = ctx;
  const { wrapTextToWidth } = textOps;
  const { form, font, firstPage, black } = runtime;

  const resolveFieldFontSize = (spec: OrderPdfFieldSpecLike): number => {
    const baseFontSize = spec.multiline && (spec.key === 'details' || spec.key === 'notes') ? 12 : 11;
    let fontSize = baseFontSize;
    try {
      if (spec.multiline && (spec.key === 'details' || spec.key === 'notes')) {
        const padding = 6;
        const minSize = 7;
        const maxSize = baseFontSize;
        const maxWidth = Math.max(1, spec.box.w - padding * 2);
        const maxHeight = Math.max(1, spec.box.h - padding * 2);
        const rawText = String(spec.value || '');
        let best = maxSize;
        for (let size = maxSize; size >= minSize; size--) {
          const lineGap = Math.max(2, Math.round(size * 0.25));
          const lineHeight = size + lineGap;
          const wrapped = wrapTextToWidth(rawText, font, size, maxWidth);
          const neededHeight = wrapped.length * lineHeight;
          if (neededHeight <= maxHeight) {
            best = size;
            break;
          }
        }
        fontSize = best;
      }
    } catch (e) {
      reportOrderPdfBuilderFieldError(ctx, 'buildOrderPdfInteractive.setFieldText.autoShrink', e);
      fontSize = baseFontSize;
    }
    return fontSize;
  };

  const getOrCreateTextField = (
    templateFieldName: string,
    fallbackFieldName: string,
    box: PdfRectLike,
    fontSize: number
  ): PdfTextFieldLike | null => {
    let field: PdfTextFieldLike | null = null;
    try {
      field = form.getTextField(templateFieldName);
    } catch (e) {
      reportOrderPdfBuilderFieldError(ctx, 'buildOrderPdfInteractive.setFieldText.getTemplateField', e);
      field = null;
    }

    if (!field) {
      try {
        field = form.createTextField(fallbackFieldName);
        field.addToPage(firstPage, {
          x: box.x,
          y: box.y,
          width: box.w,
          height: box.h,
          font,
          fontSize,
          textColor: black,
          borderWidth: 0,
        });
      } catch (e) {
        reportOrderPdfBuilderFieldError(ctx, 'buildOrderPdfInteractive.setFieldText.createFallbackField', e);
        field = null;
      }
    }

    return field;
  };

  const setFieldText = (spec: OrderPdfFieldSpecLike): void => {
    const fontSize = resolveFieldFontSize(spec);
    const field = getOrCreateTextField(spec.templateFieldName, spec.fallbackFieldName, spec.box, fontSize);
    if (!field) return;
    acrobatOps.configureFieldForAcrobat(field, fontSize, spec, 'buildOrderPdfInteractive.setFieldText');
    acrobatOps.writeFieldText(field, spec.value, 'buildOrderPdfInteractive.setFieldText');
  };

  return {
    resolveFieldFontSize,
    getOrCreateTextField,
    setFieldText,
  };
}
