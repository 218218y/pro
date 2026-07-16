import type {
  ProjectDataLike,
  ProjectExportResultLike,
  ProjectLoadFailFastOpts,
  ProjectLoadInputLike,
  ProjectLoadOpts,
  UnknownRecord,
} from '../../../types';

import { buildErrorResult as buildNormalizedErrorResult } from './error_normalization.js';
import {
  buildProjectLoadActionErrorResult,
  isProjectLoadAcceptedResult,
  type ProjectLoadActionResult,
  type ProjectLoadFailureReason,
  type ProjectLoadTerminalResult,
} from './project_load_action_result.js';
import { asRecord } from './record.js';
import {
  buildProjectIoLoadFailureMessage,
  getProjectIoServiceMaybe,
  reportProjectIoAccessNonFatal,
} from './project_io_access_shared.js';
import { normalizeProjectLoadActionResult } from './project_load_action_result.js';

type ProjectIoLoadDataFn = (data: ProjectLoadInputLike, opts?: ProjectLoadOpts) => unknown;
type ProjectIoFailFastLoadDataFn = (data: ProjectLoadInputLike, opts?: ProjectLoadFailFastOpts) => unknown;
type ProjectIoBuildDefaultDataFn = () => ProjectDataLike;

export type ProjectExportAccessResult =
  | { ok: true; exported: ProjectExportResultLike }
  | { ok: false; reason: 'not-installed' | 'invalid' | 'error'; message?: string };

export function normalizeProjectExportResult(value: unknown): ProjectExportResultLike | null {
  const rec = asRecord<ProjectExportResultLike>(value);
  if (!rec || typeof rec.jsonStr !== 'string' || !rec.jsonStr.trim()) return null;
  return { ...rec, jsonStr: rec.jsonStr };
}

export function exportProjectResultViaService(
  App: unknown,
  meta?: UnknownRecord | null,
  defaultErrorMessage = '[WardrobePro] Project export failed.'
): ProjectExportAccessResult {
  const svc = getProjectIoServiceMaybe(App);
  const exportCurrentProject =
    svc && typeof svc.exportCurrentProject === 'function' ? svc.exportCurrentProject : null;
  if (typeof exportCurrentProject !== 'function') return { ok: false, reason: 'not-installed' };

  try {
    const exported = normalizeProjectExportResult(exportCurrentProject(meta ?? undefined));
    return exported ? { ok: true, exported } : { ok: false, reason: 'invalid' };
  } catch (error) {
    reportProjectIoAccessNonFatal(App, 'projectIO.exportCurrentProject.resultOwnerRejected', error);
    return buildNormalizedErrorResult('error', error, defaultErrorMessage);
  }
}

function getProjectIoLoadProjectDataFn(App: unknown): ProjectIoLoadDataFn | null {
  const svc = getProjectIoServiceMaybe(App);
  return svc && typeof svc.loadProjectData === 'function' ? svc.loadProjectData : null;
}

function getProjectIoFailFastLoadProjectDataFn(App: unknown): ProjectIoFailFastLoadDataFn | null {
  const svc = getProjectIoServiceMaybe(App);
  return svc && typeof svc.loadProjectDataFailFast === 'function' ? svc.loadProjectDataFailFast : null;
}

export function loadProjectDataActionResultViaService(
  App: unknown,
  data: ProjectLoadInputLike,
  opts?: ProjectLoadOpts,
  defaultReason: ProjectLoadFailureReason = 'not-installed',
  defaultErrorMessage = '[WardrobePro] Project load failed.'
): ProjectLoadActionResult {
  const loadProjectData = getProjectIoLoadProjectDataFn(App);
  if (typeof loadProjectData !== 'function') {
    return { ok: false, reason: 'not-installed' };
  }

  try {
    return normalizeProjectLoadActionResult(loadProjectData(data, opts), defaultReason);
  } catch (error) {
    reportProjectIoAccessNonFatal(App, 'projectIO.loadProjectData.actionOwnerRejected', error);
    return buildProjectLoadActionErrorResult(error, defaultErrorMessage);
  }
}

export function loadProjectDataActionResultViaServiceOrThrow(
  App: unknown,
  data: ProjectLoadInputLike,
  opts?: ProjectLoadOpts,
  defaultReason: ProjectLoadFailureReason = 'not-installed',
  defaultErrorMessage = '[WardrobePro] Project load failed.',
  label = 'projectIO.loadProjectData'
): ProjectLoadActionResult {
  const result = loadProjectDataActionResultViaService(App, data, opts, defaultReason, defaultErrorMessage);
  if (isProjectLoadAcceptedResult(result) || result.ok) return result;
  throw new Error(buildProjectIoLoadFailureMessage(result, label, defaultErrorMessage));
}

export function loadProjectDataFailFastResultViaService(
  App: unknown,
  data: ProjectLoadInputLike,
  opts?: ProjectLoadFailFastOpts,
  defaultReason: ProjectLoadFailureReason = 'not-installed',
  defaultErrorMessage = '[WardrobePro] Project load failed.'
): ProjectLoadTerminalResult {
  const loadProjectDataFailFast = getProjectIoFailFastLoadProjectDataFn(App);
  if (typeof loadProjectDataFailFast !== 'function') {
    return { ok: false, reason: 'not-installed' };
  }

  try {
    const result = normalizeProjectLoadActionResult(
      loadProjectDataFailFast(data, { ...opts, queueIfBusy: false }),
      defaultReason
    );
    if (isProjectLoadAcceptedResult(result)) {
      return buildProjectLoadActionErrorResult(
        new Error('[WardrobePro] Fail-fast Project Load service returned an accepted operation.'),
        defaultErrorMessage
      );
    }
    return result;
  } catch (error) {
    reportProjectIoAccessNonFatal(App, 'projectIO.loadProjectDataFailFast.ownerRejected', error);
    return buildProjectLoadActionErrorResult(error, defaultErrorMessage);
  }
}

export function loadProjectDataFailFastResultViaServiceOrThrow(
  App: unknown,
  data: ProjectLoadInputLike,
  opts?: ProjectLoadFailFastOpts,
  defaultReason: ProjectLoadFailureReason = 'not-installed',
  defaultErrorMessage = '[WardrobePro] Project load failed.',
  label = 'projectIO.loadProjectDataFailFast'
): ProjectLoadTerminalResult {
  const result = loadProjectDataFailFastResultViaService(App, data, opts, defaultReason, defaultErrorMessage);
  if (result.ok) return result;
  throw new Error(buildProjectIoLoadFailureMessage(result, label, defaultErrorMessage));
}

function getProjectIoBuildDefaultProjectDataFn(App: unknown): ProjectIoBuildDefaultDataFn | null {
  const svc = getProjectIoServiceMaybe(App);
  return svc && typeof svc.buildDefaultProjectData === 'function' ? svc.buildDefaultProjectData : null;
}

export function buildDefaultProjectDataViaServiceOrThrow(
  App: unknown,
  label = 'projectIO.buildDefaultProjectData'
): ProjectDataLike {
  const buildDefaultProjectData = getProjectIoBuildDefaultProjectDataFn(App);
  if (typeof buildDefaultProjectData !== 'function') {
    throw new Error(`[WardrobePro] ${label} is not installed.`);
  }
  return buildDefaultProjectData();
}
