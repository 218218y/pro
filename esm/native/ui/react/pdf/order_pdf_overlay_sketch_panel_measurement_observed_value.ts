import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { getNodeDocument, getNodeWindow, observeViewportLayout } from '../viewport_layout_runtime.js';
import type {
  ObservedViewportValueArgs,
  ObservedViewportValueResult,
} from './order_pdf_overlay_sketch_panel_measurement_hooks_types.js';

export function useObservedViewportValue<T>(
  args: ObservedViewportValueArgs<T>
): ObservedViewportValueResult<T> {
  const {
    enabled,
    anchor,
    initialValue,
    observeScroll = false,
    resizeTargets = [],
    measure,
    areEqual,
  } = args;
  const [value, setValue] = useState<T>(initialValue);
  const valueRef = useRef<T>(initialValue);
  const generationRef = useRef(0);

  const commitValue = useCallback(
    (next: T) => {
      valueRef.current = next;
      setValue(prev => (areEqual(prev, next) ? prev : next));
      return next;
    },
    [areEqual]
  );

  const refreshNow = useCallback(() => commitValue(measure()), [commitValue, measure]);

  useLayoutEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    if (!enabled) {
      commitValue(initialValue);
      return () => {
        generationRef.current += 1;
      };
    }
    const doc = getNodeDocument(anchor);
    const win = getNodeWindow(anchor);
    if (!doc || !win) {
      commitValue(initialValue);
      return () => {
        generationRef.current += 1;
      };
    }

    const refreshIfCurrent = () => {
      if (generationRef.current !== generation) return;
      refreshNow();
    };

    const stopObserving = observeViewportLayout({
      doc,
      win,
      onUpdate: refreshIfCurrent,
      observeScroll,
      resizeTargets,
    });

    return () => {
      generationRef.current += 1;
      stopObserving();
    };
  }, [anchor, commitValue, enabled, initialValue, observeScroll, refreshNow, resizeTargets]);

  return { value, valueRef, refreshNow };
}
