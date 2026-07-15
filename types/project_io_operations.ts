import type { AsyncOperationHandle } from './async_operation';
import type { ProjectLoadInputLike, ProjectLoadOpts } from './build_state';

export type ProjectLoadFailureReason =
  'missing-file' | 'invalid' | 'not-installed' | 'superseded' | 'busy' | 'error';

export type ProjectLoadWarningEffect =
  'edit-modes' | 'autosave-finalize' | 'autosave-refresh' | 'notes' | 'build' | 'post-effects-superseded';

export type ProjectLoadWarning = {
  effect: ProjectLoadWarningEffect;
  message: string;
};

export type ProjectLoadSuccessResult = {
  ok: true;
  restoreGen?: number | undefined;
  warnings?: ProjectLoadWarning[] | undefined;
};

export type ProjectLoadFailureResult = {
  ok: false;
  reason: ProjectLoadFailureReason;
  message?: string;
  restoreGen?: number | undefined;
};

export type ProjectLoadTerminalResult = ProjectLoadSuccessResult | ProjectLoadFailureResult;
export type ProjectLoadAcceptedResult = AsyncOperationHandle<ProjectLoadTerminalResult>;
export type ProjectLoadActionResult = ProjectLoadTerminalResult | ProjectLoadAcceptedResult;

export type ProjectLoadFailFastOpts = Omit<ProjectLoadOpts, 'queueIfBusy'> & {
  queueIfBusy?: false;
};

export type ProjectLoadActionFn = (
  data: ProjectLoadInputLike,
  opts?: ProjectLoadOpts
) => ProjectLoadActionResult;

export type ProjectLoadFailFastFn = (
  data: ProjectLoadInputLike,
  opts?: ProjectLoadFailFastOpts
) => ProjectLoadTerminalResult;

export type ProjectRecoverySuccessResult = {
  ok: true;
  restoreGen?: number | undefined;
  warnings?: ProjectLoadWarning[] | undefined;
};

export type ProjectRestoreFailureReason =
  'busy' | 'cancelled' | 'missing-autosave' | 'invalid' | 'not-installed' | 'superseded' | 'error';

export type ProjectResetDefaultFailureReason =
  'busy' | 'cancelled' | 'invalid' | 'not-installed' | 'superseded' | 'error';

export type ProjectRestoreFailureResult = {
  ok: false;
  reason: ProjectRestoreFailureReason;
  message?: string;
};

export type ProjectResetDefaultFailureResult = {
  ok: false;
  reason: ProjectResetDefaultFailureReason;
  message?: string;
};

export type ProjectRestoreActionResult = ProjectRecoverySuccessResult | ProjectRestoreFailureResult;
export type ProjectResetDefaultActionResult = ProjectRecoverySuccessResult | ProjectResetDefaultFailureResult;
