import type { AppContainer } from '../../../types/index.js';

import {
  cancelAutosavePendingViaService,
  flushAutosavePendingViaService,
  forceAutosaveNowViaService,
} from '../runtime/autosave_access.js';
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

export type ProjectIoAutosavePrepareArgs = {
  App: AppContainer;
  preserveAutosave: boolean;
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

export function prepareProjectIoAutosaveBeforeLoad(args: ProjectIoAutosavePrepareArgs): void {
  const { App, preserveAutosave, reportNonFatal } = args;
  if (!preserveAutosave) {
    cancelProjectIoAutosavePending(App, reportNonFatal);
    return;
  }

  try {
    if (flushAutosavePendingViaService(App)) return;
  } catch (err) {
    reportNonFatal('project.load.flushAutosaveBeforePreservedLoad', err, 6000);
  }

  cancelProjectIoAutosavePending(App, reportNonFatal);
}

export function refreshProjectIoAutosaveAfterLoad(args: ProjectIoAutosaveRefreshArgs): void {
  const { App, restoreGen, isHistoryApply, isModelApply, isCloudApply, preserveAutosave, reportNonFatal } =
    args;
  if (preserveAutosave || isHistoryApply || isModelApply || isCloudApply) return;
  if (!isProjectIoRestoreGenerationCurrent(App, restoreGen)) return;

  try {
    forceAutosaveNowViaService(App);
  } catch (err) {
    reportNonFatal('project.load.refreshAutosave', err, 6000);
  }
}
