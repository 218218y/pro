// WardrobePro Project I/O (Native ESM)
//
// Canonical owner file:
// - installs ProjectIO service onto App.services.projectIO
// - owns schema/version tagging
// - delegates browser/UI bridge + runtime orchestration to helper factories
// - exports stable service wrappers

import type {
  AppContainer,
  ProjectExportResultLike,
  ProjectIoServiceLike,
  ProjectLoadInputLike,
  ProjectLoadOpts,
  UnknownRecord,
} from '../../../types/index.js';

import { reportErrorThrottled } from '../runtime/api.js';
import { hasCallableContract } from '../runtime/install_idempotency_patterns.js';
import { ensureProjectIoService, getProjectIoServiceMaybe } from '../runtime/project_io_access.js';
import { setBuildTag } from '../runtime/build_info_access.js';
import { PROJECT_SCHEMA_ID, PROJECT_SCHEMA_VERSION } from './project_schema.js';
import { createProjectIoFeedbackBridge } from './project_io_feedback_bridge.js';
import { createProjectIoOrchestrator } from './project_io_orchestrator.js';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readOptionsRecord(options: unknown): UnknownRecord {
  return isRecord(options) ? { ...options } : {};
}

function projectIoHasRuntimeContract(value: ProjectIoServiceLike): boolean {
  return hasCallableContract<ProjectIoServiceLike>(value, [
    'exportCurrentProject',
    'handleFileLoad',
    'loadProjectData',
    'buildDefaultProjectData',
    'restoreLastSession',
  ]);
}

function isProjectIoRuntimeContract(value: unknown): value is ProjectIoServiceLike {
  return hasCallableContract<ProjectIoServiceLike>(value, [
    'exportCurrentProject',
    'handleFileLoad',
    'loadProjectData',
    'buildDefaultProjectData',
    'restoreLastSession',
  ]);
}

function __projectIoReportNonFatal(
  App: AppContainer | null | undefined,
  op: string,
  err: unknown,
  throttleMs = 4000
): void {
  try {
    reportErrorThrottled(App, err, {
      where: 'project_io',
      op,
      throttleMs,
    });
  } catch {
    // ignore
  }

  try {
    console.warn('[WardrobePro][project_io]', op, err);
  } catch {
    // ignore
  }
}

/**
 * @param {AppContainer} App
 * @param {UnknownRecord} [options]
 * @returns {ProjectIoServiceLike|null}
 */
export function installProjectIo(
  App: AppContainer,
  options: UnknownRecord | undefined = undefined
): ProjectIoServiceLike | null {
  const opts = readOptionsRecord(options);
  if (!App || typeof App !== 'object') return null;

  const ProjectIO = ensureProjectIoService(App);
  const hasCanonicalRuntime = projectIoHasRuntimeContract(ProjectIO);

  try {
    setBuildTag(App, 'projectIO', 'stage3_orchestration_cleanup');
  } catch (err) {
    __projectIoReportNonFatal(App, 'services.buildInfo.projectIO', err);
  }

  ProjectIO.SCHEMA_ID = PROJECT_SCHEMA_ID;
  ProjectIO.SCHEMA_VERSION = PROJECT_SCHEMA_VERSION;

  if (!hasCanonicalRuntime) {
    const bridge = createProjectIoFeedbackBridge(App, opts, (op, err, throttleMs) =>
      __projectIoReportNonFatal(App, op, err, throttleMs)
    );

    const runtime = createProjectIoOrchestrator({
      App,
      showToast: bridge.showToast,
      openCustomConfirm: bridge.openCustomConfirm,
      userAgent: bridge.userAgent,
      schemaId: PROJECT_SCHEMA_ID,
      schemaVersion: PROJECT_SCHEMA_VERSION,
      reportNonFatal: (op, err, throttleMs) => __projectIoReportNonFatal(App, op, err, throttleMs),
    });

    ProjectIO.exportCurrentProject = ProjectIO.exportCurrentProject || runtime.exportCurrentProject;
    ProjectIO.handleFileLoad = ProjectIO.handleFileLoad || runtime.handleFileLoad;
    ProjectIO.loadProjectData = ProjectIO.loadProjectData || runtime.loadProjectData;
    ProjectIO.buildDefaultProjectData = ProjectIO.buildDefaultProjectData || runtime.buildDefaultProjectData;
    ProjectIO.restoreLastSession = ProjectIO.restoreLastSession || runtime.restoreLastSession;
  }

  return ProjectIO;
}

export function ensureProjectIoInstalled(App: AppContainer): ProjectIoServiceLike {
  installProjectIo(App);
  const api = getProjectIoServiceMaybe(App) || undefined;
  if (!isProjectIoRuntimeContract(api)) {
    throw new Error('[WardrobePro][ESM] ProjectIO is not installed');
  }
  return api;
}

export function exportCurrentProject(
  App: AppContainer,
  meta?: UnknownRecord | null
): ProjectExportResultLike | null | undefined {
  const api = ensureProjectIoInstalled(App);
  return typeof api.exportCurrentProject === 'function'
    ? api.exportCurrentProject(meta ?? undefined)
    : undefined;
}

/**
 * @param {AppContainer} App
 * @param {unknown} eventOrFile
 * @returns {unknown}
 */
export function handleFileLoad(App: AppContainer, eventOrFile: unknown) {
  const api = ensureProjectIoInstalled(App);
  return typeof api.handleFileLoad === 'function' ? api.handleFileLoad(eventOrFile) : undefined;
}

/**
 * @param {AppContainer} App
 * @param {ProjectLoadInputLike} data
 * @param {ProjectLoadOpts} [opts]
 * @returns {unknown}
 */
export function loadProjectData(App: AppContainer, data: ProjectLoadInputLike, opts?: ProjectLoadOpts) {
  const api = ensureProjectIoInstalled(App);
  return typeof api.loadProjectData === 'function' ? api.loadProjectData(data, opts) : undefined;
}

export function restoreLastSession(App: AppContainer) {
  const api = ensureProjectIoInstalled(App);
  return typeof api.restoreLastSession === 'function' ? api.restoreLastSession() : undefined;
}

export function buildDefaultProjectData(App: AppContainer) {
  const api = ensureProjectIoInstalled(App);
  return typeof api.buildDefaultProjectData === 'function' ? api.buildDefaultProjectData() : undefined;
}
