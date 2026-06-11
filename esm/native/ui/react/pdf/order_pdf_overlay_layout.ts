import type { CSSProperties } from 'react';

import {
  computeOrderPdfOverlayFieldStyleMap,
  type OrderPdfFieldKey,
} from '../../pdf/order_pdf_field_specs_runtime.js';
import { resolveOrderPdfImportedImageFlags } from './order_pdf_overlay_sketch_image_slots_runtime.js';

export type OrderPdfOverlayPageSize = { w: number; h: number };
export type OrderPdfOverlayFieldStyleMap = {
  orderNumber: CSSProperties;
  orderDate: CSSProperties;
  projectName: CSSProperties;
  deliveryAddress: CSSProperties;
  phone: CSSProperties;
  mobile: CSSProperties;
  details: CSSProperties;
  notes: CSSProperties;
};

export type OrderPdfOverlayImageFlags = {
  hasImportedPdfImages: boolean;
  hasImportedPdfRenderImage: boolean;
  hasImportedPdfOpenImage: boolean;
};

export type OrderPdfOverlayLayout = {
  size: OrderPdfOverlayPageSize;
  cssScale: number;
  pageStyle: CSSProperties & { ['--wp-pdf-zoom']?: number };
  fieldStyles: OrderPdfOverlayFieldStyleMap;
  importedPdfFlags: OrderPdfOverlayImageFlags;
};

export function computeOrderPdfOverlayLayout(args: {
  pageSize: OrderPdfOverlayPageSize | null | undefined;
  zoom: number;
  importedPdfImagePageCount: number;
}): OrderPdfOverlayLayout {
  const size = args.pageSize || { w: 595, h: 842 };
  const cssScale = args.zoom;
  const importedPdfImagePageCount = Math.max(0, Number(args.importedPdfImagePageCount) || 0);
  const fieldStyles = computeOrderPdfOverlayFieldStyleMap(cssScale) as Record<
    OrderPdfFieldKey,
    CSSProperties
  >;

  return {
    size,
    cssScale,
    pageStyle: { direction: 'ltr', '--wp-pdf-zoom': cssScale },
    fieldStyles,
    importedPdfFlags: resolveOrderPdfImportedImageFlags(importedPdfImagePageCount),
  };
}
