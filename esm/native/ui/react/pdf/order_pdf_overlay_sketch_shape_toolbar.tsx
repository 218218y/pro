import { memo } from 'react';
import type { MutableRefObject, ReactElement } from 'react';

import type { OrderPdfSketchStrokeTool, OrderPdfSketchTool } from './order_pdf_overlay_contracts.js';
import type { SketchToolbarPlacement } from './order_pdf_overlay_sketch_panel_measurement_runtime.js';

type OrderPdfSketchShapeToolbarProps = {
  tool: OrderPdfSketchTool;
  toolbarPlacement: SketchToolbarPlacement;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
  onSetTool: (tool: OrderPdfSketchTool) => void;
};

type ShapeToolDefinition = {
  tool: Extract<OrderPdfSketchStrokeTool, 'line' | 'square' | 'circle' | 'ellipse'>;
  label: string;
  iconClassName?: string;
  iconKind?: 'fontawesome' | 'shape';
  shapeClassName?: string;
};

const SHAPE_TOOLS: readonly ShapeToolDefinition[] = [
  { tool: 'line', label: 'קו ישר', iconClassName: 'fas fa-minus' },
  { tool: 'square', label: 'ריבוע', iconClassName: 'far fa-square' },
  { tool: 'circle', label: 'עיגול', iconClassName: 'far fa-circle' },
  {
    tool: 'ellipse',
    label: 'אליפסה',
    iconKind: 'shape',
    shapeClassName: 'wp-pdf-sketch-shape-icon--ellipse',
  },
];

export const OrderPdfSketchShapeToolbar = memo(function OrderPdfSketchShapeToolbar(
  props: OrderPdfSketchShapeToolbarProps
): ReactElement {
  const { tool, toolbarPlacement, toolbarRef, onSetTool } = props;

  return (
    <aside className="wp-pdf-sketch-toolbar-rail wp-pdf-sketch-toolbar-rail--left" dir="rtl">
      <div
        className={`wp-pdf-sketch-toolbar wp-pdf-sketch-toolbar--floating wp-pdf-sketch-toolbar--shape${toolbarPlacement.mode === 'fixed' ? ' is-fixed' : ''}`}
        dir="rtl"
        ref={toolbarRef}
        style={
          toolbarPlacement.mode === 'fixed'
            ? {
                top: `${toolbarPlacement.top}px`,
                left: `${toolbarPlacement.left}px`,
                maxHeight: `${toolbarPlacement.maxHeight}px`,
              }
            : undefined
        }
      >
        <div className="wp-pdf-sketch-toolbar-stack">
          <button
            type="button"
            className={`toolbar-btn toolbar-btn--square wp-pdf-sketch-tool-btn wp-pdf-sketch-tool-btn--shape${tool === 'text' ? ' active-state' : ''}`}
            onClick={() => onSetTool('text')}
            title="טקסט"
            aria-label="טקסט"
            aria-pressed={tool === 'text'}
          >
            <i className="fas fa-font" />
          </button>

          {SHAPE_TOOLS.map(shape => {
            const active = tool === shape.tool;
            return (
              <button
                key={shape.tool}
                type="button"
                className={`toolbar-btn toolbar-btn--square wp-pdf-sketch-tool-btn wp-pdf-sketch-tool-btn--shape${active ? ' active-state' : ''}`}
                onClick={() => onSetTool(shape.tool)}
                title={shape.label}
                aria-label={shape.label}
                aria-pressed={active}
              >
                {shape.iconKind === 'shape' ? (
                  <span
                    className={`wp-pdf-sketch-shape-icon ${shape.shapeClassName || ''}`}
                    aria-hidden="true"
                  />
                ) : (
                  <i className={shape.iconClassName} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
});
