import { useCallback } from 'react';
import type { MutableRefObject } from 'react';

import {
  areOrderPdfDrawingRectSizesEqual,
  areOrderPdfDrawingRectsEqual,
  readOrderPdfDrawingRect,
  type DrawingRect,
} from './order_pdf_overlay_sketch_panel_runtime.js';
import { useObservedViewportValue } from './order_pdf_overlay_sketch_panel_measurement_observed_value.js';
import type { ObservedDrawingRectPublishMode } from './order_pdf_overlay_sketch_panel_measurement_hooks_types.js';

function areObservedOrderPdfDrawingRectsEqual(args: {
  prev: DrawingRect | null;
  next: DrawingRect | null;
  publish: ObservedDrawingRectPublishMode;
}): boolean {
  const { prev, next, publish } = args;
  return publish === 'full'
    ? areOrderPdfDrawingRectsEqual(prev, next)
    : areOrderPdfDrawingRectSizesEqual(prev, next);
}

export function useObservedOrderPdfDrawingRect<T extends Element>(args: {
  elementRef: MutableRefObject<T | null>;
  enabled?: boolean;
  observeScroll?: boolean;
  publish?: ObservedDrawingRectPublishMode;
}): {
  rect: DrawingRect | null;
  rectRef: MutableRefObject<DrawingRect | null>;
  refreshRectNow: () => DrawingRect | null;
} {
  const { elementRef, enabled = true, observeScroll = false, publish = 'full' } = args;
  const measure = useCallback(() => readOrderPdfDrawingRect(elementRef.current), [elementRef]);
  const areEqual = useCallback(
    (prev: DrawingRect | null, next: DrawingRect | null) =>
      areObservedOrderPdfDrawingRectsEqual({ prev, next, publish }),
    [publish]
  );
  const { value, valueRef, refreshNow } = useObservedViewportValue<DrawingRect | null>({
    enabled,
    anchor: elementRef.current,
    initialValue: null,
    observeScroll,
    resizeTargets: [elementRef.current],
    measure,
    areEqual,
  });

  return {
    rect: value,
    rectRef: valueRef,
    refreshRectNow: refreshNow,
  };
}
