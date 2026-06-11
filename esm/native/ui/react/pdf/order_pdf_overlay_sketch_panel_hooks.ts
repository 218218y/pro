import { useEffect } from 'react';
import type { MutableRefObject } from 'react';

import { getNodeDocument } from '../viewport_layout_runtime.js';
import { installDomEventListener } from '../effects/dom_event_cleanup.js';

export { getNodeDocument, getNodeWindow } from '../viewport_layout_runtime.js';
export { useCanvasRedraw } from './order_pdf_overlay_sketch_panel_canvas_hooks.js';
export {
  nextOrderPdfSketchCanvasFrameVersion,
  paintOrderPdfSketchCanvasFrame,
  resolveOrderPdfSketchCanvasDrawState,
  resolveOrderPdfSketchCanvasPixels,
  resolveOrderPdfSketchCanvasRect,
  shouldRepaintOrderPdfSketchCanvas,
  shouldRunOrderPdfSketchCanvasFrame,
  syncOrderPdfSketchCanvasElementSize,
  type OrderPdfSketchCanvasDrawState,
} from './order_pdf_overlay_sketch_panel_canvas_runtime.js';
export {
  useOrderPdfSketchHistoryShortcuts,
  useOrderPdfSketchRedoState,
} from './order_pdf_overlay_sketch_panel_history_hooks.js';
export {
  clearOrderPdfSketchRedoStateSnapshotKey,
  clearOrderPdfSketchRedoStateSnapshotPage,
  closeOrderPdfSketchRedoStateSnapshot,
  createOrderPdfSketchRedoStateSnapshot,
  noteOrderPdfSketchRedoStateSnapshotAppend,
  noteOrderPdfSketchRedoStateSnapshotUndo,
  resolveOrderPdfSketchHistoryShortcutAction,
  syncOrderPdfSketchRedoStateSnapshot,
  takeOrderPdfSketchRedoStateSnapshotStroke,
  type OrderPdfSketchRedoStateSnapshot,
} from './order_pdf_overlay_sketch_panel_history_runtime.js';
export {
  useObservedOrderPdfDrawingRect,
  useOrderPdfSketchFloatingPalettePlacement,
  useOrderPdfSketchToolbarPlacement,
} from './order_pdf_overlay_sketch_panel_measurement_hooks.js';
export {
  areOrderPdfSketchFloatingPalettePlacementsEqual,
  areOrderPdfSketchToolbarPlacementsEqual,
  resolveOrderPdfSketchFloatingPalettePlacement,
  resolveOrderPdfSketchToolbarPlacement,
  type SketchFloatingPalettePlacement,
  type SketchToolbarPlacement,
  type SketchToolbarSide,
} from './order_pdf_overlay_sketch_panel_measurement_runtime.js';

function isNodeInsideObservedElements(
  target: Node | null,
  elements: ReadonlyArray<Element | null | undefined>
): boolean {
  return (
    !!target &&
    elements.some(element => !!element && typeof element.contains === 'function' && element.contains(target))
  );
}

export function useOrderPdfSketchPaletteDismiss(args: {
  open: boolean;
  active: boolean;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
  paletteRefs: ReadonlyArray<MutableRefObject<HTMLDivElement | null>>;
  onDismiss: () => void;
}): void {
  const { open, active, toolbarRef, paletteRefs, onDismiss } = args;

  useEffect(() => {
    if (!open || !active) return;
    const doc = getNodeDocument(toolbarRef.current || paletteRefs[0]?.current || null);
    if (!doc) return;
    const onDocPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        isNodeInsideObservedElements(target, [toolbarRef.current, ...paletteRefs.map(ref => ref.current)])
      ) {
        return;
      }
      onDismiss();
    };
    return installDomEventListener({
      target: doc,
      type: 'pointerdown',
      listener: onDocPointerDown as EventListener,
      options: true,
      label: 'orderPdfSketchPaletteDismiss',
    });
  }, [active, onDismiss, open, paletteRefs, toolbarRef]);
}
