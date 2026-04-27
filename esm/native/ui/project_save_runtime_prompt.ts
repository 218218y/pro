import type { PromptFnLike, UiFeedbackPromptLike } from './project_save_runtime_contracts.js';

type ProjectSaveRuntimeRecordLike = Record<string, unknown>;

function isRecord(value: unknown): value is ProjectSaveRuntimeRecordLike {
  return !!value && typeof value === 'object';
}

function readPromptMethod(
  owner: ProjectSaveRuntimeRecordLike,
  key: 'openCustomPrompt' | 'prompt'
): PromptFnLike | null {
  const value = owner[key];
  if (typeof value !== 'function') return null;
  return (title: string, def: string, cb: (v: string | null) => void) =>
    Reflect.apply(value, owner, [title, def, cb]);
}

export function asUiFeedbackPrompt(value: unknown): UiFeedbackPromptLike | null {
  if (!isRecord(value)) return null;
  const openCustomPrompt = readPromptMethod(value, 'openCustomPrompt');
  const prompt = readPromptMethod(value, 'prompt');
  return openCustomPrompt || prompt
    ? { openCustomPrompt: openCustomPrompt || undefined, prompt: prompt || undefined }
    : null;
}

export function createProjectSavePromptFallback(win: Window | null): PromptFnLike {
  return function (title: string, def: string, cb: (v: string | null) => void) {
    if (!win || typeof win.prompt !== 'function') {
      throw new Error('שמירה לא זמינה כרגע (prompt)');
    }
    const value = win.prompt(title, def);
    cb(value == null ? null : String(value));
  };
}
