import type { AppContainer } from '../../../../types/app.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import type { ExportOrderPdfCaptureBase } from './export_order_pdf_capture_shared.js';
import { readRendererDomSource } from './export_order_pdf_shared.js';

export function createOrderPdfCaptureViewerOp(
  deps: ExportOrderPdfDeps,
  canvasToPngBytes: (canvas: HTMLCanvasElement) => Promise<Uint8Array>
) {
  const {
    getCameraOrNull,
    _guard,
    readRuntimeScalarOrDefaultFromApp,
    applyViewportSketchMode,
    _renderSceneForExport,
    _createDomCanvas,
    _getRendererCanvasSource,
  } = deps;

  return async function captureViewerPng(
    App: AppContainer,
    opts: { doorsOpen: boolean; sketchMode: boolean },
    base: ExportOrderPdfCaptureBase
  ): Promise<Uint8Array> {
    const { renderer, scene, width, height, doorsSetOpen } = base;
    const camera = getCameraOrNull(App);
    if (!camera) throw new Error('[WardrobePro][ESM] no camera');

    _guard(App, 'captureViewerPng.toggleDoors', () => {
      doorsSetOpen(!!opts.doorsOpen);
    });

    _guard(App, 'captureViewerPng.toggleSketch', () => {
      if (!!readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false) !== !!opts.sketchMode) {
        applyViewportSketchMode(App, !!opts.sketchMode, {
          source: 'export:pdf',
          rebuild: true,
          updateShadows: false,
          reason: 'export:captureViewerPng',
        });
      }
    });

    _renderSceneForExport(App, renderer, scene, camera);
    const rendererSurface = readRendererDomSource(renderer);
    if (!rendererSurface) throw new Error('no renderer surface');
    const out = _createDomCanvas(App, width, height);
    const ctx = out.getContext('2d');
    if (!ctx) throw new Error('[WardrobePro][ESM] 2d canvas context unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(_getRendererCanvasSource(rendererSurface), 0, 0);
    out.toDataURL('image/png');
    return canvasToPngBytes(out);
  };
}
