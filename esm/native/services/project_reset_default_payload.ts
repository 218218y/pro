import type { AppContainer, ProjectDataLike, ProjectLoadOpts } from '../../../types';

import {
  buildDefaultProjectDataViaService,
  getProjectIoBuildDefaultProjectDataFn,
} from '../runtime/project_io_access.js';
import {
  buildProjectResetDefaultActionErrorResult,
  buildProjectResetDefaultFailureResult,
  type ProjectResetDefaultFailureResult,
} from '../runtime/project_recovery_action_result.js';
import { normalizeResetDefaultProjectStructureInPlace } from '../io/project_payload_canonical.js';
import { cloneProjectJson, isObjectRecord } from '../io/project_payload_shared.js';

function cloneJsonProjectData(value: ProjectDataLike): ProjectDataLike & Record<string, unknown> {
  const cloned = cloneProjectJson(value);
  return isObjectRecord(cloned) ? (cloned as ProjectDataLike & Record<string, unknown>) : {};
}

export function normalizeResetDefaultProjectData(
  data: ProjectDataLike | null | undefined
): ProjectDataLike | null {
  if (!data || typeof data !== 'object') return null;

  const next = cloneJsonProjectData(data);
  normalizeResetDefaultProjectStructureInPlace(next);
  return next;
}

export function buildResetDefaultProjectData(App: AppContainer): ProjectDataLike | null {
  return normalizeResetDefaultProjectData(buildDefaultProjectDataViaService(App));
}

export type ResetDefaultProjectPayloadReadResult =
  | { ok: true; data: ProjectDataLike; opts: ProjectLoadOpts }
  | ProjectResetDefaultFailureResult;

export function buildResetDefaultProjectLoadOpts(opts?: ProjectLoadOpts | null): ProjectLoadOpts {
  const nextMeta = opts?.meta && typeof opts.meta === 'object' ? { ...opts.meta } : {};
  if (typeof nextMeta.source !== 'string' || !nextMeta.source.trim())
    nextMeta.source = 'react:header:resetDefault';
  return {
    ...(opts && typeof opts === 'object' ? opts : {}),
    toast: typeof opts?.toast === 'boolean' ? opts.toast : false,
    toastMessage:
      typeof opts?.toastMessage === 'string' && opts.toastMessage.trim()
        ? opts.toastMessage
        : 'הארון אופס לברירת המחדל',
    meta: nextMeta,
  };
}

export function readResetDefaultProjectPayload(
  App: AppContainer,
  opts?: ProjectLoadOpts | null
): ResetDefaultProjectPayloadReadResult {
  const buildDefaultProjectData = getProjectIoBuildDefaultProjectDataFn(App);
  if (typeof buildDefaultProjectData !== 'function')
    return buildProjectResetDefaultFailureResult('not-installed');

  let payload: ProjectDataLike | null;
  try {
    payload = normalizeResetDefaultProjectData(buildDefaultProjectData());
  } catch (error) {
    return buildProjectResetDefaultActionErrorResult(
      error,
      '[WardrobePro] Failed building the default project.'
    );
  }
  if (!payload) return buildProjectResetDefaultFailureResult('invalid');

  return {
    ok: true,
    data: payload,
    opts: buildResetDefaultProjectLoadOpts(opts),
  };
}
