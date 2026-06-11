import type { ReactElement } from 'react';

import { createPortal } from 'react-dom';

import { computeOrderPdfOverlayLayout } from './order_pdf_overlay_layout.js';
import { readOrderPdfSketchImageSlotEnabled } from './order_pdf_overlay_sketch_image_slots_runtime.js';
import { OrderPdfOverlayEditorSurface } from './order_pdf_overlay_editor_surface.js';
import { OrderPdfOverlayToolbar } from './order_pdf_overlay_toolbar.js';
import { useOrderPdfOverlayController } from './order_pdf_overlay_controller.js';
import {
  useOrderPdfOverlayComponentApis,
  useOrderPdfOverlayComponentEnv,
} from './order_pdf_overlay_component_runtime.js';
import {
  useOrderPdfOverlayComponentActions,
  useOrderPdfOverlayComponentRefs,
  useOrderPdfOverlayComponentUiState,
} from './order_pdf_overlay_component_state.js';
import { useOrderPdfOverlaySketchPreview } from './order_pdf_overlay_sketch_preview_controller.js';
import { useApp, useMeta, useUiFeedback } from '../hooks.js';

export function OrderPdfInPlaceEditorOverlay(): ReactElement | null {
  const app = useApp();
  const meta = useMeta();
  const fb = useUiFeedback();

  const env = useOrderPdfOverlayComponentEnv({ app, fb });
  const ui = useOrderPdfOverlayComponentUiState();
  const refs = useOrderPdfOverlayComponentRefs();
  const actions = useOrderPdfOverlayComponentActions({
    app,
    meta,
    setDraft: ui.setDraft,
    setZoom: ui.setZoom,
    detailsDirtyRef: refs.detailsDirtyRef,
  });
  const apis = useOrderPdfOverlayComponentApis({
    app,
    fb,
    docMaybe: env.docMaybe,
    winMaybe: env.winMaybe,
  });

  const controller = useOrderPdfOverlayController({ env, ui, refs, actions, apis });
  const sketchPreview = useOrderPdfOverlaySketchPreview({
    app,
    open: ui.open,
    draft: ui.draft,
    pdfSourceTick: ui.pdfSourceTick,
    docMaybe: env.docMaybe,
    winMaybe: env.winMaybe,
    buildSketchPreview: controller.buildSketchPreview,
  });

  const body = env.docMaybe?.body ?? null;
  if (!ui.open || !body) return null;

  const layout = computeOrderPdfOverlayLayout({
    pageSize: refs.pageSizeRef.current,
    zoom: ui.zoom,
    importedPdfImagePageCount: ui.importedPdfImagePageCount,
  });

  return createPortal(
    <OrderPdfOverlayEditorSurface
      toolbar={
        <OrderPdfOverlayToolbar
          zoom={ui.zoom}
          onZoomOut={() => controller.setZoomUi(ui.zoom - 0.1)}
          onZoomIn={() => controller.setZoomUi(ui.zoom + 0.1)}
          onRefreshAuto={controller.refreshAuto}
          onLoadPdfClick={controller.onLoadPdfClick}
          pdfFileInputRef={refs.pdfFileInputRef}
          onPdfFileSelected={controller.onPdfFileSelected}
          onExportInteractive={controller.exportInteractive}
          onExportImagePdf={controller.exportImagePdf}
          imagePdfBusy={ui.imagePdfBusy}
          onExportInteractiveToGmail={controller.exportInteractiveToGmail}
          onExportInteractiveDownloadAndGmail={controller.exportInteractiveDownloadAndGmail}
          gmailBusy={ui.gmailBusy}
          hasImportedPdfImages={layout.importedPdfFlags.hasImportedPdfImages}
          hasImportedPdfRenderImage={layout.importedPdfFlags.hasImportedPdfRenderImage}
          hasImportedPdfOpenImage={layout.importedPdfFlags.hasImportedPdfOpenImage}
          includeRenderSketchOn={readOrderPdfSketchImageSlotEnabled(ui.draft, 'renderSketch')}
          includeOpenClosedOn={readOrderPdfSketchImageSlotEnabled(ui.draft, 'openClosed')}
          onToggleRenderSketch={controller.onToggleRenderSketch}
          onToggleOpenClosed={controller.onToggleOpenClosed}
          onClose={actions.close}
        />
      }
      dragOver={ui.dragOver}
      layout={layout}
      draft={ui.draft}
      overlayRef={refs.overlayRef}
      containerRef={refs.containerRef}
      canvasRef={refs.canvasRef}
      detailsRichRef={refs.detailsRichRef}
      notesRichRef={refs.notesRichRef}
      orderNoInputRef={refs.orderNoInputRef}
      detailsEditorHandlers={controller.detailsEditorHandlers}
      notesEditorHandlers={controller.notesEditorHandlers}
      onScalarFieldChange={controller.handleScalarFieldChange}
      onStagePointerDownCapture={controller.onStagePointerDownCapture}
      onStagePointerMoveCapture={controller.onStagePointerMoveCapture}
      onStagePointerUpCapture={controller.onStagePointerUpCapture}
      onStagePointerCancelCapture={controller.onStagePointerCancelCapture}
      onStageDragOver={controller.onStageDragOver}
      onStageDragLeave={controller.onStageDragLeave}
      onStageDrop={controller.onStageDrop}
      inlineConfirm={ui.inlineConfirm}
      onConfirmInlineOk={controller.confirmInlineOk}
      onConfirmInlineCancel={controller.confirmInlineCancel}
      sketchPreviewOpen={sketchPreview.sketchPreviewOpen}
      sketchPreviewBusy={sketchPreview.sketchPreviewBusy}
      sketchPreviewError={sketchPreview.sketchPreviewError}
      sketchPreviewEntries={sketchPreview.sketchPreviewEntries}
      onToggleSketchPreview={sketchPreview.toggleSketchPreview}
      onRefreshSketchPreview={() => void sketchPreview.refreshSketchPreview()}
      onAppendSketchStroke={controller.appendSketchStroke}
      onUpsertSketchTextBox={controller.upsertSketchTextBox}
      onDeleteSketchTextBox={controller.deleteSketchTextBox}
      onUndoSketchStroke={controller.undoSketchStroke}
      onRedoSketchAnnotation={controller.redoSketchAnnotation}
      onClearSketchStrokes={controller.clearSketchStrokes}
    />,
    body
  );
}
