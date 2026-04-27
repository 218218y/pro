// Order-PDF viewer capture/composite workflows kept separate from draft + pdf build seams.

import type { AppContainer } from '../../../../types/app.js';
import type { OrderPdfDraftLike } from '../../../../types/build.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import type { ExportOrderPdfCaptureBase } from './export_order_pdf_capture_shared.js';
import { createOrderPdfCaptureCanvasOps } from './export_order_pdf_capture_canvas.js';
import { createOrderPdfCaptureOpenClosedOp } from './export_order_pdf_capture_open_closed.js';
import { createOrderPdfCaptureRenderSketchOp } from './export_order_pdf_capture_render_sketch.js';
import { createOrderPdfCaptureViewerOp } from './export_order_pdf_capture_viewer.js';
import { createOrderPdfApplySketchAnnotationsToCompositePngOp } from './export_order_pdf_sketch_annotations.js';

export type ExportOrderPdfCaptureOps = {
  applySketchAnnotationsToCompositePngBytes: (args: {
    app: AppContainer;
    draft: OrderPdfDraftLike | null | undefined;
    key: 'renderSketch' | 'openClosed';
    pngBytes: Uint8Array | null | undefined;
  }) => Promise<Uint8Array | null>;
  canvasToPngBytes: (canvas: HTMLCanvasElement) => Promise<Uint8Array>;
  captureCompositeOpenClosedPngBytes: (
    app: AppContainer,
    draft?: OrderPdfDraftLike | null
  ) => Promise<Uint8Array>;
  captureCompositeRenderSketchPngBytes: (
    app: AppContainer,
    draft?: OrderPdfDraftLike | null
  ) => Promise<Uint8Array>;
  fetchBytesFirstOk: (app: AppContainer, urls: string[]) => Promise<Uint8Array | null>;
  captureViewerPng: (
    app: AppContainer,
    opts: { doorsOpen: boolean; sketchMode: boolean },
    base: ExportOrderPdfCaptureBase
  ) => Promise<Uint8Array>;
};

export function createExportOrderPdfCaptureOps(deps: ExportOrderPdfDeps): ExportOrderPdfCaptureOps {
  const canvasOps = createOrderPdfCaptureCanvasOps(deps);
  return {
    ...canvasOps,
    applySketchAnnotationsToCompositePngBytes: createOrderPdfApplySketchAnnotationsToCompositePngOp(
      deps,
      canvasOps.canvasToPngBytes
    ),
    captureCompositeOpenClosedPngBytes: createOrderPdfCaptureOpenClosedOp(deps, canvasOps.canvasToPngBytes),
    captureCompositeRenderSketchPngBytes: createOrderPdfCaptureRenderSketchOp(
      deps,
      canvasOps.canvasToPngBytes
    ),
    captureViewerPng: createOrderPdfCaptureViewerOp(deps, canvasOps.canvasToPngBytes),
  };
}
