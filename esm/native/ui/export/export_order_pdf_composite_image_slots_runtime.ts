import {
  listOrderPdfSketchImageSlotSpecs,
  readOrderPdfSketchImageSlotEnabled,
  type OrderPdfSketchImageSlotKey,
} from '../react/pdf/order_pdf_overlay_sketch_image_slots_runtime.js';

export type OrderPdfCompositeImageFlagsLike = {
  includeRenderSketch?: boolean;
  includeOpenClosed?: boolean;
};

export type OrderPdfCompositeImageSlotBytes = Partial<Record<OrderPdfSketchImageSlotKey, Uint8Array | null>>;

export type OrderPdfCompositeImageLegacyBytes = {
  pngRenderSketch: Uint8Array | null;
  pngOpenClosed: Uint8Array | null;
};

export type OrderPdfCompositeImageCapturePlanEntry = {
  key: OrderPdfSketchImageSlotKey;
  basePngBytes: Uint8Array | null;
};

export function readOrderPdfCompositeImageSlotBytesFromLegacy(
  value: Partial<OrderPdfCompositeImageLegacyBytes> | null | undefined
): OrderPdfCompositeImageSlotBytes {
  return {
    renderSketch: value?.pngRenderSketch ?? null,
    openClosed: value?.pngOpenClosed ?? null,
  };
}

export function buildOrderPdfCompositeImageLegacyBytes(args: {
  flags: OrderPdfCompositeImageFlagsLike | null | undefined;
  slotBytes: OrderPdfCompositeImageSlotBytes | null | undefined;
}): OrderPdfCompositeImageLegacyBytes {
  const slotBytes = args.slotBytes || {};
  return {
    pngRenderSketch: readOrderPdfSketchImageSlotEnabled(args.flags, 'renderSketch')
      ? (slotBytes.renderSketch ?? null)
      : null,
    pngOpenClosed: readOrderPdfSketchImageSlotEnabled(args.flags, 'openClosed')
      ? (slotBytes.openClosed ?? null)
      : null,
  };
}

export function listOrderPdfCompositeImageCapturePlan(args: {
  flags: OrderPdfCompositeImageFlagsLike | null | undefined;
  cachedSlotBytes: OrderPdfCompositeImageSlotBytes | null | undefined;
}): OrderPdfCompositeImageCapturePlanEntry[] {
  const cachedSlotBytes = args.cachedSlotBytes || {};
  const out: OrderPdfCompositeImageCapturePlanEntry[] = [];
  for (const spec of listOrderPdfSketchImageSlotSpecs()) {
    if (!readOrderPdfSketchImageSlotEnabled(args.flags, spec.key)) continue;
    out.push({
      key: spec.key,
      basePngBytes: cachedSlotBytes[spec.key] ?? null,
    });
  }
  return out;
}

export function listOrderPdfCompositeImagePageBytes(args: {
  flags: OrderPdfCompositeImageFlagsLike | null | undefined;
  slotBytes: OrderPdfCompositeImageSlotBytes | null | undefined;
}): Uint8Array[] {
  const slotBytes = args.slotBytes || {};
  const out: Uint8Array[] = [];
  for (const spec of listOrderPdfSketchImageSlotSpecs()) {
    if (!readOrderPdfSketchImageSlotEnabled(args.flags, spec.key)) continue;
    const pngBytes = slotBytes[spec.key];
    if (pngBytes instanceof Uint8Array && pngBytes.byteLength >= 0) out.push(pngBytes);
  }
  return out;
}
