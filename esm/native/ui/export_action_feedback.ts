import type { ExportUiActionResult } from './export_action_contracts.js';

export type ExportActionToastInfo = {
  message: string;
  type: 'error';
};

function withDetail(base: string, detail?: string): string {
  const suffix = String(detail || '').trim();
  return suffix ? `${base}: ${suffix}` : base;
}

function isFailureResult(
  result: ExportUiActionResult
): result is Extract<ExportUiActionResult, { ok: false }> {
  return !result.ok;
}

export function getExportActionFailureToast(result: ExportUiActionResult): ExportActionToastInfo | null {
  if (!isFailureResult(result)) return null;
  if (result.reason === 'busy') {
    return { message: 'פעולת ייצוא כבר רצה כרגע', type: 'error' };
  }

  switch (result.kind) {
    case 'snapshot':
      return {
        message:
          result.reason === 'not-installed' ? 'צילום לא זמין כרגע' : withDetail('צילום נכשל', result.message),
        type: 'error',
      };
    case 'copy':
      return {
        message:
          result.reason === 'not-installed'
            ? 'העתקה ללוח לא זמינה כרגע'
            : withDetail('העתקה ללוח נכשלה', result.message),
        type: 'error',
      };
    case 'dual':
      return {
        message:
          result.reason === 'not-installed'
            ? 'ייצוא פתוח/סגור לא זמין כרגע'
            : withDetail('ייצוא פתוח/סגור נכשל', result.message),
        type: 'error',
      };
    case 'render-sketch':
      return {
        message:
          result.reason === 'not-installed'
            ? 'ייצוא סקיצה/הדמיה לא זמין כרגע'
            : withDetail('ייצוא סקיצה/הדמיה נכשל', result.message),
        type: 'error',
      };
    case 'auto-zoom':
      return {
        message:
          result.reason === 'not-installed'
            ? 'זום אוטומטי לא זמין כרגע'
            : withDetail('זום אוטומטי נכשל', result.message),
        type: 'error',
      };
    default:
      return { message: withDetail('פעולת ייצוא נכשלה', result.message), type: 'error' };
  }
}
