import { useCallback, useMemo, useRef } from 'react';

import type { OrderPdfRichKind } from './order_pdf_overlay_rich_editors.js';
import { asWindowPartialLike, orderPdfOverlayReportNonFatal } from './order_pdf_overlay_runtime.js';
import type { OrderPdfOverlayControllerApis } from './order_pdf_overlay_controller_shared.js';

export function useOrderPdfOverlayRichProgrammatic(
  winMaybe: Window | null
): OrderPdfOverlayControllerApis['richProgrammaticApi'] {
  const richProgrammaticRef = useRef<{ detailsUntil: number; notesUntil: number }>({
    detailsUntil: 0,
    notesUntil: 0,
  });

  const nowMs = useCallback((): number => {
    try {
      const perf = winMaybe?.performance || null;
      if (perf && typeof perf.now === 'function') return Number(perf.now());
    } catch (__wpErr) {
      orderPdfOverlayReportNonFatal('component-runtime:nowMs:perf', __wpErr);
    }
    try {
      const DateCtor = asWindowPartialLike(winMaybe)?.Date || Date;
      if (DateCtor && typeof DateCtor.now === 'function') return Number(DateCtor.now());
    } catch (__wpErr) {
      orderPdfOverlayReportNonFatal('component-runtime:nowMs:date', __wpErr);
    }
    return Date.now();
  }, [winMaybe]);

  const markRichProgrammatic = useCallback(
    (kind: OrderPdfRichKind) => {
      const until = nowMs() + 500;
      if (kind === 'details') richProgrammaticRef.current.detailsUntil = until;
      else richProgrammaticRef.current.notesUntil = until;
    },
    [nowMs]
  );

  const clearRichProgrammatic = useCallback((kind: OrderPdfRichKind) => {
    if (kind === 'details') richProgrammaticRef.current.detailsUntil = 0;
    else richProgrammaticRef.current.notesUntil = 0;
  }, []);

  const isRichProgrammatic = useCallback(
    (kind: OrderPdfRichKind): boolean => {
      const now = nowMs();
      const until =
        kind === 'details'
          ? richProgrammaticRef.current.detailsUntil
          : richProgrammaticRef.current.notesUntil;
      return now <= until;
    },
    [nowMs]
  );

  return useMemo(
    () => ({
      markRichProgrammatic,
      clearRichProgrammatic,
      isRichProgrammatic,
    }),
    [markRichProgrammatic, clearRichProgrammatic, isRichProgrammatic]
  );
}
