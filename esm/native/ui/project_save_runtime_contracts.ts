export type ProjectSaveRuntimeToastFn = (msg: string, type?: string) => void;
export type PromptFnLike = (title: string, def: string, cb: (v: string | null) => void) => void;
export type UiFeedbackPromptLike = { openCustomPrompt?: PromptFnLike; prompt?: PromptFnLike };

export type ProjectSaveRuntimeDeps = {
  win: Window | null;
  doc: Document | null;
  toast: ProjectSaveRuntimeToastFn;
};
