import type { AppContainer } from '../../../../types/app.js';
import type { OrderPdfBuildResultLike, OrderPdfDraftLike } from '../../../../types/build.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import type { ExportOrderPdfTextOps } from './export_order_pdf_text_contracts.js';
import type { ExportOrderPdfCaptureOps } from './export_order_pdf_capture.js';
import { splitOrderPdfDetailsOverflow } from './export_order_pdf_builder_layout.js';
import {
  ORDER_PDF_REQUIRED_TEMPLATE_FIELDS,
  ORDER_PDF_TEMPLATE_BOXES,
  listOrderPdfFieldSpecs,
} from '../pdf/order_pdf_field_specs_runtime.js';
import { buildOrderPdfFieldValueMap } from '../pdf/order_pdf_document_fields_runtime.js';
import {
  listOrderPdfCompositeImagePageBytes,
  type OrderPdfCompositeImageSlotBytes,
} from './export_order_pdf_composite_image_slots_runtime.js';
import type {
  OrderPdfBuilderFieldOps,
  OrderPdfBuilderRuntimeLike,
  OrderPdfResolvedDraftLike,
} from './export_order_pdf_builder_shared.js';

const ORDER_PDF_PRIMARY_PAGE_ANNOTATION_RASTER_SCALE = 3;

function setPrimaryDocumentFields(input: {
  fieldOps: OrderPdfBuilderFieldOps;
  runtime: OrderPdfBuilderRuntimeLike;
  resolvedDraft: OrderPdfResolvedDraftLike;
  detailsPage1Text: string;
}): void {
  const { fieldOps, runtime, resolvedDraft, detailsPage1Text } = input;
  const valueByKey = buildOrderPdfFieldValueMap({
    scalarFields: resolvedDraft,
    details: detailsPage1Text,
    notes: resolvedDraft.notes,
  });

  for (const spec of listOrderPdfFieldSpecs()) {
    fieldOps.setFieldText({
      templateFieldName: spec.templateFieldName,
      generatedFieldName: spec.generatedFieldName,
      key: spec.key,
      value: valueByKey[spec.key],
      box: spec.templateBox,
      multiline: spec.multiline || undefined,
      align: spec.align === 'left' ? runtime.TextAlignment.Left : runtime.TextAlignment.Right,
    });
  }
}

async function addPrimaryPageAnnotationLayer(input: {
  App: AppContainer;
  deps: ExportOrderPdfDeps;
  runtime: OrderPdfBuilderRuntimeLike;
  draft: OrderPdfDraftLike;
  captureOps: Pick<ExportOrderPdfCaptureOps, 'renderSketchAnnotationLayerPngBytes'>;
}): Promise<void> {
  const { App, deps, runtime, draft, captureOps } = input;
  try {
    const pngBytes = await captureOps.renderSketchAnnotationLayerPngBytes({
      app: App,
      draft,
      key: 'orderPdfPage1',
      width: runtime.pageWidth * ORDER_PDF_PRIMARY_PAGE_ANNOTATION_RASTER_SCALE,
      height: runtime.pageHeight * ORDER_PDF_PRIMARY_PAGE_ANNOTATION_RASTER_SCALE,
    });
    if (!pngBytes?.byteLength) return;
    const img = await runtime.pdfDoc.embedPng(pngBytes);
    runtime.firstPage.drawImage(img, {
      x: 0,
      y: 0,
      width: runtime.pageWidth,
      height: runtime.pageHeight,
    });
  } catch (error) {
    deps._exportReportThrottled(App, 'buildOrderPdfInteractive.primaryPageAnnotations', error, {
      throttleMs: 1000,
    });
  }
}

export async function buildOrderPdfDocumentResult(input: {
  App: AppContainer;
  deps: ExportOrderPdfDeps;
  textOps: ExportOrderPdfTextOps;
  runtime: OrderPdfBuilderRuntimeLike;
  fieldOps: OrderPdfBuilderFieldOps;
  draft: OrderPdfDraftLike;
  resolvedDraft: OrderPdfResolvedDraftLike;
  compositeImageSlotBytes: OrderPdfCompositeImageSlotBytes;
  captureOps: Pick<ExportOrderPdfCaptureOps, 'renderSketchAnnotationLayerPngBytes'>;
  buildOrderPdfFileName: (input: { orderNumber: string; projectName: string }) => string;
}): Promise<OrderPdfBuildResultLike | null> {
  const { App, deps, textOps, runtime, fieldOps, draft, resolvedDraft, compositeImageSlotBytes, captureOps } =
    input;

  const detailsSplit = splitOrderPdfDetailsOverflow({
    App,
    deps,
    text: resolvedDraft.orderDetails,
    font: runtime.font,
    box: ORDER_PDF_TEMPLATE_BOXES.details,
    wrapTextToWidth: textOps.wrapTextToWidth,
  });

  setPrimaryDocumentFields({
    fieldOps,
    runtime,
    resolvedDraft,
    detailsPage1Text: detailsSplit.page1Text,
  });

  await addPrimaryPageAnnotationLayer({ App, deps, runtime, draft, captureOps });

  await fieldOps.addOverflowDetailsPage(detailsSplit.overflowText, runtime.TextAlignment.Right);
  for (const pngBytes of listOrderPdfCompositeImagePageBytes({
    flags: resolvedDraft,
    slotBytes: compositeImageSlotBytes,
  })) {
    await fieldOps.addCompositeImagesPage(pngBytes);
  }

  const outBytes = await runtime.pdfDoc.save({ updateFieldAppearances: false });
  const outCopy = Uint8Array.from(outBytes);
  const blob = new Blob([outCopy.buffer], { type: 'application/pdf' });
  const fileName = input.buildOrderPdfFileName({
    orderNumber: resolvedDraft.orderNumber,
    projectName: resolvedDraft.projectName,
  });
  return { blob, fileName, projectName: resolvedDraft.projectName };
}

export function validateOrderPdfTemplateOrToast(input: {
  App: AppContainer;
  deps: ExportOrderPdfDeps;
  validateTemplate: (requiredTemplateFields: readonly string[]) => { ok: boolean; problems: string[] };
}): boolean {
  const sanity = input.validateTemplate(ORDER_PDF_REQUIRED_TEMPLATE_FIELDS);
  if (sanity.ok) return true;

  input.deps._reportExportError(
    input.App,
    'orderPdfTemplate.sanity',
    new Error('order_template.pdf failed sanity validation'),
    {
      interactivePdf: true,
      problems: sanity.problems.slice(0, 5),
    }
  );
  input.deps._toast(
    input.App,
    `תבנית PDF לא תקינה ולכן ה-PDF יוצא ריק באקרובט.\n${sanity.problems[0] || ''}\nהפתרון: לערוך ב-Acrobat Prepare Form ולשמור (לא Print-to-PDF).`,
    'error'
  );
  return false;
}
