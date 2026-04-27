import type { OrderPdfBuilderContextLike } from './export_order_pdf_builder_shared.js';
import {
  reportOrderPdfBuilderFieldError,
  type OrderPdfBuilderFieldAcrobatOps,
} from './export_order_pdf_builder_fields_shared.js';

export function createOrderPdfBuilderFieldPageOps(
  ctx: OrderPdfBuilderContextLike,
  acrobatOps: OrderPdfBuilderFieldAcrobatOps
): {
  addOverflowDetailsPage: (text: string, align: unknown) => Promise<void>;
  addCompositeImagesPage: (pngBytes: Uint8Array) => Promise<void>;
} {
  const { runtime } = ctx;
  const { pdfDoc, form, font, pageWidth, pageHeight, black } = runtime;

  const addOverflowDetailsPage = async (text: string, align: unknown): Promise<void> => {
    if (!text || !text.trim()) return;
    try {
      const fontSize = 11;
      const margin = 30;
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const box = {
        x: margin,
        y: margin,
        w: pageWidth - margin * 2,
        h: pageHeight - margin * 2,
      };
      const field = form.createTextField('wp_order_details_cont');
      field.addToPage(page, {
        x: box.x,
        y: box.y,
        width: box.w,
        height: box.h,
        font,
        fontSize,
        textColor: black,
        borderWidth: 0,
      });
      acrobatOps.configureFieldForAcrobat(
        field,
        fontSize,
        { multiline: true, align },
        'buildOrderPdfInteractive.overflow'
      );
      acrobatOps.writeFieldText(field, text, 'buildOrderPdfInteractive.overflow');
    } catch (e) {
      reportOrderPdfBuilderFieldError(ctx, 'buildOrderPdfInteractive.overflow.pageFill', e);
    }
  };

  const addCompositeImagesPage = async (pngBytes: Uint8Array): Promise<void> => {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const img = await pdfDoc.embedPng(pngBytes);
    const margin = 18;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
    const width = img.width * scale;
    const height = img.height * scale;

    page.drawImage(img, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    });
  };

  return {
    addOverflowDetailsPage,
    addCompositeImagesPage,
  };
}
