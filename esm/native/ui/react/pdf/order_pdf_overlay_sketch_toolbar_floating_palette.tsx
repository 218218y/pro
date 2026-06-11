import type { ReactElement } from 'react';

import { createPortal } from 'react-dom';

import { getNodeDocument } from '../viewport_layout_runtime.js';
import { useOrderPdfSketchFloatingPalettePlacement } from './order_pdf_overlay_sketch_panel_measurement_hooks.js';
import type { OrderPdfSketchFloatingPaletteProps } from './order_pdf_overlay_sketch_toolbar_types.js';

export function OrderPdfSketchFloatingPalette(
  props: OrderPdfSketchFloatingPaletteProps
): ReactElement | null {
  const { open, triggerRef, paletteRef, toolbarRef, paletteClassName, children } = props;
  const placement = useOrderPdfSketchFloatingPalettePlacement({
    open,
    triggerRef,
    paletteRef,
    toolbarRef,
  });
  const doc = getNodeDocument(triggerRef.current || toolbarRef.current);
  const body = doc?.body ?? null;
  if (!open || !body) return null;

  return createPortal(
    <div
      ref={paletteRef}
      className={paletteClassName}
      style={
        placement
          ? {
              position: 'fixed',
              top: `${placement.top}px`,
              left: `${placement.left}px`,
              maxHeight: `${placement.maxHeight}px`,
            }
          : { position: 'fixed', visibility: 'hidden', insetInlineStart: '-9999px', top: '0' }
      }
    >
      {children}
    </div>,
    body
  );
}
