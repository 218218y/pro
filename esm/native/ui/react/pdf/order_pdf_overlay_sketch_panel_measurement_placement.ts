import { useCallback } from 'react';
import type { MutableRefObject } from 'react';

import { getNodeWindow } from '../viewport_layout_runtime.js';
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
import { useObservedViewportValue } from './order_pdf_overlay_sketch_panel_measurement_observed_value.js';

function getClosestOrderPdfStage(node: Element | null | undefined): HTMLDivElement | null {
  if (!node || typeof node.closest !== 'function') return null;
  const stage = node.closest('.wp-pdf-editor-stage');
  return stage instanceof HTMLDivElement ? stage : null;
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
