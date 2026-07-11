import type {
  ChangeEvent,
  InputHTMLAttributes,
  MutableRefObject,
  PointerEventHandler,
  ReactElement,
} from 'react';

import type { OrderPdfEditableScalarField } from './order_pdf_overlay_draft_state.js';
import type {
  OrderPdfOverlayAnnotationActions,
  OrderPdfOverlayEditorRefs,
  OrderPdfOverlayEditorStageModel,
  OrderPdfOverlaySketchModel,
} from './order_pdf_overlay_editor_surface_contracts.js';
import type { OrderPdfOverlayLayout } from './order_pdf_overlay_layout.js';
import { OrderPdfOverlayPdfPageAnnotationLayer } from './order_pdf_overlay_pdf_page_annotation_layer.js';
import { OrderPdfOverlaySketchPanel } from './order_pdf_overlay_sketch_panel.js';

type OrderPdfInputDescriptor = {
  key: OrderPdfEditableScalarField;
  className: string;
  styleKey: keyof OrderPdfOverlayLayout['fieldStyles'];
  dir: 'rtl' | 'ltr';
  ariaLabel: string;
  title: string;
  placeholder?: string;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete'];
};

const ORDER_PDF_INPUTS: readonly OrderPdfInputDescriptor[] = [
  {
    key: 'orderNumber',
    className: 'wp-pdf-editor-input wp-pdf-editor-input--small',
    styleKey: 'orderNumber',
    dir: 'rtl',
    ariaLabel: 'מספר הזמנה',
    title: 'מספר הזמנה',
    placeholder: 'מספר',
  },
  {
    key: 'orderDate',
    className: 'wp-pdf-editor-input wp-pdf-editor-input--small',
    styleKey: 'orderDate',
    dir: 'ltr',
    ariaLabel: 'תאריך הזמנה',
    title: 'תאריך הזמנה',
    placeholder: 'תאריך',
  },
  {
    key: 'projectName',
    className: 'wp-pdf-editor-input',
    styleKey: 'projectName',
    dir: 'rtl',
    ariaLabel: 'שם הפרויקט',
    title: 'שם הפרויקט',
  },
  {
    key: 'deliveryAddress',
    className: 'wp-pdf-editor-input',
    styleKey: 'deliveryAddress',
    dir: 'rtl',
    ariaLabel: 'כתובת מלאה לאספקה',
    title: 'כתובת מלאה לאספקה',
    placeholder: 'כתובת מלאה לאספקה',
  },
  {
    key: 'phone',
    className: 'wp-pdf-editor-input wp-pdf-editor-input--small',
    styleKey: 'phone',
    dir: 'rtl',
    ariaLabel: 'טלפון',
    title: 'טלפון',
    placeholder: 'טלפון',
    type: 'tel',
    inputMode: 'tel',
    autoComplete: 'tel',
  },
  {
    key: 'mobile',
    className: 'wp-pdf-editor-input wp-pdf-editor-input--small',
    styleKey: 'mobile',
    dir: 'rtl',
    ariaLabel: 'נייד',
    title: 'נייד',
    placeholder: 'נייד',
    type: 'tel',
    inputMode: 'tel',
    autoComplete: 'tel',
  },
];

