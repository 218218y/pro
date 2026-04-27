import { asRecord } from '../services/api.js';

export type UiPromptLike = {
  openCustomPrompt?:
    | ((title: string, defaultValue: string, cb: (value: string | null) => void) => unknown)
    | null;
  prompt?: ((title: string, defaultValue: string, cb: (value: string | null) => void) => unknown) | null;
};

export type UiPromptResult =
  | { ok: true; submitted: true; value: string; reason?: undefined; message?: undefined }
  | { ok: true; submitted: false; value: null; reason?: undefined; message?: undefined }
  | {
      ok: false;
      reason: 'prompt-unavailable' | 'error';
      message: string;
      submitted?: undefined;
      value?: undefined;
    };

function readErrorMessage(err: unknown): string {
  const rec = asRecord(err);
  if (rec && 'message' in rec) {
    const value = rec.message;
    if (typeof value === 'string') return value.trim();
  }
  if (typeof err === 'string') return err.trim();
  return '';
}

export function requestPromptFromFeedback(
  fb: UiPromptLike | null | undefined,
  title: string,
  defaultValue: string,
  unavailableMessage = 'קלט טקסט לא זמין כרגע'
): Promise<UiPromptResult> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (value: UiPromptResult): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    try {
      const promptFn = fb?.openCustomPrompt || fb?.prompt;
      if (typeof promptFn !== 'function') {
        finish({ ok: false, reason: 'prompt-unavailable', message: unavailableMessage });
        return;
      }
      promptFn(title, defaultValue, value => {
        if (value === null || value === undefined) {
          finish({ ok: true, submitted: false, value: null });
          return;
        }
        finish({ ok: true, submitted: true, value: String(value) });
      });
    } catch (error) {
      finish({
        ok: false,
        reason: 'error',
        message: readErrorMessage(error) || 'קבלת קלט נכשלה',
      });
    }
  });
}
