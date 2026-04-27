import { ORDER_PDF_OVERLAY_FIELD_RECTS } from '../../pdf/order_pdf_field_specs_runtime.js';

// Gmail subject/body templates for the created draft.
// You can tweak the wording here.
// Available placeholders: {projectName}, {orderNumber}, {fileName}
// NOTE: We attach the *image PDF* to Gmail (for consistent rendering), so using {fileName}
// keeps the subject aligned with the attachment name.
export const GMAIL_SUBJECT_TEMPLATE = '{fileName}';

// Body text (Hebrew) – keep it short and without extra signature.
export const GMAIL_BODY_TEMPLATE = 'מצורף PDF כתמונה של ההזמנה.';

export function _applyTemplate(tpl: string, vars: Record<string, string>): string {
  const s = String(tpl || '');
  return s.replace(/\{(projectName|orderNumber|fileName)\}/g, (_, key) => {
    const v = vars && typeof vars[key] === 'string' ? vars[key] : '';
    return v;
  });
}

export const CAPTURE_TRUE: AddEventListenerOptions = { capture: true };
export const SCROLL_CENTER: ScrollIntoViewOptions = { block: 'center', inline: 'nearest' };

// Tuned to public/order_template.pdf (uses the template's built-in AcroForm field rectangles).
// Page: A4 portrait (595×842pt). `top` is distance from top edge to the *bottom* of the field.
export const FIELD_ORDER_NO = ORDER_PDF_OVERLAY_FIELD_RECTS.orderNumber; // template field: מלל1 (מספר הזמנה)
export const FIELD_DATE = ORDER_PDF_OVERLAY_FIELD_RECTS.orderDate; // template field: 0 (תאריך)
export const FIELD_NAME = ORDER_PDF_OVERLAY_FIELD_RECTS.projectName; // template field: 1 (שם)
export const FIELD_DETAILS = ORDER_PDF_OVERLAY_FIELD_RECTS.details; // template field: 5 (פרוט הזמנה)
export const FIELD_ADDRESS = ORDER_PDF_OVERLAY_FIELD_RECTS.deliveryAddress; // template field: 2 (כתובת מלאה לאספקה)
export const FIELD_PHONE = ORDER_PDF_OVERLAY_FIELD_RECTS.phone; // template field: 3 (טלפון)
export const FIELD_MOBILE = ORDER_PDF_OVERLAY_FIELD_RECTS.mobile; // template field: 4 (נייד)
export const FIELD_NOTES = ORDER_PDF_OVERLAY_FIELD_RECTS.notes; // template field: 6 (הערות)
