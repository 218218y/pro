import { useCallback, useEffect, useRef, useState } from 'react';

import type { CameraPoseLike } from '../../../../../types/build.js';
import type { OrderPdfSketchPreviewEntry } from './order_pdf_overlay_contracts.js';
import type { OrderPdfSketchPreviewSessionSnapshot } from './order_pdf_overlay_sketch_preview_session.js';
import { revokeOrderPdfSketchPreviewEntries } from './order_pdf_overlay_sketch_preview.js';
import { buildOrderPdfSketchImageSelectionSignature } from './order_pdf_overlay_sketch_image_slots_runtime.js';
import type {
  OrderPdfOverlaySketchPreviewController,
  UseOrderPdfOverlaySketchPreviewArgs,
} from './order_pdf_overlay_sketch_preview_controller_types.js';
import { useOrderPdfSketchPreviewRefresh } from './order_pdf_overlay_sketch_preview_controller_refresh.js';
import {
  captureOrderPdfSketchPreviewControllerSessionSnapshot,
  restoreOrderPdfSketchPreviewControllerSessionState,
} from './order_pdf_overlay_sketch_preview_controller_session.js';
import { useOrderPdfSketchPreviewViewportStateAdapters } from './order_pdf_overlay_sketch_preview_controller_viewport_state.js';

export function useOrderPdfOverlaySketchPreview(
  args: UseOrderPdfOverlaySketchPreviewArgs
): OrderPdfOverlaySketchPreviewController {
  const { app, open, draft, pdfSourceTick, docMaybe, winMaybe, buildSketchPreview } = args;
  const [sketchPreviewOpen, setSketchPreviewOpen] = useState<boolean>(false);
  const [sketchPreviewBusy, setSketchPreviewBusy] = useState<boolean>(false);
  const [sketchPreviewError, setSketchPreviewError] = useState<string | null>(null);
  const [sketchPreviewEntries, setSketchPreviewEntries] = useState<OrderPdfSketchPreviewEntry[]>([]);
  const sketchPreviewSignature = buildOrderPdfSketchImageSelectionSignature(draft, pdfSourceTick);
  const sketchPreviewLoadedSignatureRef = useRef<string>('');
  const sketchPreviewLoadIdRef = useRef<number>(0);
  const overlayOpenRef = useRef<boolean>(open);
  const sketchPreviewSessionSnapshotRef = useRef<OrderPdfSketchPreviewSessionSnapshot<CameraPoseLike> | null>(
    null
  );
  const viewport = useOrderPdfSketchPreviewViewportStateAdapters(app, docMaybe);

  useEffect(() => {
    return () => revokeOrderPdfSketchPreviewEntries(sketchPreviewEntries, winMaybe);
  }, [sketchPreviewEntries, winMaybe]);

  useEffect(() => {
    overlayOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!sketchPreviewEntries.length) return;
    if (sketchPreviewLoadedSignatureRef.current === sketchPreviewSignature) return;
    revokeOrderPdfSketchPreviewEntries(sketchPreviewEntries, winMaybe);
    setSketchPreviewEntries([]);
    setSketchPreviewError(null);
  }, [sketchPreviewEntries, sketchPreviewSignature, winMaybe]);

  const restoreSketchPreviewSessionState = useCallback(() => {
    restoreOrderPdfSketchPreviewControllerSessionState(sketchPreviewSessionSnapshotRef, viewport);
  }, [viewport]);

  const refreshSketchPreview = useOrderPdfSketchPreviewRefresh({
    draft,
    buildSketchPreview,
    winMaybe,
    sketchPreviewSignature,
    overlayOpenRef,
    sketchPreviewLoadIdRef,
    sketchPreviewLoadedSignatureRef,
    setSketchPreviewBusy,
    setSketchPreviewError,
    setSketchPreviewEntries,
    viewport,
  });

  const toggleSketchPreview = useCallback(() => {
    setSketchPreviewOpen(prev => {
      const nextOpen = !prev;
      if (nextOpen) {
        if (!sketchPreviewSessionSnapshotRef.current) {
          sketchPreviewSessionSnapshotRef.current =
            captureOrderPdfSketchPreviewControllerSessionSnapshot(viewport);
        }
        if (!sketchPreviewEntries.length && !sketchPreviewBusy) void refreshSketchPreview();
      } else {
        restoreSketchPreviewSessionState();
        sketchPreviewSessionSnapshotRef.current = null;
      }
      return nextOpen;
    });
  }, [
    sketchPreviewEntries.length,
    sketchPreviewBusy,
    refreshSketchPreview,
    viewport,
    restoreSketchPreviewSessionState,
  ]);

  useEffect(() => {
    if (open) return;
    restoreSketchPreviewSessionState();
    sketchPreviewSessionSnapshotRef.current = null;
    sketchPreviewLoadIdRef.current += 1;
    sketchPreviewLoadedSignatureRef.current = '';
    setSketchPreviewOpen(false);
    setSketchPreviewBusy(false);
    setSketchPreviewError(null);
    setSketchPreviewEntries(prev => {
      if (!prev.length) return prev;
      revokeOrderPdfSketchPreviewEntries(prev, winMaybe);
      return [];
    });
  }, [open, winMaybe, restoreSketchPreviewSessionState]);

  return {
    sketchPreviewOpen,
    sketchPreviewBusy,
    sketchPreviewError,
    sketchPreviewEntries,
    toggleSketchPreview,
    refreshSketchPreview,
  };
}
