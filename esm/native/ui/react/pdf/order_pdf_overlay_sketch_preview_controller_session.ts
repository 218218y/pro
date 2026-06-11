import type { MutableRefObject } from 'react';

import type { CameraPoseLike } from '../../../../../types/build.js';
import type { OrderPdfSketchPreviewSessionSnapshot } from './order_pdf_overlay_sketch_preview_session.js';
import {
  captureOrderPdfSketchPreviewSessionSnapshot,
  restoreOrderPdfSketchPreviewSessionSnapshot,
} from './order_pdf_overlay_sketch_preview_session.js';
import type { OrderPdfSketchPreviewViewportStateAdapters } from './order_pdf_overlay_sketch_preview_controller_viewport_state.js';

export type OrderPdfSketchPreviewControllerSessionSnapshotRef =
  MutableRefObject<OrderPdfSketchPreviewSessionSnapshot<CameraPoseLike> | null>;

export function captureOrderPdfSketchPreviewControllerSessionSnapshot(
  viewport: OrderPdfSketchPreviewViewportStateAdapters
): OrderPdfSketchPreviewSessionSnapshot<CameraPoseLike> {
  return captureOrderPdfSketchPreviewSessionSnapshot<CameraPoseLike>({
    readSketchMode: viewport.readSketchModeState,
    readDoorsOpen: viewport.readDoorsOpenState,
    readCameraPose: viewport.readCameraPoseState,
  });
}

export function restoreOrderPdfSketchPreviewControllerSessionState(
  snapshotRef: OrderPdfSketchPreviewControllerSessionSnapshotRef,
  viewport: OrderPdfSketchPreviewViewportStateAdapters
): void {
  restoreOrderPdfSketchPreviewSessionSnapshot({
    snapshot: snapshotRef.current,
    readSketchMode: viewport.readSketchModeState,
    restoreSketchMode: viewport.restoreSketchModeState,
    readDoorsOpen: viewport.readDoorsOpenState,
    restoreDoorsOpen: viewport.restoreDoorsOpenState,
    restoreCameraPose: viewport.restoreCameraPoseState,
  });
}
