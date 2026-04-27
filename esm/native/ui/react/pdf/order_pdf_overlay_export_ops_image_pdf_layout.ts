import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import {
  coerceOrderPdfText,
  ORDER_PDF_IMAGE_CONTINUATION_MARGIN,
  ORDER_PDF_IMAGE_TEMPLATE_BOXES,
  paintOrderPdfTextInBox,
  pdfBoxToPx,
} from './order_pdf_overlay_export_ops_image_pdf_support.js';
import type { OrderPdfOverlayExportOpsDeps } from './order_pdf_overlay_export_ops_shared.js';

type TemplateBoxKey = keyof typeof ORDER_PDF_IMAGE_TEMPLATE_BOXES;
type RasterBox = ReturnType<typeof pdfBoxToPx>;

export type RasterPageLayout = {
  boxes: Record<TemplateBoxKey, RasterBox>;
  fontPxSmall: number;
  fontPxMulti: number;
  continuationBox: RasterBox;
  continuationFontPx: number;
};

type RasterTextSpec = {
  box: TemplateBoxKey;
  text: string;
  dir: 'rtl' | 'ltr';
  align: 'left' | 'right';
  multiline: boolean;
  fontPx: number;
  preparedLines?: string[];
};

export function buildRasterPageLayout(
  pageW: number,
  pageH: number,
  canvasW: number,
  canvasH: number
): RasterPageLayout {
  const boxes = Object.fromEntries(
    Object.entries(ORDER_PDF_IMAGE_TEMPLATE_BOXES).map(([key, box]) => [
      key,
      pdfBoxToPx(box, pageW, pageH, canvasW, canvasH),
    ])
  ) as Record<TemplateBoxKey, RasterBox>;
  const fontPxSmall = 12 * boxes.orderNo.sx;
  const fontPxMulti = 12 * boxes.details.sx;
  const continuationBox = pdfBoxToPx(
    {
      x: ORDER_PDF_IMAGE_CONTINUATION_MARGIN,
      y: ORDER_PDF_IMAGE_CONTINUATION_MARGIN,
      w: pageW - ORDER_PDF_IMAGE_CONTINUATION_MARGIN * 2,
      h: pageH - ORDER_PDF_IMAGE_CONTINUATION_MARGIN * 2,
    },
    pageW,
    pageH,
    canvasW,
    canvasH
  );
  return {
    boxes,
    fontPxSmall,
    fontPxMulti,
    continuationBox,
    continuationFontPx: 12 * continuationBox.sx,
  };
}

function paintRasterTextSpecs(args: {
  ctx: CanvasRenderingContext2D;
  layout: RasterPageLayout;
  fontFamily: string;
  report: OrderPdfOverlayExportOpsDeps['orderPdfOverlayReportNonFatal'];
  specs: RasterTextSpec[];
}): void {
  const { ctx, layout, fontFamily, report, specs } = args;
  for (const spec of specs) {
    paintOrderPdfTextInBox({
      ctx,
      boxPx: layout.boxes[spec.box],
      text: spec.text,
      fontPx: spec.fontPx,
      fontFamily,
      dir: spec.dir,
      align: spec.align,
      multiline: spec.multiline,
      preparedLines: spec.preparedLines,
      report,
    });
  }
}

export function paintRasterizedOrderTemplatePage(args: {
  ctx: CanvasRenderingContext2D;
  draft: OrderPdfDraft;
  layout: RasterPageLayout;
  fontFamily: string;
  detailsPreparedLines?: string[];
  report: OrderPdfOverlayExportOpsDeps['orderPdfOverlayReportNonFatal'];
}): void {
  const { ctx, draft, layout, fontFamily, detailsPreparedLines, report } = args;
  const textMap = {
    orderNo: coerceOrderPdfText(draft.orderNumber),
    date: coerceOrderPdfText(draft.orderDate),
    name: coerceOrderPdfText(draft.projectName),
    address: coerceOrderPdfText(draft.deliveryAddress),
    phone: coerceOrderPdfText(draft.phone),
    mobile: coerceOrderPdfText(draft.mobile),
    details: Array.isArray(detailsPreparedLines) ? detailsPreparedLines.join('\n') : '',
    notes: coerceOrderPdfText(draft.notes),
  };

  paintRasterTextSpecs({
    ctx,
    layout,
    fontFamily,
    report,
    specs: [
      {
        box: 'orderNo',
        text: textMap.orderNo,
        fontPx: layout.fontPxSmall,
        dir: 'ltr',
        align: 'right',
        multiline: false,
      },
      {
        box: 'date',
        text: textMap.date,
        fontPx: layout.fontPxSmall,
        dir: 'ltr',
        align: 'left',
        multiline: false,
      },
      {
        box: 'name',
        text: textMap.name,
        fontPx: layout.fontPxSmall,
        dir: 'rtl',
        align: 'right',
        multiline: false,
      },
      {
        box: 'address',
        text: textMap.address,
        fontPx: layout.fontPxSmall,
        dir: 'rtl',
        align: 'right',
        multiline: false,
      },
      {
        box: 'phone',
        text: textMap.phone,
        fontPx: layout.fontPxSmall,
        dir: 'ltr',
        align: 'right',
        multiline: false,
      },
      {
        box: 'mobile',
        text: textMap.mobile,
        fontPx: layout.fontPxSmall,
        dir: 'ltr',
        align: 'right',
        multiline: false,
      },
      {
        box: 'details',
        text: textMap.details,
        fontPx: layout.fontPxMulti,
        dir: 'rtl',
        align: 'right',
        multiline: true,
        preparedLines: Array.isArray(detailsPreparedLines) ? detailsPreparedLines : undefined,
      },
      {
        box: 'notes',
        text: textMap.notes,
        fontPx: layout.fontPxMulti,
        dir: 'rtl',
        align: 'right',
        multiline: true,
      },
    ],
  });
}
