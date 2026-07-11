import type { ReactElement } from 'react';

import { Button } from '../components/Button.js';
import type { OrderPdfOverlayInlineConfirmModel } from './order_pdf_overlay_editor_surface_contracts.js';

export function OrderPdfOverlayInlineConfirm(props: OrderPdfOverlayInlineConfirmModel): ReactElement | null {
  const { state, onConfirm, onCancel } = props;
  if (!state?.open) return null;

  return (
    <div id="orderPdfInlineConfirmModal" className="modal-overlay open wp-pdf-inline-modal" dir="rtl">
      <div className="modal-box">
        <div className="modal-title">{state.title}</div>
        <div className="modal-message wp-pdf-inline-message">{state.message}</div>
        {state.preview ? <div className="wp-pdf-inline-preview">{state.preview}</div> : null}
        <div className="modal-actions">
          <Button variant="save" onClick={onConfirm}>
            אישור
          </Button>
          <Button variant="cancel" onClick={onCancel}>
            ביטול
          </Button>
        </div>
      </div>
    </div>
  );
}
