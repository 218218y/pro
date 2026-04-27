import type {
  OrderPdfBuilderContextLike,
  OrderPdfBuilderFieldOps,
} from './export_order_pdf_builder_shared.js';
import { createOrderPdfBuilderFieldAcrobatOps } from './export_order_pdf_builder_fields_acrobat.js';
import { createOrderPdfBuilderFieldTextOps } from './export_order_pdf_builder_fields_text.js';
import { createOrderPdfBuilderFieldPageOps } from './export_order_pdf_builder_fields_pages.js';

export function createOrderPdfBuilderFieldOps(ctx: OrderPdfBuilderContextLike): OrderPdfBuilderFieldOps {
  const acrobatOps = createOrderPdfBuilderFieldAcrobatOps(ctx);
  const textOps = createOrderPdfBuilderFieldTextOps(ctx, acrobatOps);
  const pageOps = createOrderPdfBuilderFieldPageOps(ctx, acrobatOps);

  return {
    setFieldText: textOps.setFieldText,
    addOverflowDetailsPage: pageOps.addOverflowDetailsPage,
    addCompositeImagesPage: pageOps.addCompositeImagesPage,
  };
}
