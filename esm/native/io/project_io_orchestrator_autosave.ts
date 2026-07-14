import type { AppContainer, AutosaveSuspensionLike } from '../../../types/index.js';

import { forceAutosaveNowViaService, suspendAutosaveViaServiceOrThrow } from '../runtime/autosave_access.js';
import { isProjectIoRestoreGenerationCurrent } from '../runtime/project_io_access.js';

export type ProjectIoAutosaveRefreshArgs = {
  App: AppContainer;
  restoreGen: number;
  isHistoryApply: boolean;
  isModelApply: boolean;
  isCloudApply: boolean;
  preserveAutosave: boolean;
  reportNonFatal: (op: string, err: unknown, throttleMs?: number) => void;
};

export function suspendProjectIoAutosaveBeforeLoad(App: AppContainer): AutosaveSuspensionLike {
  return suspendAutosaveViaServiceOrThrow(App);
}

export function refreshProjectIoAutosaveAfterLoad(args: ProjectIoAutosaveRefreshArgs): boolean {
  const { App, restoreGen, isHistoryApply, isModelApply, isCloudApply, preserveAutosave, reportNonFatal } =
    args;
  if (preserveAutosave || isHistoryApply || isModelApply || isCloudApply) return true;
  if (!isProjectIoRestoreGenerationCurrent(App, restoreGen)) return false;

  try {
    return forceAutosaveNowViaService(App);
  } catch (err) {
    reportNonFatal('project.load.refreshAutosave', err, 6000);
    return false;
  }
}
