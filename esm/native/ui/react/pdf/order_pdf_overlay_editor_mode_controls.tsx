import type { ReactElement } from 'react';

export function OrderPdfOverlayEditorModeControls(props: {
  pdfPageAnnotationOpen: boolean;
  sketchPreviewOpen: boolean;
  sketchPreviewReady: boolean;
  pdfPageAnnotationTooltip: string;
  sketchPreviewTooltip: string;
  onClosePdfPageAnnotationMode: () => void;
  onTogglePdfPageAnnotationMode: () => void;
  onToggleSketchPreview: () => void;
}): ReactElement {
  const {
    pdfPageAnnotationOpen,
    sketchPreviewOpen,
    sketchPreviewReady,
    pdfPageAnnotationTooltip,
    sketchPreviewTooltip,
    onClosePdfPageAnnotationMode,
    onTogglePdfPageAnnotationMode,
    onToggleSketchPreview,
  } = props;

  return (
    <>
      {pdfPageAnnotationOpen ? (
        <button
          type="button"
          className="wp-pdf-editor-mode-toast"
          dir="rtl"
          onClick={onClosePdfPageAnnotationMode}
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
          className={`wp-pdf-editor-btn wp-pdf-editor-btn--iconOnly wp-pdf-floating-draw-btn wp-pdf-floating-draw-btn--pdf wp-r-styled-tooltip wp-pdf-ui-hint wp-pdf-ui-hint--above${pdfPageAnnotationOpen ? ' is-on' : ''}`}
          data-testid="order-pdf-page-annotation-toggle"
          data-tooltip={pdfPageAnnotationTooltip}
          aria-label={pdfPageAnnotationTooltip}
          aria-pressed={pdfPageAnnotationOpen}
          onClick={onTogglePdfPageAnnotationMode}
        >
          <span className="wp-pdf-floating-draw-icon" aria-hidden="true">
            <i className="fas fa-file-pdf wp-pdf-floating-draw-icon-base" />
            <i className="fas fa-pen wp-pdf-floating-draw-icon-corner" />
          </span>
        </button>

        <button
          type="button"
          className={`wp-pdf-editor-btn wp-pdf-editor-btn--iconOnly wp-pdf-floating-draw-btn wp-pdf-floating-draw-btn--sketch wp-r-styled-tooltip wp-pdf-ui-hint wp-pdf-ui-hint--above${sketchPreviewOpen ? ' is-on' : ''}`}
          data-testid="order-pdf-sketch-preview-toggle"
          data-tooltip={sketchPreviewTooltip}
          aria-label={sketchPreviewTooltip}
          aria-pressed={sketchPreviewOpen}
          onClick={onToggleSketchPreview}
        >
          <span className="wp-pdf-floating-draw-icon" aria-hidden="true">
            <i className="fas fa-images wp-pdf-floating-draw-icon-base" />
            <i className="fas fa-pen wp-pdf-floating-draw-icon-corner" />
          </span>
        </button>
      </div>
    </>
  );
}
