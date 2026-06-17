import type { AppContainer } from '../../../../types/app.js';
import type { OrderPdfDraftLike } from '../../../../types/build.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import {
  clearNotesExportTransform,
  getNotesExportTransform,
  setNotesExportTransform,
} from '../../services/api.js';
import { readNotesTransform } from './export_order_pdf_shared.js';
import {
  createLiveViewportNotesTransform,
  shouldPreserveLiveViewportForSketchImageExport,
} from './export_canvas_workflow_viewport_policy.js';
import {
  buildOrderPdfNotesTransform,
  captureCompositeWithLogoRecovery,
  createOrderPdfCompositeCanvas,
  readOrderPdfCompositeBase,
  restoreOrderPdfCompositeCamera,
} from './export_order_pdf_capture_composite_shared.js';

export function createOrderPdfCaptureOpenClosedOp(
  deps: ExportOrderPdfDeps,
  canvasToPngBytes: (canvas: HTMLCanvasElement) => Promise<Uint8Array>
) {
  return async function captureCompositeOpenClosedPngBytes(
    App: AppContainer,
    _draft?: OrderPdfDraftLike | null
  ): Promise<Uint8Array> {
    App = deps._requireApp(App);
    if (!deps.hasDom(App)) throw new Error('no dom');

    const base = readOrderPdfCompositeBase(App, deps);
    const doorsGetOpen = () => !!deps.getDoorsOpen(App);
    const originalOpenState = doorsGetOpen();
    const restoreExportWall = deps._applyExportWallColorOverride(App);
    const preserveLiveViewport = shouldPreserveLiveViewportForSketchImageExport(App);

    setNotesExportTransform(App, preserveLiveViewport ? null : buildOrderPdfNotesTransform(App, deps, base));

    const createComposite = async (includeLogo: boolean): Promise<HTMLCanvasElement> => {
      const compositeCanvas = createOrderPdfCompositeCanvas(App, deps, base, includeLogo);
      const ctx = compositeCanvas.getContext('2d');
      if (!ctx) throw new Error('[WardrobePro][ESM] 2d canvas context unavailable');

      deps._setDoorsOpenForExport(App, false);
      deps._setBodyDoorStatusForNotes(App, false);
      deps._renderSceneForExport(App, base.renderer, base.scene, base.camera);
      const closedRendererSource = deps._getRendererCanvasSource(base.rendererSurface);
      ctx.drawImage(closedRendererSource, 0, base.titleHeight);
      if (base.notesEnabled) {
        await deps._renderAllNotesToCanvas(
          App,
          ctx,
          base.originalWidth,
          base.originalHeight,
          base.titleHeight,
          preserveLiveViewport
            ? createLiveViewportNotesTransform(closedRendererSource)
            : readNotesTransform(getNotesExportTransform(App))
        );
      }

      deps._setDoorsOpenForExport(App, true);
      deps._setBodyDoorStatusForNotes(App, true);
      deps._renderSceneForExport(App, base.renderer, base.scene, base.camera);
      const secondImageY = base.titleHeight + base.originalHeight + base.gap;
      const openRendererSource = deps._getRendererCanvasSource(base.rendererSurface);
      ctx.drawImage(openRendererSource, 0, secondImageY);
      if (base.notesEnabled) {
        await deps._renderAllNotesToCanvas(
          App,
          ctx,
          base.originalWidth,
          base.originalHeight,
          secondImageY,
          preserveLiveViewport
            ? createLiveViewportNotesTransform(openRendererSource)
            : readNotesTransform(getNotesExportTransform(App))
        );
      }
      return compositeCanvas;
    };

    try {
      return await captureCompositeWithLogoRecovery(
        App,
        deps,
        'captureCompositeOpenClosed.createComposite',
        createComposite,
        canvasToPngBytes
      );
    } finally {
      clearNotesExportTransform(App);
      deps._setBodyDoorStatusForNotes(App, originalOpenState);
      try {
        deps.setDoorsOpen(App, originalOpenState, { source: 'export:pdf:restore', forceUpdate: true });
      } catch (e) {
        deps._exportReportThrottled(App, 'captureCompositeOpenClosed.restoreDoorsOpen', e, {
          throttleMs: 1000,
        });
      }
      try {
        restoreOrderPdfCompositeCamera(App, deps, base);
      } catch (e) {
        deps._exportReportThrottled(App, 'captureCompositeOpenClosed.restoreCamera', e, { throttleMs: 1000 });
      }
      if (typeof restoreExportWall === 'function') restoreExportWall();
    }
  };
}
