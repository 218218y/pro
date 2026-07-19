import type { ReactElement } from 'react';

import { OrderPdfOverlayEditorModeControls } from './order_pdf_overlay_editor_mode_controls.js';
import { useOrderPdfOverlayEditorModes } from './order_pdf_overlay_editor_modes.js';
import { OrderPdfOverlayEditorStage } from './order_pdf_overlay_editor_stage.js';
import type { OrderPdfOverlayEditorSurfaceProps } from './order_pdf_overlay_editor_surface_contracts.js';
import { OrderPdfOverlayInlineConfirm } from './order_pdf_overlay_inline_confirm.js';

export type { OrderPdfOverlayEditorSurfaceProps } from './order_pdf_overlay_editor_surface_contracts.js';

export function OrderPdfOverlayEditorSurface(props: OrderPdfOverlayEditorSurfaceProps): ReactElement {
  const { toolbar, refs, stage, sketch, annotations, inlineConfirm } = props;
  const modes = useOrderPdfOverlayEditorModes({
    sketch,
    stage: {
      onPointerDownCapture: stage.onPointerDownCapture,
      onPointerMoveCapture: stage.onPointerMoveCapture,
      onPointerUpCapture: stage.onPointerUpCapture,
      onPointerCancelCapture: stage.onPointerCancelCapture,
    },
  });

  return (
    <div
      className="wp-pdf-editor-overlay"
      dir="ltr"
      ref={refs.overlayRef}
      role="dialog"
      aria-modal="true"
      data-testid="order-pdf-overlay"
      data-order-pdf-ready="true"
      data-wp-history-shortcuts="suspend"
    >
      {toolbar}

      <OrderPdfOverlayEditorModeControls
        pdfPageAnnotationOpen={modes.pdfPageAnnotationOpen}
        sketchPreviewOpen={sketch.open}
        sketchPreviewReady={sketch.ready}
        pdfPageAnnotationTooltip={modes.pdfPageAnnotationTooltip}
        sketchPreviewTooltip={modes.sketchPreviewTooltip}
        onClosePdfPageAnnotationMode={modes.closePdfPageAnnotationMode}
        onTogglePdfPageAnnotationMode={modes.togglePdfPageAnnotationMode}
        onToggleSketchPreview={modes.toggleSketchPreview}
      />

      <OrderPdfOverlayEditorStage
        refs={refs}
        stage={stage}
        sketch={sketch}
        annotations={annotations}
        pdfPageAnnotationOpen={modes.pdfPageAnnotationOpen}
        editorStageRef={modes.editorStageRef}
        sketchPreviewPanelRef={modes.sketchPreviewPanelRef}
        onStagePointerDownCapture={modes.onStagePointerDownCapture}
        onStagePointerMoveCapture={modes.onStagePointerMoveCapture}
        onStagePointerUpCapture={modes.onStagePointerUpCapture}
        onStagePointerCancelCapture={modes.onStagePointerCancelCapture}
      />

      <OrderPdfOverlayInlineConfirm {...inlineConfirm} />
    </div>
  );
}
