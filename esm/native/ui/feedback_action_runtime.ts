import type { UiConfirmResult } from './feedback_confirm_runtime.js';
import type { UiPromptResult } from './feedback_prompt_runtime.js';

export type ConfirmedActionArgs<Result> = {
  request: () => Promise<UiConfirmResult>;
  onRequestError: (message: string) => Result | Promise<Result>;
  onCancelled: () => Result | Promise<Result>;
  runConfirmed: () => Result | Promise<Result>;
};

export type PromptedActionArgs<Result> = {
  request: () => Promise<UiPromptResult>;
  onRequestError: (message: string) => Result | Promise<Result>;
  onCancelled: () => Result | Promise<Result>;
  runSubmitted: (value: string) => Result | Promise<Result>;
  normalizeValue?: ((value: string) => string) | null;
  treatEmptyAsCancelled?: boolean;
};

function normalizePromptValue(value: string, normalizeValue?: ((value: string) => string) | null): string {
  if (typeof normalizeValue !== 'function') return value;
  return normalizeValue(value);
}

export async function runConfirmedAction<Result>(args: ConfirmedActionArgs<Result>): Promise<Result> {
  const confirmation = await args.request();
  if (!confirmation.ok) return await args.onRequestError(confirmation.message);
  if (!confirmation.confirmed) return await args.onCancelled();
  return await args.runConfirmed();
}

export async function runPromptedAction<Result>(args: PromptedActionArgs<Result>): Promise<Result> {
  const promptResult = await args.request();
  if (!promptResult.ok) return await args.onRequestError(promptResult.message);
  if (!promptResult.submitted) return await args.onCancelled();

  const value = normalizePromptValue(promptResult.value, args.normalizeValue);
  if ((args.treatEmptyAsCancelled ?? true) && !value) return await args.onCancelled();
  return await args.runSubmitted(value);
}
