import type { AppContainer, UiFeedbackConfirmFn } from '../../../types';

import { asRecord, getUiFeedback } from '../services/api.js';

export type UiConfirmLike = {
  openCustomConfirm?: UiFeedbackConfirmFn | null;
  confirm?: UiFeedbackConfirmFn | null;
};

export type UiConfirmResult =
  | { ok: true; confirmed: boolean; reason?: undefined; message?: undefined }
  | { ok: false; reason: 'confirm-unavailable' | 'error'; message: string; confirmed?: undefined };

function readErrorMessage(err: unknown): string {
  const rec = asRecord(err);
  if (rec && 'message' in rec) {
    const value = rec.message;
    if (typeof value === 'string') return value.trim();
  }
  if (typeof err === 'string') return err.trim();
  return '';
}

export function requestConfirmationFromFeedback(
  fb: UiConfirmLike | null | undefined,
  title: string,
  message: string
): Promise<UiConfirmResult> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (value: UiConfirmResult): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    try {
      const confirmFn = fb?.openCustomConfirm || fb?.confirm;
      if (typeof confirmFn !== 'function') {
        finish({ ok: false, reason: 'confirm-unavailable', message: 'אישור הפעולה לא זמין כרגע' });
        return;
      }
      confirmFn(
        title,
        message,
        () => finish({ ok: true, confirmed: true }),
        () => finish({ ok: true, confirmed: false })
      );
    } catch (error) {
      finish({
        ok: false,
        reason: 'error',
        message: readErrorMessage(error) || 'אישור הפעולה נכשל',
      });
    }
  });
}

export function requestAppConfirmation(
  App: AppContainer,
  title: string,
  message: string
): Promise<UiConfirmResult> {
  return requestConfirmationFromFeedback(getUiFeedback(App), title, message);
}
