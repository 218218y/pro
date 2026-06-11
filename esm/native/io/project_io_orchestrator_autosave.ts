import type { AppContainer } from '../../../types/index.js';

import { cancelAutosavePendingViaService, forceAutosaveNowViaService } from '../runtime/autosave_access.js';
import { isProjectIoRestoreGenerationCurrent } from '../runtime/project_io_access.js';

export type ProjectIoAutosaveRefreshArgs = {
  App: AppContainer;
  restoreGen: number;
  isHistoryApply: boolean;
  isModelApply: boolean;
  isCloudApply: boolean;
  reportNonFatal: (op: string, err: unknown, throttleMs?: number) => void;
};

export function cancelProjectIoAutosavePending(
  App: AppContainer,
  reportNonFatal: (op: string, err: unknown, throttleMs?: number) => void
): void {
  try {
    cancelAutosavePendingViaService(App);
  } catch (err) {
    reportNonFatal('project.load.cancelAutosavePending', err, 6000);
  }
}

export function refreshProjectIoAutosaveAfterLoad(args: ProjectIoAutosaveRefreshArgs): void {
  const { App, restoreGen, isHistoryApply, isModelApply, isCloudApply, reportNonFatal } = args;
  if (isHistoryApply || isModelApply || isCloudApply) return;
  if (!isProjectIoRestoreGenerationCurrent(App, restoreGen)) return;

  try {
    forceAutosaveNowViaService(App);
  } catch (err) {
    reportNonFatal('project.load.refreshAutosave', err, 6000);
  }
}
