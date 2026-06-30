import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DragEventHandler,
  InputHTMLAttributes,
  MutableRefObject,
  PointerEventHandler,
  PointerEvent as ReactPointerEvent,
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
import { OrderPdfOverlayPdfPageAnnotationLayer } from './order_pdf_overlay_pdf_page_annotation_layer.js';
import { OrderPdfOverlaySketchPanel } from './order_pdf_overlay_sketch_panel.js';
import { revealOrderPdfSketchPreviewInStage } from './order_pdf_overlay_sketch_preview_reveal_runtime.js';
import {
  captureStagePointerDown,
  captureStagePointerMove,
  createInitialStageGesture,
  finishStagePointerUp,
  resetStageGesture,
} from './order_pdf_overlay_stage_interactions.js';

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
  sketchPreviewReady: boolean;
  onToggleSketchPreview: () => void;
  onCloseSketchPreview: () => void;
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
    sketchPreviewReady,
    onToggleSketchPreview,
    onCloseSketchPreview,
    onRefreshSketchPreview,
    onAppendSketchStroke,
    onUpsertSketchTextBox,
    onDeleteSketchTextBox,
    onUndoSketchStroke,
    onRedoSketchAnnotation,
    onClearSketchStrokes,
  } = props;
  const [pdfPageAnnotationOpen, setPdfPageAnnotationOpen] = useState(false);
  const pdfPageAnnotationDismissGestureRef = useRef(createInitialStageGesture());
  const editorStageRef = useRef<HTMLDivElement | null>(null);
  const sketchPreviewPanelRef = useRef<HTMLElement | null>(null);
  const pendingSketchPreviewRevealRef = useRef(false);
  const pdfPageAnnotationTooltip = pdfPageAnnotationOpen
    ? 'סגור ציור על עמוד ה-PDF'
    : 'פתח ציור והערות על עמוד ה-PDF';
  const sketchPreviewTooltip = sketchPreviewOpen ? 'הסתר ציור על תמונות הסקיצה' : 'פתח ציור על תמונות הסקיצה';
  const closePdfPageAnnotationMode = useCallback(() => {
    resetStageGesture(pdfPageAnnotationDismissGestureRef.current);
    setPdfPageAnnotationOpen(false);
  }, []);
  const handleTogglePdfPageAnnotationMode = useCallback(() => {
    if (pdfPageAnnotationOpen) {
      closePdfPageAnnotationMode();
      return;
    }
    if (sketchPreviewOpen) onCloseSketchPreview();
    setPdfPageAnnotationOpen(true);
  }, [closePdfPageAnnotationMode, onCloseSketchPreview, pdfPageAnnotationOpen, sketchPreviewOpen]);
  const handleToggleSketchPreview = useCallback(() => {
    pendingSketchPreviewRevealRef.current = !sketchPreviewOpen;
    if (pdfPageAnnotationOpen) closePdfPageAnnotationMode();
    onToggleSketchPreview();
  }, [closePdfPageAnnotationMode, onToggleSketchPreview, pdfPageAnnotationOpen, sketchPreviewOpen]);
  useEffect(() => {
    if (!sketchPreviewOpen) {
      pendingSketchPreviewRevealRef.current = false;
      return undefined;
    }
    if (!pendingSketchPreviewRevealRef.current) return undefined;
    if (sketchPreviewBusy) return undefined;
    if (!sketchPreviewEntries.length && !sketchPreviewError) return undefined;

    const win = editorStageRef.current?.ownerDocument?.defaultView ?? null;
    let raf1 = 0;
    let raf2 = 0;

    const reveal = () => {
      const revealed = revealOrderPdfSketchPreviewInStage({
        host: editorStageRef.current,
        target: sketchPreviewPanelRef.current,
      });
      if (revealed) pendingSketchPreviewRevealRef.current = false;
    };

    if (!win || typeof win.requestAnimationFrame !== 'function') {
      reveal();
      return undefined;
    }

    raf1 = win.requestAnimationFrame(() => {
      raf2 = win.requestAnimationFrame(reveal);
    });

    return () => {
      if (raf1) win.cancelAnimationFrame(raf1);
      if (raf2) win.cancelAnimationFrame(raf2);
    };
  }, [sketchPreviewBusy, sketchPreviewEntries.length, sketchPreviewError, sketchPreviewOpen]);

  const handleStagePointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pdfPageAnnotationOpen && event.target === event.currentTarget) {
        captureStagePointerDown(pdfPageAnnotationDismissGestureRef.current, event);
        return;
      }
      resetStageGesture(pdfPageAnnotationDismissGestureRef.current);
      onStagePointerDownCapture(event);
    },
    [onStagePointerDownCapture, pdfPageAnnotationOpen]
  );
  const handleStagePointerMoveCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pdfPageAnnotationOpen && pdfPageAnnotationDismissGestureRef.current.down) {
        captureStagePointerMove(pdfPageAnnotationDismissGestureRef.current, event);
        return;
      }
      onStagePointerMoveCapture(event);
    },
    [onStagePointerMoveCapture, pdfPageAnnotationOpen]
  );
  const handleStagePointerUpCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pdfPageAnnotationOpen && pdfPageAnnotationDismissGestureRef.current.down) {
        const shouldDismissPdfAnnotation = finishStagePointerUp(
          pdfPageAnnotationDismissGestureRef.current,
          event
        );
        if (shouldDismissPdfAnnotation) {
          event.preventDefault();
          event.stopPropagation();
          setPdfPageAnnotationOpen(false);
        }
        return;
      }
      onStagePointerUpCapture(event);
    },
    [onStagePointerUpCapture, pdfPageAnnotationOpen]
  );
  const handleStagePointerCancelCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pdfPageAnnotationOpen && pdfPageAnnotationDismissGestureRef.current.down) {
        resetStageGesture(pdfPageAnnotationDismissGestureRef.current);
        return;
      }
      resetStageGesture(pdfPageAnnotationDismissGestureRef.current);
      onStagePointerCancelCapture(event);
    },
    [onStagePointerCancelCapture, pdfPageAnnotationOpen]
  );

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

      {pdfPageAnnotationOpen ? (
        <button
          type="button"
          className="wp-pdf-editor-mode-toast"
          dir="rtl"
          onClick={closePdfPageAnnotationMode}
          aria-label="מצב עריכה פעיל: ציור והערות על עמוד ה-PDF. לחץ על הרקע הריק כדי לצאת מהציור"
        >
          <span className="status-dot" aria-hidden="true" />
          <span className="status-texts">
            <span className="status-label">מצב עריכה: ציור והערות על עמוד ה-PDF</span>
            <span className="status-hint">לחץ על הרקע הריק כדי לצאת מהציור</span>
          </span>
        </button>
      ) : null}

      {sketchPreviewReady ? (
        <div
          className="wp-pdf-editor-mode-toast wp-pdf-editor-mode-toast--sketch-ready"
          dir="rtl"
          role="status"
          aria-live="polite"
          data-testid="order-pdf-sketch-preview-ready-toast"
        >
          <span className="status-dot" aria-hidden="true" />
          <span className="status-texts">
            <span className="status-label">תמונות סקיצה נוצרו</span>
            <span className="status-hint">אפשר לגלול ולערוך</span>
          </span>
        </div>
      ) : null}

      <div className="wp-pdf-floating-draw-dock" dir="rtl" aria-label="כלי ציור בעורך PDF">
        <button
          type="button"
          className={`wp-pdf-editor-btn wp-pdf-editor-btn--iconOnly wp-pdf-floating-draw-btn wp-pdf-floating-draw-btn--pdf wp-pdf-ui-hint wp-pdf-ui-hint--above${pdfPageAnnotationOpen ? ' is-on' : ''}`}
          data-testid="order-pdf-page-annotation-toggle"
          data-tooltip={pdfPageAnnotationTooltip}
          aria-label={pdfPageAnnotationTooltip}
          aria-pressed={pdfPageAnnotationOpen}
          onClick={handleTogglePdfPageAnnotationMode}
        >
          <span className="wp-pdf-floating-draw-icon" aria-hidden="true">
            <i className="fas fa-file-pdf wp-pdf-floating-draw-icon-base" />
            <i className="fas fa-pen wp-pdf-floating-draw-icon-corner" />
          </span>
        </button>

        <button
          type="button"
          className={`wp-pdf-editor-btn wp-pdf-editor-btn--iconOnly wp-pdf-floating-draw-btn wp-pdf-floating-draw-btn--sketch wp-pdf-ui-hint wp-pdf-ui-hint--above${sketchPreviewOpen ? ' is-on' : ''}`}
          data-testid="order-pdf-sketch-preview-toggle"
          data-tooltip={sketchPreviewTooltip}
          aria-label={sketchPreviewTooltip}
          aria-pressed={sketchPreviewOpen}
          onClick={handleToggleSketchPreview}
        >
          <span className="wp-pdf-floating-draw-icon" aria-hidden="true">
            <i className="fas fa-images wp-pdf-floating-draw-icon-base" />
            <i className="fas fa-pen wp-pdf-floating-draw-icon-corner" />
          </span>
        </button>
      </div>

      <div
        ref={editorStageRef}
        className={`wp-pdf-editor-stage${dragOver ? ' is-drop' : ''}`}
        dir="ltr"
        onPointerDownCapture={handleStagePointerDownCapture}
        onPointerMoveCapture={handleStagePointerMoveCapture}
        onPointerUpCapture={handleStagePointerUpCapture}
        onPointerCancelCapture={handleStagePointerCancelCapture}
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
                id={`wp-pdf-editor-${input.key}`}
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

            <OrderPdfOverlayPdfPageAnnotationLayer
              open={pdfPageAnnotationOpen}
              layout={layout}
              draft={draft}
              pageRef={containerRef}
              onAppendStroke={onAppendSketchStroke}
              onUpsertTextBox={onUpsertSketchTextBox}
              onDeleteTextBox={onDeleteSketchTextBox}
              onUndo={onUndoSketchStroke}
              onRedo={onRedoSketchAnnotation}
              onClear={onClearSketchStrokes}
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
