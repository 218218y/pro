import type { AppContainer } from '../../../../types/app.js';
import type { ExportOrderPdfCaptureOps } from './export_order_pdf_capture.js';
import type { ExportOrderPdfTextOps } from './export_order_pdf_text_contracts.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import type { OrderPdfDraftLike } from '../../../../types/build.js';
import type { OrderPdfResolvedDraftLike } from './export_order_pdf_builder_shared.js';
import {
  captureOrderPdfCompositeImages,
  resolveOrderPdfBuildDraft,
} from './export_order_pdf_builder_layout.js';
import type { OrderPdfCompositeImageSlotBytes } from './export_order_pdf_composite_image_slots_runtime.js';

export type OrderPdfBuilderPreparedAssets = {
  resolvedDraft: OrderPdfResolvedDraftLike;
  templateBytes: Uint8Array;
  fontBytes: Uint8Array;
  compositeImageSlotBytes: OrderPdfCompositeImageSlotBytes;
};

export async function prepareOrderPdfBuildAssets(
  App: AppContainer,
  draft: OrderPdfDraftLike,
  deps: ExportOrderPdfDeps,
  textOps: ExportOrderPdfTextOps,
  captureOps: Pick<
    ExportOrderPdfCaptureOps,
    | 'fetchBytesFirstOk'
    | 'captureCompositeRenderSketchPngBytes'
    | 'captureCompositeOpenClosedPngBytes'
    | 'applySketchAnnotationsToCompositePngBytes'
  >
): Promise<OrderPdfBuilderPreparedAssets | null> {
  const resolvedDraft = resolveOrderPdfBuildDraft(App, draft, deps, textOps);

  const templateBytes = await captureOps.fetchBytesFirstOk(App, [
    '/order_template.pdf',
    './order_template.pdf',
    'order_template.pdf',
  ]);
  if (!templateBytes) {
    deps._toast(App, 'קובץ תבנית PDF לא נמצא (order_template.pdf)', 'error');
    return null;
  }

  const fontBytes = await captureOps.fetchBytesFirstOk(App, [
    '/fonts/DejaVuSans.ttf',
    './fonts/DejaVuSans.ttf',
    'fonts/DejaVuSans.ttf',
  ]);
  if (!fontBytes) {
    deps._toast(App, 'קובץ פונט חסר (DejaVuSans.ttf)', 'error');
    return null;
  }

  const compositeImageSlotBytes = await captureOrderPdfCompositeImages(App, draft, resolvedDraft, deps, {
    applySketchAnnotationsToCompositePngBytes: captureOps.applySketchAnnotationsToCompositePngBytes,
    captureCompositeRenderSketchPngBytes: captureOps.captureCompositeRenderSketchPngBytes,
    captureCompositeOpenClosedPngBytes: captureOps.captureCompositeOpenClosedPngBytes,
  });

  return {
    resolvedDraft,
    templateBytes,
    fontBytes,
    compositeImageSlotBytes,
  };
}
