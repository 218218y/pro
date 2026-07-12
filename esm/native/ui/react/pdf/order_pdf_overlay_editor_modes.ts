import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent, PointerEventHandler } from 'react';

import type {
  OrderPdfOverlayEditorStageModel,
  OrderPdfOverlaySketchModel,
} from './order_pdf_overlay_editor_surface_contracts.js';
import {
  createOrderPdfOverlayEditorModeState,
  isOrderPdfPageAnnotationModeOpen,
  orderPdfOverlayEditorModeReducer,
} from './order_pdf_overlay_editor_mode_state.js';
import { revealOrderPdfSketchPreviewInStage } from './order_pdf_overlay_sketch_preview_reveal_runtime.js';
import {
  captureStagePointerDown,
  captureStagePointerMove,
  createInitialStageGesture,
  finishStagePointerUp,
  resetStageGesture,
} from './order_pdf_overlay_stage_interactions.js';

type OrderPdfOverlayEditorModes = {
  pdfPageAnnotationOpen: boolean;
  editorStageRef: MutableRefObject<HTMLDivElement | null>;
  sketchPreviewPanelRef: MutableRefObject<HTMLElement | null>;
  pdfPageAnnotationTooltip: string;
  sketchPreviewTooltip: string;
  closePdfPageAnnotationMode: () => void;
  togglePdfPageAnnotationMode: () => void;
  toggleSketchPreview: () => void;
  onStagePointerDownCapture: PointerEventHandler<HTMLDivElement>;
  onStagePointerMoveCapture: PointerEventHandler<HTMLDivElement>;
  onStagePointerUpCapture: PointerEventHandler<HTMLDivElement>;
  onStagePointerCancelCapture: PointerEventHandler<HTMLDivElement>;
};

