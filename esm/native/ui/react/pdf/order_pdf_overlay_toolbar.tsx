import type { ChangeEvent, ReactElement, RefObject } from 'react';

import {
  resolveOrderPdfSketchImageOptionsTitle,
  resolveOrderPdfSketchImageToolbarState,
} from './order_pdf_overlay_sketch_image_slots_runtime.js';

type OrderPdfOverlayToolbarProps = {
  zoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onRefreshAuto: () => void;
  onLoadPdfClick: () => void;
  pdfFileInputRef: RefObject<HTMLInputElement | null>;
  onPdfFileSelected: (e: ChangeEvent<HTMLInputElement>) => void;
  onExportInteractive: () => void;
  onExportImagePdf: () => void;
  imagePdfBusy: boolean;
  onExportInteractiveToGmail: () => void;
  gmailBusy: boolean;
  hasImportedPdfImages: boolean;
  hasImportedPdfRenderImage: boolean;
  hasImportedPdfOpenImage: boolean;
  includeRenderSketchOn: boolean;
  includeOpenClosedOn: boolean;
  onToggleRenderSketch: () => void;
  onToggleOpenClosed: () => void;
  onClose: () => void;
};

function GmailIcon(props: { title?: string }) {
  const title = props && props.title ? String(props.title) : '';
  return (
    <svg
      className="wp-icon-gmail"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      role="img"
      aria-label={title || 'Gmail'}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path fill="#FFFFFF" d="M4 5h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path fill="#FBBC04" d="M22 8.5v-2L12 13.2 2 6.5v2L12 16l10-7.5Z" />
      <path fill="#34A853" d="M2 8.5V19a2 2 0 0 0 2 2h3V11.2L2 8.5Z" />
      <path fill="#4285F4" d="M22 8.5V19a2 2 0 0 1-2 2h-3V11.2l5-2.7Z" />
      <path fill="#EA4335" d="M7 11.2V21h10V11.2L12 15l-5-3.8Z" opacity="0.96" />
      <path
        fill="#0f172a"
        opacity="0.12"
        d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 19V7A1.5 1.5 0 0 1 4 5.5Zm0-1A2.5 2.5 0 0 0 1.5 7v12A2.5 2.5 0 0 0 4 21.5h16A2.5 2.5 0 0 0 22.5 19V7A2.5 2.5 0 0 0 20 4.5H4Z"
      />
    </svg>
  );
}

