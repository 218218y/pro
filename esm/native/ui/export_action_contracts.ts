import type { CanvasExportDeliveryResult } from '../../../types';

export type ExportUiActionKind = 'snapshot' | 'copy' | 'dual' | 'render-sketch' | 'auto-zoom';
export type ExportUiActionReason = 'not-installed' | 'error' | 'busy' | 'delivery-failed';

type CanvasExportDeliverySuccess = Extract<CanvasExportDeliveryResult, { ok: true }>;
type CanvasExportDeliveryFailure = Extract<CanvasExportDeliveryResult, { ok: false }>;

export type ExportUiActionResult =
  | {
      ok: true;
      kind: ExportUiActionKind;
      deliveryResult?: CanvasExportDeliverySuccess;
      reason?: undefined;
      message?: undefined;
    }
  | {
      ok: false;
      kind: ExportUiActionKind;
      reason: Exclude<ExportUiActionReason, 'delivery-failed'>;
      message?: string;
      deliveryResult?: undefined;
    }
  | {
      ok: false;
      kind: ExportUiActionKind;
      reason: 'delivery-failed';
      message?: string;
      deliveryResult: CanvasExportDeliveryFailure;
    };

export function isCanvasExportDeliveryResult(value: unknown): value is CanvasExportDeliveryResult {
  if (!value || typeof value !== 'object') return false;
  const ok = Reflect.get(value, 'ok');
  if (ok === true) {
    const delivery = Reflect.get(value, 'delivery');
    return delivery === 'clipboard' || delivery === 'download';
  }
  if (ok !== false) return false;

  const stage = Reflect.get(value, 'stage');
  const reason = Reflect.get(value, 'reason');
  if (stage === 'encoding') {
    return (reason === 'security' || reason === 'error') && Reflect.has(value, 'error');
  }
  if (stage !== 'clipboard' || (reason !== 'unavailable' && reason !== 'error')) return false;
  const message = Reflect.get(value, 'message');
  return typeof message === 'undefined' || typeof message === 'string';
}