export function useOrderPdfOverlayEditorModes(args: {
  sketch: OrderPdfOverlaySketchModel;
  stage: Pick<
    OrderPdfOverlayEditorStageModel,
    'onPointerDownCapture' | 'onPointerMoveCapture' | 'onPointerUpCapture' | 'onPointerCancelCapture'
  >;
}): OrderPdfOverlayEditorModes {
  const { sketch, stage } = args;
  const {
    open: sketchOpen,
    busy: sketchBusy,
    error: sketchError,
    entries: sketchEntries,
    onToggle: onToggleSketchPreview,
    onClose: onCloseSketchPreview,
  } = sketch;
  const { onPointerDownCapture, onPointerMoveCapture, onPointerUpCapture, onPointerCancelCapture } = stage;
  const [interactionMode, dispatchInteractionMode] = useReducer(
    orderPdfOverlayEditorModeReducer,
    sketchOpen,
    createOrderPdfOverlayEditorModeState
  );
  const pdfPageAnnotationOpen = isOrderPdfPageAnnotationModeOpen(interactionMode);
  const pdfPageAnnotationDismissGestureRef = useRef(createInitialStageGesture());
  const editorStageRef = useRef<HTMLDivElement | null>(null);
  const sketchPreviewPanelRef = useRef<HTMLElement | null>(null);
  const pendingSketchPreviewRevealRef = useRef(false);

  const closePdfPageAnnotationMode = useCallback(() => {
    resetStageGesture(pdfPageAnnotationDismissGestureRef.current);
    dispatchInteractionMode({ type: 'close-pdf-page-annotation' });
  }, []);

  const togglePdfPageAnnotationMode = useCallback(() => {
    if (pdfPageAnnotationOpen) {
      closePdfPageAnnotationMode();
      return;
    }
    dispatchInteractionMode({ type: 'toggle-pdf-page-annotation' });
    if (sketchOpen) onCloseSketchPreview();
  }, [closePdfPageAnnotationMode, onCloseSketchPreview, pdfPageAnnotationOpen, sketchOpen]);

  const toggleSketchPreview = useCallback(() => {
    pendingSketchPreviewRevealRef.current = !sketchOpen;
    dispatchInteractionMode({ type: 'prepare-sketch-preview-toggle' });
    if (pdfPageAnnotationOpen) resetStageGesture(pdfPageAnnotationDismissGestureRef.current);
    onToggleSketchPreview();
  }, [onToggleSketchPreview, pdfPageAnnotationOpen, sketchOpen]);

  useEffect(() => {
    dispatchInteractionMode({ type: 'reconcile-sketch-visibility', open: sketchOpen });
  }, [sketchOpen]);

  useEffect(() => {
    if (!sketchOpen) {
      pendingSketchPreviewRevealRef.current = false;
      return undefined;
    }
    if (!pendingSketchPreviewRevealRef.current) return undefined;
    if (sketchBusy) return undefined;
    if (!sketchEntries.length && !sketchError) return undefined;

    const win = editorStageRef.current?.ownerDocument?.defaultView ?? null;
    let raf1 = 0;
    let raf2 = 0;

    const reveal = () => {
      const revealed = revealOrderPdfSketchPreviewInStage({
        host: editorStageRef.current,
        target: sketchPreviewPanelRef.current,
      });
      if (revealed) pendingSketchPreviewRevealRef.current = false;
    };

    if (!win || typeof win.requestAnimationFrame !== 'function') {
      reveal();
      return undefined;
    }

    raf1 = win.requestAnimationFrame(() => {
      raf2 = win.requestAnimationFrame(reveal);
    });

    return () => {
      if (raf1) win.cancelAnimationFrame(raf1);
      if (raf2) win.cancelAnimationFrame(raf2);
    };
  }, [sketchBusy, sketchEntries.length, sketchError, sketchOpen]);

  const onStagePointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pdfPageAnnotationOpen && event.target === event.currentTarget) {
        captureStagePointerDown(pdfPageAnnotationDismissGestureRef.current, event);
        return;
      }
      resetStageGesture(pdfPageAnnotationDismissGestureRef.current);
      onPointerDownCapture(event);
    },
    [onPointerDownCapture, pdfPageAnnotationOpen]
  );

  const onStagePointerMoveCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pdfPageAnnotationOpen && pdfPageAnnotationDismissGestureRef.current.down) {
        captureStagePointerMove(pdfPageAnnotationDismissGestureRef.current, event);
        return;
      }
      onPointerMoveCapture(event);
    },
    [onPointerMoveCapture, pdfPageAnnotationOpen]
  );

  const onStagePointerUpCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pdfPageAnnotationOpen && pdfPageAnnotationDismissGestureRef.current.down) {
        const shouldDismissPdfAnnotation = finishStagePointerUp(
          pdfPageAnnotationDismissGestureRef.current,
          event
        );
        if (shouldDismissPdfAnnotation) {
          event.preventDefault();
          event.stopPropagation();
          dispatchInteractionMode({ type: 'close-pdf-page-annotation' });
        }
        return;
      }
      onPointerUpCapture(event);
    },
    [onPointerUpCapture, pdfPageAnnotationOpen]
  );

  const onStagePointerCancelCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pdfPageAnnotationOpen && pdfPageAnnotationDismissGestureRef.current.down) {
        resetStageGesture(pdfPageAnnotationDismissGestureRef.current);
        return;
      }
      resetStageGesture(pdfPageAnnotationDismissGestureRef.current);
      onPointerCancelCapture(event);
    },
    [onPointerCancelCapture, pdfPageAnnotationOpen]
  );

  return {
    pdfPageAnnotationOpen,
    editorStageRef,
    sketchPreviewPanelRef,
    pdfPageAnnotationTooltip: pdfPageAnnotationOpen
      ? 'סגור ציור על עמוד ה-PDF'
      : 'פתח ציור והערות על עמוד ה-PDF',
    sketchPreviewTooltip: sketchOpen ? 'הסתר ציור על תמונות הסקיצה' : 'פתח ציור על תמונות הסקיצה',
    closePdfPageAnnotationMode,
    togglePdfPageAnnotationMode,
    toggleSketchPreview,
    onStagePointerDownCapture,
    onStagePointerMoveCapture,
    onStagePointerUpCapture,
    onStagePointerCancelCapture,
  };
}