export function OrderPdfOverlayToolbar(props: OrderPdfOverlayToolbarProps): ReactElement {
  const {
    zoom,
    onZoomOut,
    onZoomIn,
    onRefreshAuto,
    onLoadPdfClick,
    pdfFileInputRef,
    onPdfFileSelected,
    onExportInteractive,
    onExportImagePdf,
    imagePdfBusy,
    onExportInteractiveToGmail,
    gmailBusy,
    hasImportedPdfImages,
    hasImportedPdfRenderImage,
    hasImportedPdfOpenImage,
    includeRenderSketchOn,
    includeOpenClosedOn,
    onToggleRenderSketch,
    onToggleOpenClosed,
    onClose,
  } = props;

  const renderSketchState = resolveOrderPdfSketchImageToolbarState({
    key: 'renderSketch',
    hasImportedPdfImage: hasImportedPdfRenderImage,
    enabled: includeRenderSketchOn,
  });
  const openClosedState = resolveOrderPdfSketchImageToolbarState({
    key: 'openClosed',
    hasImportedPdfImage: hasImportedPdfOpenImage,
    enabled: includeOpenClosedOn,
  });
  const imageOptionsLabel = resolveOrderPdfSketchImageOptionsTitle(hasImportedPdfImages);
  const printTooltip = imagePdfBusy
    ? 'מייצר PDF כתמונה…'
    : 'הדפס/הורד PDF כתמונה (לא אינטראקטיבי) – שומר על מראה אחיד בלי אותיות הפוכות';
  const gmailTooltip = gmailBusy ? 'יוצר טיוטה…' : 'פתח טיוטת מייל (Gmail) עם PDF כתמונה מצורף';

  return (
    <div className="wp-pdf-editor-toolbar" dir="ltr">
      <div className="wp-pdf-editor-toolbar-left" dir="ltr" aria-label="זום">
        <div className="wp-pdf-editor-zoom" dir="ltr">
          <button
            type="button"
            className="wp-pdf-editor-btn wp-pdf-editor-btn--iconOnly wp-pdf-ui-hint"
            onClick={onZoomOut}
            data-tooltip="הקטן"
            aria-label="הקטן"
            tabIndex={-1}
          >
            <i className="fas fa-minus" aria-hidden="true" />
          </button>
          <span className="wp-pdf-editor-zoom-val">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="wp-pdf-editor-btn wp-pdf-editor-btn--iconOnly wp-pdf-ui-hint"
            onClick={onZoomIn}
            data-tooltip="הגדל"
            aria-label="הגדל"
            tabIndex={-1}
          >
            <i className="fas fa-plus" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="wp-pdf-editor-toolbar-center" dir="rtl">
        <button
          type="button"
          className="wp-pdf-editor-btn wp-pdf-editor-toolbar-action-btn wp-pdf-ui-hint"
          onClick={onRefreshAuto}
          data-tooltip="עדכן מהפרויקט"
          aria-label="עדכן מהפרויקט"
          tabIndex={-1}
          data-testid="order-pdf-refresh-button"
        >
          <i className="fas fa-sync" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="wp-pdf-editor-btn wp-pdf-editor-toolbar-action-btn wp-pdf-ui-hint"
          onClick={onLoadPdfClick}
          data-tooltip="טען PDF קיים לעריכה (אפשר גם לגרור PDF לתוך העורך)"
          aria-label="טען PDF קיים לעריכה"
          tabIndex={-1}
          data-testid="order-pdf-load-button"
        >
          <i className="fas fa-upload" aria-hidden="true" />
        </button>

        <input
          ref={pdfFileInputRef}
          id="wp-pdf-editor-load-input"
          name="orderPdfLoadFile"
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          aria-label="טען PDF קיים לעריכה"
          onChange={onPdfFileSelected}
          data-testid="order-pdf-load-input"
        />

        <button
          type="button"
          className="wp-pdf-editor-btn wp-pdf-editor-toolbar-action-btn wp-pdf-editor-btn--pdf wp-pdf-ui-hint"
          onClick={onExportInteractive}
          data-tooltip="הורד PDF (אינטראקטיבי לעריכה באקרובט)"
          aria-label="הורד PDF"
          tabIndex={-1}
          data-testid="order-pdf-download-button"
        >
          <i className="fas fa-download" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="wp-pdf-editor-btn wp-pdf-editor-toolbar-action-btn wp-pdf-editor-btn--pdfImg wp-pdf-ui-hint"
          onClick={onExportImagePdf}
          disabled={imagePdfBusy}
          data-tooltip={printTooltip}
          aria-label={imagePdfBusy ? 'מייצר PDF כתמונה' : 'הדפס PDF'}
          tabIndex={-1}
          data-testid="order-pdf-print-button"
        >
          <i className="fas fa-print" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="wp-pdf-editor-btn wp-pdf-editor-toolbar-action-btn wp-pdf-editor-btn--mail wp-pdf-ui-hint"
          onClick={onExportInteractiveToGmail}
          disabled={gmailBusy}
          data-tooltip={gmailTooltip}
          aria-label={gmailBusy ? 'יוצר טיוטת מייל' : 'פתח טיוטת מייל עם PDF מצורף'}
          tabIndex={-1}
          data-testid="order-pdf-gmail-button"
        >
          <GmailIcon title="Gmail" />
        </button>

        <div className="wp-pdf-editor-imgopts" aria-label={imageOptionsLabel}>
          <span className="wp-pdf-editor-imgopts-label">צרף תמונות:</span>
          <button
            type="button"
            className={`wp-pdf-editor-toggle wp-pdf-ui-hint${includeRenderSketchOn ? ' is-on' : ''}`}
            aria-pressed={includeRenderSketchOn}
            aria-label={renderSketchState.title}
            data-tooltip={renderSketchState.title}
            data-testid="order-pdf-toggle-render-sketch"
            tabIndex={-1}
            onClick={onToggleRenderSketch}
          >
            <span className="wp-pdf-editor-toggle-check" aria-hidden="true">
              ✓
            </span>
            <span>
              הדמיה/סקיצה
              {renderSketchState.suffix}
            </span>
          </button>

          <button
            type="button"
            className={`wp-pdf-editor-toggle wp-pdf-ui-hint${includeOpenClosedOn ? ' is-on' : ''}`}
            aria-pressed={includeOpenClosedOn}
            aria-label={openClosedState.title}
            data-tooltip={openClosedState.title}
            data-testid="order-pdf-toggle-open-closed"
            tabIndex={-1}
            onClick={onToggleOpenClosed}
          >
            <span className="wp-pdf-editor-toggle-check" aria-hidden="true">
              ✓
            </span>
            <span>
              פתוח/סגור
              {openClosedState.suffix}
            </span>
          </button>
        </div>
      </div>

      <div className="wp-pdf-editor-toolbar-right" dir="ltr">
        <button
          type="button"
          className="wp-pdf-editor-btn wp-pdf-editor-btn--iconOnly wp-pdf-ui-hint"
          onClick={onClose}
          data-tooltip="סגור"
          aria-label="סגור"
          tabIndex={-1}
          data-testid="order-pdf-close-button"
        >
          <i className="fas fa-times" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
