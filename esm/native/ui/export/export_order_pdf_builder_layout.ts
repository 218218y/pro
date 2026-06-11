import type { AppContainer } from '../../../../types/app.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import type { ExportOrderPdfTextOps } from './export_order_pdf_text_contracts.js';
import type {
  OrderPdfDetailsSplitLike,
  OrderPdfResolvedDraftLike,
  PdfRectLike,
} from './export_order_pdf_builder_shared.js';
import type { PdfWidthFontLike } from './export_order_pdf_contracts_shared.js';
import type { OrderPdfDraftLike } from '../../../../types/build.js';
import { resolveOrderPdfDraft } from './export_order_pdf_builder_shared.js';
import {
  buildOrderPdfCompositeCaptureSignature,
  readOrderPdfCompositeCaptureCache,
  writeOrderPdfCompositeCaptureCache,
} from './export_order_pdf_capture_cache.js';
import {
  buildOrderPdfCompositeImageLegacyBytes,
  listOrderPdfCompositeImageCapturePlan,
  type OrderPdfCompositeImageSlotBytes,
  readOrderPdfCompositeImageSlotBytesFromLegacy,
} from './export_order_pdf_composite_image_slots_runtime.js';

export function resolveOrderPdfBuildDraft(
  App: AppContainer,
  draft: OrderPdfDraftLike,
  deps: ExportOrderPdfDeps,
  textOps: ExportOrderPdfTextOps
): OrderPdfResolvedDraftLike {
  return resolveOrderPdfDraft(App, draft, deps, textOps);
}

export async function captureOrderPdfCompositeImages(
  App: AppContainer,
  draft: OrderPdfDraftLike,
  resolvedDraft: OrderPdfResolvedDraftLike,
  deps: ExportOrderPdfDeps,
  captureOps: {
    applySketchAnnotationsToCompositePngBytes: (args: {
      app: AppContainer;
      draft: OrderPdfDraftLike | null | undefined;
      key: 'renderSketch' | 'openClosed';
      pngBytes: Uint8Array | null | undefined;
    }) => Promise<Uint8Array | null>;
    captureCompositeRenderSketchPngBytes: (
      app: AppContainer,
      draft?: OrderPdfDraftLike | null
    ) => Promise<Uint8Array | null>;
    captureCompositeOpenClosedPngBytes: (
      app: AppContainer,
      draft?: OrderPdfDraftLike | null
    ) => Promise<Uint8Array | null>;
  }
): Promise<OrderPdfCompositeImageSlotBytes> {
  const captureSignature = buildOrderPdfCompositeCaptureSignature(App, draft);
  const cachedSlotBytes = readOrderPdfCompositeImageSlotBytesFromLegacy(
    readOrderPdfCompositeCaptureCache(captureSignature)
  );
  const capturePlan = listOrderPdfCompositeImageCapturePlan({
    flags: resolvedDraft,
    cachedSlotBytes,
  });
  const captureSlotOps: Record<'renderSketch' | 'openClosed', () => Promise<Uint8Array | null>> = {
    renderSketch: async () => captureOps.captureCompositeRenderSketchPngBytes(App),
    openClosed: async () => captureOps.captureCompositeOpenClosedPngBytes(App),
  };

  const baseSlotBytes: OrderPdfCompositeImageSlotBytes = {};
  for (const entry of capturePlan) {
    let basePngBytes = entry.basePngBytes;
    if (!basePngBytes) {
      try {
        basePngBytes = await captureSlotOps[entry.key]();
      } catch (e) {
        deps._exportReportThrottled(App, `buildOrderPdfInteractive.capture:${entry.key}`, e, {
          throttleMs: 1000,
        });
        basePngBytes = null;
      }
    }
    baseSlotBytes[entry.key] = basePngBytes;
  }

  writeOrderPdfCompositeCaptureCache({
    signature: captureSignature,
    ...buildOrderPdfCompositeImageLegacyBytes({ flags: resolvedDraft, slotBytes: baseSlotBytes }),
  });

  const finalSlotBytes: OrderPdfCompositeImageSlotBytes = {};
  for (const entry of capturePlan) {
    finalSlotBytes[entry.key] = await captureOps.applySketchAnnotationsToCompositePngBytes({
      app: App,
      draft,
      key: entry.key,
      pngBytes: baseSlotBytes[entry.key] ?? null,
    });
  }

  return finalSlotBytes;
}

export function splitOrderPdfDetailsOverflow(opts: {
  App: AppContainer;
  deps: ExportOrderPdfDeps;
  text: string;
  font: PdfWidthFontLike;
  box: PdfRectLike;
  wrapTextToWidth: ExportOrderPdfTextOps['wrapTextToWidth'];
}): OrderPdfDetailsSplitLike {
  const { App, deps, text, font, box, wrapTextToWidth } = opts;
  let page1Text = text;
  let overflowText = '';

  try {
    const fontSize = 11;
    const padding = 6;
    const lineGap = Math.max(2, Math.round(fontSize * 0.25));
    const lineHeight = fontSize + lineGap;
    const maxWidth = Math.max(1, box.w - padding * 2);
    const lines = wrapTextToWidth(text, font, fontSize, maxWidth);
    const maxLines = Math.max(1, Math.floor((box.h - padding * 2) / lineHeight));
    if (lines.length > maxLines) {
      page1Text = lines.slice(0, maxLines).join('\n');
      overflowText = lines.slice(maxLines).join('\n');
    }
  } catch (e) {
    deps._exportReportThrottled(App, 'buildOrderPdfInteractive.detailsOverflow.calc', e, {
      throttleMs: 1500,
    });
  }

  return { page1Text, overflowText };
}
