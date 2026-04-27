import { useCallback, useEffect, useRef, useState } from 'react';

import type { AppContainer } from '../../../../../types/app.js';
import type { CameraPoseLike } from '../../../../../types/build.js';

import type { OrderPdfDraft, OrderPdfSketchPreviewEntry } from './order_pdf_overlay_contracts.js';
import type { OrderPdfSketchPreviewSessionSnapshot } from './order_pdf_overlay_sketch_preview_session.js';
import { revokeOrderPdfSketchPreviewEntries } from './order_pdf_overlay_sketch_preview.js';
import { buildOrderPdfSketchImageSelectionSignature } from './order_pdf_overlay_sketch_image_slots_runtime.js';
import {
  captureOrderPdfSketchPreviewSessionSnapshot,
  restoreOrderPdfSketchPreviewSessionSnapshot,
  runOrderPdfSketchPreviewBuildSession,
} from './order_pdf_overlay_sketch_preview_session.js';
import {
  applyViewportSketchMode,
  getDoorsOpen,
  getDoorsOpenViaService,
  readRuntimeScalarOrDefaultFromApp,
  restoreViewportCameraPose,
  setDoorsOpen,
  setDoorsOpenViaService,
  snapshotViewportCameraPose,
} from '../../../services/api.js';

type BuildSketchPreview = () => Promise<OrderPdfSketchPreviewEntry[]>;

type UseOrderPdfOverlaySketchPreviewArgs = {
  app: AppContainer;
  open: boolean;
  draft: OrderPdfDraft | null;
  pdfSourceTick: number;
  docMaybe: Document | null;
  winMaybe: Window | null;
  buildSketchPreview: BuildSketchPreview;
};

type OrderPdfOverlaySketchPreviewController = {
  sketchPreviewOpen: boolean;
  sketchPreviewBusy: boolean;
  sketchPreviewError: string | null;
  sketchPreviewEntries: OrderPdfSketchPreviewEntry[];
  toggleSketchPreview: () => void;
  refreshSketchPreview: () => Promise<void>;
};

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

  const readSketchModeState = useCallback(() => {
    return !!readRuntimeScalarOrDefaultFromApp(app, 'sketchMode', false);
  }, [app]);

  const readDoorsOpenState = useCallback(() => {
    const viaService = getDoorsOpenViaService(app);
    if (typeof viaService === 'boolean') return viaService;
    return !!getDoorsOpen(app);
  }, [app]);

  const restoreSketchModeState = useCallback(
    (next: boolean) => {
      applyViewportSketchMode(app, next, {
        source: 'order-pdf:sketch-preview',
        rebuild: true,
        updateShadows: false,
        reason: 'orderPdfOverlay:sketchPreviewRestore',
      });
    },
    [app]
  );

  const restoreDoorsOpenState = useCallback(
    (next: boolean) => {
      if (
        !setDoorsOpenViaService(app, next, {
          touch: false,
          forceUpdate: true,
          source: 'order-pdf:sketch-preview',
        })
      ) {
        setDoorsOpen(app, next, { touch: false, forceUpdate: true, source: 'order-pdf:sketch-preview' });
      }
      const body = docMaybe?.body;
      if (!body) return;
      body.setAttribute('data-door-status', next ? 'open' : 'closed');
      void body.offsetHeight;
    },
    [app, docMaybe]
  );

  const readCameraPoseState = useCallback((): CameraPoseLike | null => {
    return snapshotViewportCameraPose(app);
  }, [app]);

  const restoreCameraPoseState = useCallback(
    (pose: CameraPoseLike) => {
      restoreViewportCameraPose(app, pose);
    },
    [app]
  );

  const restoreSketchPreviewSessionState = useCallback(() => {
    restoreOrderPdfSketchPreviewSessionSnapshot({
      snapshot: sketchPreviewSessionSnapshotRef.current,
      readSketchMode: readSketchModeState,
      restoreSketchMode: restoreSketchModeState,
      readDoorsOpen: readDoorsOpenState,
      restoreDoorsOpen: restoreDoorsOpenState,
      restoreCameraPose: restoreCameraPoseState,
    });
  }, [
    readSketchModeState,
    restoreSketchModeState,
    readDoorsOpenState,
    restoreDoorsOpenState,
    restoreCameraPoseState,
  ]);

  const refreshSketchPreview = useCallback(async () => {
    if (!draft) return;
    const loadId = sketchPreviewLoadIdRef.current + 1;
    sketchPreviewLoadIdRef.current = loadId;
    setSketchPreviewBusy(true);
    setSketchPreviewError(null);

    try {
      const nextEntries = await runOrderPdfSketchPreviewBuildSession({
        readSketchMode: readSketchModeState,
        restoreSketchMode: restoreSketchModeState,
        readDoorsOpen: readDoorsOpenState,
        restoreDoorsOpen: restoreDoorsOpenState,
        readCameraPose: readCameraPoseState,
        restoreCameraPose: restoreCameraPoseState,
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
    readSketchModeState,
    restoreSketchModeState,
    readDoorsOpenState,
    restoreDoorsOpenState,
    readCameraPoseState,
    restoreCameraPoseState,
  ]);

  const toggleSketchPreview = useCallback(() => {
    setSketchPreviewOpen(prev => {
      const nextOpen = !prev;
      if (nextOpen) {
        if (!sketchPreviewSessionSnapshotRef.current) {
          sketchPreviewSessionSnapshotRef.current =
            captureOrderPdfSketchPreviewSessionSnapshot<CameraPoseLike>({
              readSketchMode: readSketchModeState,
              readDoorsOpen: readDoorsOpenState,
              readCameraPose: readCameraPoseState,
            });
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
    readSketchModeState,
    readDoorsOpenState,
    readCameraPoseState,
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
