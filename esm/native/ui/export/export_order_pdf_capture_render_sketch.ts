import type { AppContainer } from '../../../../types/app.js';
import type { OrderPdfDraftLike } from '../../../../types/build.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import {
  buildOrderPdfNotesTransform,
  captureCompositeWithLogoFallback,
  createOrderPdfCompositeCanvas,
  readOrderPdfCompositeBase,
  restoreOrderPdfCompositeCamera,
} from './export_order_pdf_capture_composite_shared.js';

export function createOrderPdfCaptureRenderSketchOp(
  deps: ExportOrderPdfDeps,
  canvasToPngBytes: (canvas: HTMLCanvasElement) => Promise<Uint8Array>
) {
  return async function captureCompositeRenderSketchPngBytes(
    App: AppContainer,
    _draft?: OrderPdfDraftLike | null
  ): Promise<Uint8Array> {
    App = deps._requireApp(App);
    if (!deps.hasDom(App)) throw new Error('no dom');

    const base = readOrderPdfCompositeBase(App, deps);
    const originalSketchMode = !!deps.readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false);
    const restoreExportWall = deps._applyExportWallColorOverride(App);
    const notesTransform = buildOrderPdfNotesTransform(App, deps, base);

    const createComposite = async (includeLogo: boolean): Promise<HTMLCanvasElement> => {
      const compositeCanvas = createOrderPdfCompositeCanvas(App, deps, base, includeLogo);
      const ctx = compositeCanvas.getContext('2d');
      if (!ctx) throw new Error('[WardrobePro][ESM] 2d canvas context unavailable');

      try {
        if (!!deps.readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false)) {
          deps.applyViewportSketchMode(App, false, {
            source: 'export:pdf',
            rebuild: true,
            updateShadows: false,
            reason: 'export:captureCompositeRenderSketch:render',
          });
        }
      } catch (e) {
        deps._exportReportThrottled(App, 'captureCompositeRenderSketch.setSketchMode.off', e, {
          throttleMs: 1000,
        });
      }

      deps._renderSceneForExport(App, base.renderer, base.scene, base.camera);
      ctx.drawImage(deps._getRendererCanvasSource(base.rendererSurface), 0, base.titleHeight);
      if (base.notesEnabled) {
        await deps._renderAllNotesToCanvas(
          App,
          ctx,
          base.originalWidth,
          base.originalHeight,
          base.titleHeight,
          notesTransform
        );
      }

      try {
        if (!deps.readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false)) {
          deps.applyViewportSketchMode(App, true, {
            source: 'export:pdf',
            rebuild: true,
            updateShadows: false,
            reason: 'export:captureCompositeRenderSketch:sketch',
          });
        }
      } catch (e) {
        deps._exportReportThrottled(App, 'captureCompositeRenderSketch.setSketchMode.on', e, {
          throttleMs: 1000,
        });
      }

      deps._renderSceneForExport(App, base.renderer, base.scene, base.camera);
      const secondImageY = base.titleHeight + base.originalHeight + base.gap;
      ctx.drawImage(deps._getRendererCanvasSource(base.rendererSurface), 0, secondImageY);
      if (base.notesEnabled) {
        await deps._renderAllNotesToCanvas(
          App,
          ctx,
          base.originalWidth,
          base.originalHeight,
          secondImageY,
          notesTransform
        );
      }
      return compositeCanvas;
    };

    try {
      return await captureCompositeWithLogoFallback(
        App,
        deps,
        'captureCompositeRenderSketch.createComposite',
        createComposite,
        canvasToPngBytes
      );
    } finally {
      try {
        if (!!deps.readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false) !== originalSketchMode) {
          deps.applyViewportSketchMode(App, originalSketchMode, {
            source: 'export:pdf',
            rebuild: true,
            updateShadows: false,
            reason: 'export:captureCompositeRenderSketch:restore',
          });
        }
      } catch (e) {
        deps._exportReportThrottled(App, 'captureCompositeRenderSketch.restoreSketchMode', e, {
          throttleMs: 1000,
        });
      }
      try {
        restoreOrderPdfCompositeCamera(App, deps, base);
      } catch (e) {
        deps._exportReportThrottled(App, 'captureCompositeRenderSketch.restoreCamera', e, {
          throttleMs: 1000,
        });
      }
      if (typeof restoreExportWall === 'function') restoreExportWall();
    }
  };
}
