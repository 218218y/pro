import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import { getNodeDocument, getNodeWindow, observeViewportLayout } from '../viewport_layout_runtime.js';
import {
  areOrderPdfDrawingRectSizesEqual,
  areOrderPdfDrawingRectsEqual,
  readOrderPdfDrawingRect,
  type DrawingRect,
} from './order_pdf_overlay_sketch_panel_runtime.js';
import {
  DEFAULT_TOOLBAR_PLACEMENT,
  areOrderPdfSketchFloatingPalettePlacementsEqual,
  areOrderPdfSketchToolbarPlacementsEqual,
  resolveOrderPdfSketchFloatingPalettePlacement,
  resolveOrderPdfSketchToolbarPlacement,
  type SketchFloatingPalettePlacement,
  type SketchToolbarPlacement,
  type SketchToolbarSide,
} from './order_pdf_overlay_sketch_panel_measurement_runtime.js';

export { getNodeDocument, getNodeWindow } from '../viewport_layout_runtime.js';

type ObservedDrawingRectPublishMode = 'size' | 'full';

type ObservedViewportValueArgs<T> = {
  enabled: boolean;
  anchor: Node | null;
  initialValue: T;
  observeScroll?: boolean;
  resizeTargets?: ReadonlyArray<Element | null | undefined>;
  measure: () => T;
  areEqual: (prev: T, next: T) => boolean;
};

function useObservedViewportValue<T>(args: ObservedViewportValueArgs<T>): {
  value: T;
  valueRef: MutableRefObject<T>;
  refreshNow: () => T;
} {
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

function getClosestOrderPdfStage(node: Element | null | undefined): HTMLDivElement | null {
  if (!node || typeof node.closest !== 'function') return null;
  const stage = node.closest('.wp-pdf-editor-stage');
  return stage instanceof HTMLDivElement ? stage : null;
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

export function useOrderPdfSketchFloatingPalettePlacement(args: {
  open: boolean;
  triggerRef: MutableRefObject<HTMLElement | null>;
  paletteRef: MutableRefObject<HTMLDivElement | null>;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
}): SketchFloatingPalettePlacement | null {
  const { open, triggerRef, paletteRef, toolbarRef } = args;
  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    const palette = paletteRef.current;
    const toolbar = toolbarRef.current;
    const win = getNodeWindow(trigger || palette || toolbar);
    if (!trigger || !palette || !win) return null;
    return resolveOrderPdfSketchFloatingPalettePlacement({
      win,
      triggerRect: trigger.getBoundingClientRect(),
      paletteWidth: palette.getBoundingClientRect().width,
      paletteHeight: palette.getBoundingClientRect().height,
    });
  }, [paletteRef, toolbarRef, triggerRef]);
  const { value } = useObservedViewportValue<SketchFloatingPalettePlacement | null>({
    enabled: open,
    anchor: triggerRef.current || paletteRef.current || toolbarRef.current,
    initialValue: null,
    resizeTargets: [triggerRef.current, paletteRef.current, toolbarRef.current],
    measure,
    areEqual: (prev, next) => (!next ? !prev : areOrderPdfSketchFloatingPalettePlacementsEqual(prev, next)),
  });
  return value;
}

export function useOrderPdfSketchToolbarPlacement(args: {
  open: boolean;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
  side?: SketchToolbarSide;
}): SketchToolbarPlacement {
  const { open, toolbarRef, side = 'right' } = args;
  const measure = useCallback(() => {
    const toolbar = toolbarRef.current;
    const win = getNodeWindow(toolbar);
    if (!toolbar || !win) return DEFAULT_TOOLBAR_PLACEMENT;
    return resolveOrderPdfSketchToolbarPlacement({
      win,
      stage: getClosestOrderPdfStage(toolbar),
      toolbarHeight: toolbar.getBoundingClientRect().height,
      side,
    });
  }, [side, toolbarRef]);
  const { value } = useObservedViewportValue<SketchToolbarPlacement>({
    enabled: open,
    anchor: toolbarRef.current,
    initialValue: DEFAULT_TOOLBAR_PLACEMENT,
    resizeTargets: [toolbarRef.current, getClosestOrderPdfStage(toolbarRef.current)],
    measure,
    areEqual: areOrderPdfSketchToolbarPlacementsEqual,
  });
  return value;
}
