import type {
  DragEventHandler,
  InputHTMLAttributes,
  MutableRefObject,
  PointerEventHandler,
  ReactElement,
  ReactNode,
} from 'react';

import type { OrderPdfEditableScalarField } from './order_pdf_overlay_draft_state.js';
import type {
  InlineDetailsConfirmState,
  OrderPdfDraft,
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPreviewEntry,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';
import type { OrderPdfOverlayLayout } from './order_pdf_overlay_layout.js';
import type {
  OrderPdfDetailsEditorHandlers,
  OrderPdfNotesEditorHandlers,
} from './order_pdf_overlay_rich_editors.js';
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

export type OrderPdfOverlayEditorSurfaceProps = {
  toolbar: ReactNode;
  dragOver: boolean;
  layout: OrderPdfOverlayLayout;
  draft: OrderPdfDraft | null;
  overlayRef: MutableRefObject<HTMLDivElement | null>;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  detailsRichRef: MutableRefObject<HTMLDivElement | null>;
  notesRichRef: MutableRefObject<HTMLDivElement | null>;
  orderNoInputRef: MutableRefObject<HTMLInputElement | null>;
  detailsEditorHandlers: OrderPdfDetailsEditorHandlers;
  notesEditorHandlers: OrderPdfNotesEditorHandlers;
  onScalarFieldChange: (key: OrderPdfEditableScalarField, value: string) => void;
  onStagePointerDownCapture: PointerEventHandler<HTMLDivElement>;
  onStagePointerMoveCapture: PointerEventHandler<HTMLDivElement>;
  onStagePointerUpCapture: PointerEventHandler<HTMLDivElement>;
  onStagePointerCancelCapture: PointerEventHandler<HTMLDivElement>;
  onStageDragOver: DragEventHandler<HTMLDivElement>;
  onStageDragLeave: DragEventHandler<HTMLDivElement>;
  onStageDrop: DragEventHandler<HTMLDivElement>;
  inlineConfirm: InlineDetailsConfirmState | null;
  onConfirmInlineOk: () => void;
  onConfirmInlineCancel: () => void;
  sketchPreviewOpen: boolean;
  sketchPreviewBusy: boolean;
  sketchPreviewError: string | null;
  sketchPreviewEntries: OrderPdfSketchPreviewEntry[];
  onToggleSketchPreview: () => void;
  onRefreshSketchPreview: () => void;
  onAppendSketchStroke: (key: OrderPdfSketchAnnotationPageKey, stroke: OrderPdfSketchStroke) => void;
  onUpsertSketchTextBox: (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => void;
  onDeleteSketchTextBox: (key: OrderPdfSketchAnnotationPageKey, id: string) => void;
  onUndoSketchStroke: (key: OrderPdfSketchAnnotationPageKey) => void;
  onRedoSketchAnnotation: (
    key: OrderPdfSketchAnnotationPageKey,
    annotation: OrderPdfSketchStroke | OrderPdfSketchTextBox
  ) => void;
  onClearSketchStrokes: (key: OrderPdfSketchAnnotationPageKey) => void;
};

export function OrderPdfOverlayEditorSurface(props: OrderPdfOverlayEditorSurfaceProps): ReactElement {
  const {
    toolbar,
    dragOver,
    layout,
    draft,
    overlayRef,
    containerRef,
    canvasRef,
    detailsRichRef,
    notesRichRef,
    orderNoInputRef,
    detailsEditorHandlers,
    notesEditorHandlers,
    onScalarFieldChange,
    onStagePointerDownCapture,
    onStagePointerMoveCapture,
    onStagePointerUpCapture,
    onStagePointerCancelCapture,
    onStageDragOver,
    onStageDragLeave,
    onStageDrop,
    inlineConfirm,
    onConfirmInlineOk,
    onConfirmInlineCancel,
    sketchPreviewOpen,
    sketchPreviewBusy,
    sketchPreviewError,
    sketchPreviewEntries,
    onToggleSketchPreview,
    onRefreshSketchPreview,
    onAppendSketchStroke,
    onUpsertSketchTextBox,
    onDeleteSketchTextBox,
    onUndoSketchStroke,
    onRedoSketchAnnotation,
    onClearSketchStrokes,
  } = props;

  return (
    <div
      className="wp-pdf-editor-overlay"
      dir="ltr"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      data-testid="order-pdf-overlay"
      data-wp-history-shortcuts="suspend"
    >
      {toolbar}

      <div
        className={`wp-pdf-editor-stage${dragOver ? ' is-drop' : ''}`}
        dir="ltr"
        onPointerDownCapture={onStagePointerDownCapture}
        onPointerMoveCapture={onStagePointerMoveCapture}
        onPointerUpCapture={onStagePointerUpCapture}
        onPointerCancelCapture={onStagePointerCancelCapture}
        onDragOver={onStageDragOver}
        onDragLeave={onStageDragLeave}
        onDrop={onStageDrop}
      >
        <div className="wp-pdf-editor-page-wrap">
          <div className="wp-pdf-editor-page" ref={containerRef} style={layout.pageStyle}>
            <canvas ref={canvasRef} className="wp-pdf-editor-canvas" />

            {ORDER_PDF_INPUTS.map(input => (
              <input
                key={input.key}
                className={input.className}
                style={layout.fieldStyles[input.styleKey]}
                dir={input.dir}
                ref={input.key === 'orderNumber' ? orderNoInputRef : undefined}
                name={input.key}
                aria-label={input.ariaLabel}
                title={input.title}
                type={input.type}
                inputMode={input.inputMode}
                autoComplete={input.autoComplete}
                value={draft ? draft[input.key] : ''}
                onChange={(e: import('react').ChangeEvent<HTMLInputElement>) => {
                  const v = e?.target?.value ?? '';
                  onScalarFieldChange(input.key, v);
                }}
                placeholder={input.placeholder}
              />
            ))}

            <div className="wp-pdf-editor-richbox" style={layout.fieldStyles.details} dir="rtl">
              <div
                className="wp-pdf-editor-rich-editor"
                ref={detailsRichRef}
                tabIndex={0}
                role="textbox"
                aria-multiline="true"
                aria-label="פרוט הזמנה"
                title="פרוט הזמנה"
                contentEditable
                suppressContentEditableWarning
                dir="rtl"
                data-placeholder="פרוט הזמנה"
                {...detailsEditorHandlers}
              />
            </div>

            <div
              className="wp-pdf-editor-rich-editor wp-pdf-editor-rich-editor--notes"
              style={layout.fieldStyles.notes}
              ref={notesRichRef}
              tabIndex={0}
              role="textbox"
              aria-multiline="true"
              aria-label="הערות"
              title="הערות"
              contentEditable
              suppressContentEditableWarning
              dir="rtl"
              data-placeholder="הערות"
              {...notesEditorHandlers}
            />

            <div
              className="wp-pdf-editor-size-anchor"
              style={{ width: layout.size.w * layout.cssScale, height: layout.size.h * layout.cssScale }}
              aria-hidden="true"
            />
          </div>

          <div className="wp-pdf-sketch-cta-wrap" dir="rtl">
            <div className="wp-pdf-sketch-cta-dock">
              <button
                type="button"
                className={`wp-pdf-editor-btn wp-pdf-editor-btn--primary wp-pdf-sketch-cta${sketchPreviewOpen ? ' is-on' : ''}`}
                onClick={onToggleSketchPreview}
              >
                <i className={`fas ${sketchPreviewOpen ? 'fa-eye-slash' : 'fa-pen'}`} />
                <span>{sketchPreviewOpen ? 'הסתר סקיצות לציור' : 'הצג סקיצות לציור'}</span>
              </button>
            </div>
          </div>
        </div>

        <OrderPdfOverlaySketchPanel
          open={sketchPreviewOpen}
          busy={sketchPreviewBusy}
          error={sketchPreviewError}
          entries={sketchPreviewEntries}
          draft={draft}
          onRefresh={onRefreshSketchPreview}
          onAppendStroke={onAppendSketchStroke}
          onUpsertTextBox={onUpsertSketchTextBox}
          onDeleteTextBox={onDeleteSketchTextBox}
          onUndo={onUndoSketchStroke}
          onRedo={onRedoSketchAnnotation}
          onClear={onClearSketchStrokes}
        />
      </div>

      {inlineConfirm && inlineConfirm.open ? (
        <div id="orderPdfInlineConfirmModal" className="modal-overlay open wp-pdf-inline-modal" dir="rtl">
          <div className="modal-box">
            <div className="modal-title">{inlineConfirm.title}</div>
            <div className="modal-message wp-pdf-inline-message">{inlineConfirm.message}</div>
            {inlineConfirm.preview ? (
              <div className="wp-pdf-inline-preview">{inlineConfirm.preview}</div>
            ) : null}
            <div className="modal-actions">
              <button type="button" className="btn btn-save" onClick={onConfirmInlineOk}>
                אישור
              </button>
              <button type="button" className="btn btn-cancel" onClick={onConfirmInlineCancel}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
