import { useCallback } from 'react';

import type { AppContainer } from '../../../../../types/app.js';
import type { CameraPoseLike } from '../../../../../types/build.js';
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

export type OrderPdfSketchPreviewViewportStateAdapters = {
  readSketchModeState: () => boolean;
  restoreSketchModeState: (next: boolean) => void;
  readDoorsOpenState: () => boolean;
  restoreDoorsOpenState: (next: boolean) => void;
  readCameraPoseState: () => CameraPoseLike | null;
  restoreCameraPoseState: (pose: CameraPoseLike) => void;
};

export function useOrderPdfSketchPreviewViewportStateAdapters(
  app: AppContainer,
  docMaybe: Document | null
): OrderPdfSketchPreviewViewportStateAdapters {
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

  return {
    readSketchModeState,
    restoreSketchModeState,
    readDoorsOpenState,
    restoreDoorsOpenState,
    readCameraPoseState,
    restoreCameraPoseState,
  };
}
