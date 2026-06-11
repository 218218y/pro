import type { OrderPdfOverlayActionResult } from './order_pdf_overlay_contracts.js';
import type { ToastLevel } from './order_pdf_overlay_controller_shared.js';

export type OrderPdfOverlayActionToast = {
  message: string;
  kind: ToastLevel;
};

type OrderPdfOverlayFailureResult = Extract<OrderPdfOverlayActionResult, { ok: false }>;

function withDetail(base: string, detail?: string): string {
  const suffix = String(detail || '').trim();
  return suffix ? `${base}: ${suffix}` : base;
}

function isFailure(result: OrderPdfOverlayActionResult): result is OrderPdfOverlayFailureResult {
  return result.ok === false;
}

export function getOrderPdfOverlayActionToast(
  result: OrderPdfOverlayActionResult
): OrderPdfOverlayActionToast {
  switch (result.kind) {
    case 'load-pdf': {
      if (result.ok === true) {
        return result.fieldsFound
          ? { message: 'ה-PDF נטען לעריכה', kind: 'success' }
          : { message: 'ה-PDF נטען (לא נמצאו שדות טופס)', kind: 'info' };
      }
      if (!isFailure(result)) return { message: 'טעינת PDF נכשלה', kind: 'error' };
      const failure = result;
      if (failure.reason === 'busy') return { message: 'טעינת PDF כבר מתבצעת כרגע', kind: 'info' };
      return {
        message:
          failure.reason === 'invalid-file'
            ? 'טעינת PDF נכשלה'
            : withDetail('טעינת PDF נכשלה', failure.detail),
        kind: 'error',
      };
    }
    case 'export-interactive': {
      if (result.ok === true) {
        return result.downloadStarted
          ? { message: 'ה-PDF נוצר והורד בהצלחה', kind: 'success' }
          : { message: 'לא הצלחתי להתחיל הורדה אוטומטית (הדפדפן חסם)', kind: 'warning' };
      }
      if (!isFailure(result)) return { message: 'הורדת PDF נכשלה', kind: 'error' };
      const failure = result;
      if (failure.reason === 'busy') return { message: 'הורדת PDF כבר מתבצעת כרגע', kind: 'info' };
      if (failure.reason === 'not-ready') return { message: 'הורדת PDF לא זמינה כרגע', kind: 'error' };
      return { message: withDetail('הורדת PDF נכשלה', failure.detail), kind: 'error' };
    }
    case 'export-image-pdf': {
      if (result.ok === true) {
        return result.downloadStarted
          ? { message: 'הורדתי PDF כתמונה (ללא טקסט חי)', kind: 'success' }
          : { message: 'לא הצלחתי להתחיל הורדה אוטומטית (הדפדפן חסם)', kind: 'warning' };
      }
      if (!isFailure(result)) return { message: 'הדפסה (PDF תמונה) נכשלה', kind: 'error' };
      const failure = result;
      if (failure.reason === 'busy') return { message: 'PDF כתמונה כבר נבנה כרגע', kind: 'info' };
      if (failure.reason === 'not-ready') return { message: 'הדפסה כ-PDF לא זמינה כרגע', kind: 'error' };
      return { message: withDetail('הדפסה (PDF תמונה) נכשלה', failure.detail), kind: 'error' };
    }
    case 'export-gmail': {
      if (result.ok === true) {
        return result.gmailOpened
          ? { message: 'פתחתי טיוטה בג׳ימייל עם PDF כתמונה מצורף', kind: 'success' }
          : {
              message: 'טיוטה נוצרה, אבל הדפדפן חסם פתיחת חלון. אפשר לפתוח ידנית: Gmail → טיוטות',
              kind: 'warning',
            };
      }
      if (!isFailure(result)) return { message: 'שליחה ל-Gmail נכשלה', kind: 'error' };
      const failure = result;
      if (failure.reason === 'busy') return { message: 'שליחה ל-Gmail כבר מתבצעת כרגע', kind: 'info' };
      if (failure.reason === 'not-ready') return { message: 'שליחה ל-Gmail לא זמינה כרגע', kind: 'error' };
      return { message: withDetail('שליחה ל-Gmail נכשלה', failure.detail), kind: 'error' };
    }
    case 'export-download-gmail': {
      if (result.ok === true) {
        if (result.gmailOpened && result.downloadStarted !== false) {
          return {
            message: 'הורדתי PDF אינטראקטיבי ופתחתי טיוטה בג׳ימייל עם PDF כתמונה מצורף',
            kind: 'success',
          };
        }
        if (!result.gmailOpened && result.downloadStarted !== false) {
          return { message: 'הורדתי PDF אינטראקטיבי, אבל הדפדפן חסם פתיחת טיוטת Gmail', kind: 'warning' };
        }
        return {
          message: 'טיוטה ב-Gmail נוצרה, אבל הדפדפן חסם הורדה אוטומטית. אפשר להוריד עם "הורד PDF".',
          kind: 'warning',
        };
      }
      if (!isFailure(result)) return { message: 'הורדה ושליחה ל-Gmail נכשלו', kind: 'error' };
      const failure = result;
      if (failure.reason === 'busy') return { message: 'שליחה ל-Gmail כבר מתבצעת כרגע', kind: 'info' };
      if (failure.reason === 'not-ready')
        return { message: 'שליחת PDF ל-Gmail לא זמינה כרגע', kind: 'error' };
      return { message: withDetail('שליחה ל-Gmail נכשלה', failure.detail), kind: 'error' };
    }
    default:
      return { message: 'פעולת PDF נכשלה', kind: 'error' };
  }
}
