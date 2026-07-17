import type { AppContainer, AutosaveRefreshResult, AutosaveSuspensionLike } from '../../../types/index.js';

import {
  forceAutosaveNowResultViaService,
  suspendAutosaveViaServiceOrThrow,
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

export function suspendProjectIoAutosaveBeforeLoad(App: AppContainer): AutosaveSuspensionLike {
  return suspendAutosaveViaServiceOrThrow(App);
}

export function refreshProjectIoAutosaveAfterLoad(args: ProjectIoAutosaveRefreshArgs): AutosaveRefreshResult {
  const { App, restoreGen, isHistoryApply, isModelApply, isCloudApply, preserveAutosave, reportNonFatal } =
    args;
  if (preserveAutosave || isHistoryApply || isModelApply || isCloudApply) return { ok: true };
  if (!isProjectIoRestoreGenerationCurrent(App, restoreGen)) {
    return { ok: false, reason: 'stale-restore-generation' };
  }

  try {
    return forceAutosaveNowResultViaService(App);
  } catch (err) {
    reportNonFatal('project.load.refreshAutosave', err, 6000);
    return { ok: false, reason: 'owner-rejected' };
  }
}
