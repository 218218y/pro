import { useCallback, useRef } from 'react';
import type { ChangeEvent, Dispatch, DragEvent, MutableRefObject, PointerEvent, SetStateAction } from 'react';

import type { InteractionApi, RuntimeApi, UiFeedbackLike } from './order_pdf_overlay_controller_shared.js';

export function useOrderPdfOverlayInteractionHandlers(args: {
  interactionApi: Pick<
    InteractionApi,
    | 'captureStagePointerDown'
    | 'captureStagePointerMove'
    | 'createInitialStageGesture'
    | 'finishStagePointerUp'
    | 'loadPdfFileFromDrop'
    | 'loadPdfFileFromInput'
    | 'preventStageDragEvent'
    | 'resetStageGesture'
  >;
  runtimeApi: Pick<RuntimeApi, 'orderPdfOverlayReportNonFatal'>;
  fb: UiFeedbackLike;
  loadPdfIntoEditor: (file: File) => Promise<unknown>;
  close: () => void;
  dragOver: boolean;
  setDragOver: Dispatch<SetStateAction<boolean>>;
  pdfFileInputRef: MutableRefObject<HTMLInputElement | null>;
}) {
  const { interactionApi, runtimeApi, fb, loadPdfIntoEditor, close, dragOver, setDragOver, pdfFileInputRef } =
    args;
  const {
    captureStagePointerDown,
    captureStagePointerMove,
    createInitialStageGesture,
    finishStagePointerUp,
    loadPdfFileFromDrop,
    loadPdfFileFromInput,
    preventStageDragEvent,
    resetStageGesture,
  } = interactionApi;
  const { orderPdfOverlayReportNonFatal } = runtimeApi;
  const stageGestureRef = useRef(createInitialStageGesture());

  const onLoadPdfClick = useCallback(() => {
    try {
      const el = pdfFileInputRef.current;
      if (el && typeof el.click === 'function') el.click();
    } catch (__wpErr) {
      orderPdfOverlayReportNonFatal('orderPdfLoad:click', __wpErr);
    }
  }, [pdfFileInputRef, orderPdfOverlayReportNonFatal]);

  const onPdfFileSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      try {
        await loadPdfFileFromInput({ event, fb, loadPdfIntoEditor });
      } catch (__wpErr) {
        orderPdfOverlayReportNonFatal('orderPdfLoad:input', __wpErr);
      }
    },
    [loadPdfFileFromInput, fb, loadPdfIntoEditor, orderPdfOverlayReportNonFatal]
  );

  const onStagePointerDownCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      try {
        captureStagePointerDown(stageGestureRef.current, event);
      } catch (__wpErr) {
        orderPdfOverlayReportNonFatal('orderPdfStage:pointerDown', __wpErr);
      }
    },
    [captureStagePointerDown, orderPdfOverlayReportNonFatal]
  );

  const onStagePointerMoveCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      try {
        captureStagePointerMove(stageGestureRef.current, event);
      } catch (__wpErr) {
        orderPdfOverlayReportNonFatal('orderPdfStage:pointerMove', __wpErr);
      }
    },
    [captureStagePointerMove, orderPdfOverlayReportNonFatal]
  );

  const onStagePointerUpCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      try {
        if (finishStagePointerUp(stageGestureRef.current, event)) close();
      } catch (__wpErr) {
        orderPdfOverlayReportNonFatal('orderPdfStage:pointerUp', __wpErr);
      }
    },
    [finishStagePointerUp, close, orderPdfOverlayReportNonFatal]
  );

  const onStagePointerCancelCapture = useCallback(() => {
    try {
      resetStageGesture(stageGestureRef.current);
    } catch (__wpErr) {
      orderPdfOverlayReportNonFatal('orderPdfStage:pointerCancel', __wpErr);
    }
  }, [resetStageGesture, orderPdfOverlayReportNonFatal]);

  const onStageDragOver = useCallback(
    (event: DragEvent) => {
      try {
        preventStageDragEvent(event);
      } catch (__wpErr) {
        orderPdfOverlayReportNonFatal('orderPdfStage:dragOver', __wpErr);
      }
      if (!dragOver) setDragOver(true);
    },
    [preventStageDragEvent, orderPdfOverlayReportNonFatal, dragOver, setDragOver]
  );

  const onStageDragLeave = useCallback(
    (event: DragEvent) => {
      try {
        preventStageDragEvent(event);
      } catch (__wpErr) {
        orderPdfOverlayReportNonFatal('orderPdfStage:dragLeave', __wpErr);
      }
      setDragOver(false);
    },
    [preventStageDragEvent, orderPdfOverlayReportNonFatal, setDragOver]
  );

  const onStageDrop = useCallback(
    async (event: DragEvent) => {
      try {
        preventStageDragEvent(event);
      } catch (__wpErr) {
        orderPdfOverlayReportNonFatal('orderPdfStage:dropPrevent', __wpErr);
      }
      setDragOver(false);
      try {
        await loadPdfFileFromDrop({ event, fb, loadPdfIntoEditor });
      } catch (__wpErr) {
        orderPdfOverlayReportNonFatal('orderPdfStage:dropLoad', __wpErr);
      }
    },
    [
      preventStageDragEvent,
      loadPdfFileFromDrop,
      orderPdfOverlayReportNonFatal,
      setDragOver,
      fb,
      loadPdfIntoEditor,
    ]
  );

  return {
    onLoadPdfClick,
    onPdfFileSelected,
    onStagePointerDownCapture,
    onStagePointerMoveCapture,
    onStagePointerUpCapture,
    onStagePointerCancelCapture,
    onStageDragOver,
    onStageDragLeave,
    onStageDrop,
  };
}
