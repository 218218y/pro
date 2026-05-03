import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import type { OrderPdfDraft, OrderPdfSketchPreviewEntry } from './order_pdf_overlay_contracts.js';
import { revokeOrderPdfSketchPreviewEntries } from './order_pdf_overlay_sketch_preview.js';
import { runOrderPdfSketchPreviewBuildSession } from './order_pdf_overlay_sketch_preview_session.js';
import type { BuildSketchPreview } from './order_pdf_overlay_sketch_preview_controller_types.js';
import type { OrderPdfSketchPreviewViewportStateAdapters } from './order_pdf_overlay_sketch_preview_controller_viewport_state.js';

type UseOrderPdfSketchPreviewRefreshArgs = {
  draft: OrderPdfDraft | null;
  buildSketchPreview: BuildSketchPreview;
  winMaybe: Window | null;
  sketchPreviewSignature: string;
  overlayOpenRef: MutableRefObject<boolean>;
  sketchPreviewLoadIdRef: MutableRefObject<number>;
  sketchPreviewLoadedSignatureRef: MutableRefObject<string>;
  setSketchPreviewBusy: Dispatch<SetStateAction<boolean>>;
  setSketchPreviewError: Dispatch<SetStateAction<string | null>>;
  setSketchPreviewEntries: Dispatch<SetStateAction<OrderPdfSketchPreviewEntry[]>>;
  viewport: OrderPdfSketchPreviewViewportStateAdapters;
};

export function useOrderPdfSketchPreviewRefresh(
  args: UseOrderPdfSketchPreviewRefreshArgs
): () => Promise<void> {
  const {
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
  } = args;

  return useCallback(async () => {
    if (!draft) return;
    const loadId = sketchPreviewLoadIdRef.current + 1;
    sketchPreviewLoadIdRef.current = loadId;
    setSketchPreviewBusy(true);
    setSketchPreviewError(null);

    try {
      const nextEntries = await runOrderPdfSketchPreviewBuildSession({
        readSketchMode: viewport.readSketchModeState,
        restoreSketchMode: viewport.restoreSketchModeState,
        readDoorsOpen: viewport.readDoorsOpenState,
        restoreDoorsOpen: viewport.restoreDoorsOpenState,
        readCameraPose: viewport.readCameraPoseState,
        restoreCameraPose: viewport.restoreCameraPoseState,
        build: buildSketchPreview,
      });
      const stale = sketchPreviewLoadIdRef.current !== loadId || !overlayOpenRef.current;
      if (stale) {
        revokeOrderPdfSketchPreviewEntries(nextEntries, winMaybe);
        return;
      }
      setSketchPreviewEntries(prev => {
        revokeOrderPdfSketchPreviewEntries(prev, winMaybe);
        return nextEntries;
      });
      sketchPreviewLoadedSignatureRef.current = sketchPreviewSignature;
      if (!nextEntries.length) setSketchPreviewError('לא נמצאו כרגע דפי סקיצה זמינים להצגה.');
    } catch {
      if (sketchPreviewLoadIdRef.current !== loadId || !overlayOpenRef.current) return;
      setSketchPreviewError('לא הצלחתי להכין תצוגה של דפי הסקיצה.');
    } finally {
      if (sketchPreviewLoadIdRef.current === loadId) setSketchPreviewBusy(false);
    }
  }, [
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
  ]);
}
