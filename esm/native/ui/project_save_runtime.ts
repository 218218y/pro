import {
  asUiFeedbackPrompt as asUiFeedbackPromptImpl,
  createProjectSaveBrowserPrompt as createProjectSaveBrowserPromptImpl,
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

export function createProjectSaveBrowserPrompt(win: Window | null): PromptFnLike {
  return createProjectSaveBrowserPromptImpl(win);
}

export function runEnsureSaveProjectAction(
  App: import('../../../types').AppContainer,
  deps: ProjectSaveRuntimeDeps
): import('../../../types').SaveProjectAction | null {
  return runEnsureSaveProjectActionImpl(App, deps);
}
