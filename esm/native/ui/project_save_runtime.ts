import {
  asUiFeedbackPrompt as asUiFeedbackPromptImpl,
  createProjectSavePromptFallback as createProjectSavePromptFallbackImpl,
} from './project_save_runtime_prompt.js';
import { runEnsureSaveProjectAction as runEnsureSaveProjectActionImpl } from './project_save_runtime_action.js';
import type {
  ProjectSaveRuntimeDeps,
  ProjectSaveRuntimeToastFn,
  PromptFnLike,
  UiFeedbackPromptLike,
} from './project_save_runtime_contracts.js';

export type { ProjectSaveRuntimeDeps, ProjectSaveRuntimeToastFn, PromptFnLike, UiFeedbackPromptLike };

export function asUiFeedbackPrompt(value: unknown): UiFeedbackPromptLike | null {
  return asUiFeedbackPromptImpl(value);
}

export function createProjectSavePromptFallback(win: Window | null): PromptFnLike {
  return createProjectSavePromptFallbackImpl(win);
}

export function runEnsureSaveProjectAction(
  App: import('../../../types').AppContainer,
  deps: ProjectSaveRuntimeDeps
): import('../../../types').SaveProjectAction | null {
  return runEnsureSaveProjectActionImpl(App, deps);
}
