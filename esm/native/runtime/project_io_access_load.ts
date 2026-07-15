import type {
  ProjectDataLike,
  ProjectExportResultLike,
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
} from './project_load_action_result.js';
import { asRecord } from './record.js';
import {
  buildProjectIoLoadFailureMessage,
  getProjectIoServiceMaybe,
  reportProjectIoAccessNonFatal,
  normalizeProjectLoadActionResultViaProjectIo,
} from './project_io_access_shared.js';

type ProjectIoLoadDataFn = (data: ProjectLoadInputLike, opts?: ProjectLoadOpts) => unknown;
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
    return normalizeProjectLoadActionResultViaProjectIo(loadProjectData(data, opts), defaultReason);
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