export function OrderPdfOverlayEditorStage(props: {
  refs: OrderPdfOverlayEditorRefs;
  stage: OrderPdfOverlayEditorStageModel;
  sketch: OrderPdfOverlaySketchModel;
  annotations: OrderPdfOverlayAnnotationActions;
  pdfPageAnnotationOpen: boolean;
  editorStageRef: MutableRefObject<HTMLDivElement | null>;
  sketchPreviewPanelRef: MutableRefObject<HTMLElement | null>;
  onStagePointerDownCapture: PointerEventHandler<HTMLDivElement>;
  onStagePointerMoveCapture: PointerEventHandler<HTMLDivElement>;
  onStagePointerUpCapture: PointerEventHandler<HTMLDivElement>;
  onStagePointerCancelCapture: PointerEventHandler<HTMLDivElement>;
}): ReactElement {
  const {
    refs,
    stage,
    sketch,
    annotations,
    pdfPageAnnotationOpen,
    editorStageRef,
    sketchPreviewPanelRef,
    onStagePointerDownCapture,
    onStagePointerMoveCapture,
    onStagePointerUpCapture,
    onStagePointerCancelCapture,
  } = props;
  const { layout, draft } = stage;

  return (
    <div
      ref={editorStageRef}
      className={`wp-pdf-editor-stage${stage.dragOver ? ' is-drop' : ''}`}
      dir="ltr"
      onPointerDownCapture={onStagePointerDownCapture}
      onPointerMoveCapture={onStagePointerMoveCapture}
      onPointerUpCapture={onStagePointerUpCapture}
      onPointerCancelCapture={onStagePointerCancelCapture}
      onDragOver={stage.onDragOver}
      onDragLeave={stage.onDragLeave}
      onDrop={stage.onDrop}
    >
      <div className="wp-pdf-editor-page-wrap">
        <div className="wp-pdf-editor-page" ref={refs.containerRef} style={layout.pageStyle}>
          <canvas ref={refs.canvasRef} className="wp-pdf-editor-canvas" />

          {ORDER_PDF_INPUTS.map(input => (
            <input
              key={input.key}
              id={`wp-pdf-editor-${input.key}`}
              className={input.className}
              style={layout.fieldStyles[input.styleKey]}
              dir={input.dir}
              ref={input.key === 'orderNumber' ? refs.orderNoInputRef : undefined}
              name={input.key}
              aria-label={input.ariaLabel}
              title={input.title}
              type={input.type}
              inputMode={input.inputMode}
              autoComplete={input.autoComplete}
              value={draft ? draft[input.key] : ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                stage.onScalarFieldChange(input.key, event.target.value ?? '');
              }}
              placeholder={input.placeholder}
            />
          ))}

          <div className="wp-pdf-editor-richbox" style={layout.fieldStyles.details} dir="rtl">
            <div
              className="wp-pdf-editor-rich-editor"
              ref={refs.detailsRichRef}
              tabIndex={0}
              role="textbox"
              aria-multiline="true"
              aria-label="פרוט הזמנה"
              title="פרוט הזמנה"
              contentEditable
              suppressContentEditableWarning
              dir="rtl"
              data-placeholder="פרוט הזמנה"
              {...stage.detailsEditorHandlers}
            />
          </div>

          <div
            className="wp-pdf-editor-rich-editor wp-pdf-editor-rich-editor--notes"
            style={layout.fieldStyles.notes}
            ref={refs.notesRichRef}
            tabIndex={0}
            role="textbox"
            aria-multiline="true"
            aria-label="הערות"
            title="הערות"
            contentEditable
            suppressContentEditableWarning
            dir="rtl"
            data-placeholder="הערות"
            {...stage.notesEditorHandlers}
          />

          <OrderPdfOverlayPdfPageAnnotationLayer
            open={pdfPageAnnotationOpen}
            layout={layout}
            draft={draft}
            pageRef={refs.containerRef}
            onAppendStroke={annotations.onAppendStroke}
            onUpsertTextBox={annotations.onUpsertTextBox}
            onDeleteTextBox={annotations.onDeleteTextBox}
            onUndo={annotations.onUndo}
            onRedo={annotations.onRedo}
            onClear={annotations.onClear}
          />

          <div
            className="wp-pdf-editor-size-anchor"
            style={{ width: layout.size.w * layout.cssScale, height: layout.size.h * layout.cssScale }}
            aria-hidden="true"
          />
        </div>
      </div>

      <OrderPdfOverlaySketchPanel
        panelRef={sketchPreviewPanelRef}
        open={sketch.open}
        busy={sketch.busy}
        error={sketch.error}
        entries={sketch.entries}
        draft={draft}
        onRefresh={sketch.onRefresh}
        onAppendStroke={annotations.onAppendStroke}
        onUpsertTextBox={annotations.onUpsertTextBox}
        onDeleteTextBox={annotations.onDeleteTextBox}
        onUndo={annotations.onUndo}
        onRedo={annotations.onRedo}
        onClear={annotations.onClear}
      />
    </div>
  );
}
