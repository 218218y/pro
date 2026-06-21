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
import { ensureProjectIoService } from '../runtime/project_io_access.js';
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

type ProjectIoRuntimeMethods = ReturnType<typeof createProjectIoOrchestrator>;
type InstalledProjectIoService = Omit<ProjectIoServiceLike, keyof ProjectIoRuntimeMethods> &
  ProjectIoRuntimeMethods;

const installedRuntimes = new WeakMap<
  ProjectIoServiceLike,
  { app: AppContainer; runtime: ProjectIoRuntimeMethods }
>();

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
    // Reporting must never make Project I/O recovery fail.
  }
}

/**
 * @param {AppContainer} App
 * @param {UnknownRecord} [options]
 * @returns {InstalledProjectIoService}
 */
export function installProjectIo(
  App: AppContainer,
  options: UnknownRecord | undefined = undefined
): InstalledProjectIoService {
  const opts = readOptionsRecord(options);
  if (!App || typeof App !== 'object') {
    throw new Error('[WardrobePro][ProjectIO] App container is required.');
  }

  const ProjectIO = ensureProjectIoService(App);

  try {
    setBuildTag(App, 'projectIO', 'canonical_v3_runtime');
  } catch (err) {
    __projectIoReportNonFatal(App, 'services.buildInfo.projectIO', err);
  }

  const installed = installedRuntimes.get(ProjectIO);
  const runtime =
    installed?.app === App
      ? installed.runtime
      : (() => {
          const bridge = createProjectIoFeedbackBridge(App, opts, (op, err, throttleMs) =>
            __projectIoReportNonFatal(App, op, err, throttleMs)
          );

          return createProjectIoOrchestrator({
            App,
            showToast: bridge.showToast,
            openCustomConfirm: bridge.openCustomConfirm,
            userAgent: bridge.userAgent,
            schemaId: PROJECT_SCHEMA_ID,
            schemaVersion: PROJECT_SCHEMA_VERSION,
            reportNonFatal: (op, err, throttleMs) => __projectIoReportNonFatal(App, op, err, throttleMs),
          });
        })();

  Object.assign(ProjectIO, {
    SCHEMA_ID: PROJECT_SCHEMA_ID,
    SCHEMA_VERSION: PROJECT_SCHEMA_VERSION,
    exportCurrentProject: runtime.exportCurrentProject,
    handleFileLoad: runtime.handleFileLoad,
    loadProjectData: runtime.loadProjectData,
    buildDefaultProjectData: runtime.buildDefaultProjectData,
    restoreLastSession: runtime.restoreLastSession,
  });
  installedRuntimes.set(ProjectIO, { app: App, runtime });

  return ProjectIO as InstalledProjectIoService;
}

export function ensureProjectIoInstalled(App: AppContainer): InstalledProjectIoService {
  return installProjectIo(App);
}

export function exportCurrentProject(
  App: AppContainer,
  meta?: UnknownRecord | null
): ProjectExportResultLike | null {
  const api = ensureProjectIoInstalled(App);
  return api.exportCurrentProject(meta ?? undefined);
}

/**
 * @param {AppContainer} App
 * @param {unknown} eventOrFile
 * @returns {unknown}
 */
export function handleFileLoad(App: AppContainer, eventOrFile: unknown) {
  return ensureProjectIoInstalled(App).handleFileLoad(eventOrFile);
}

/**
 * @param {AppContainer} App
 * @param {ProjectLoadInputLike} data
 * @param {ProjectLoadOpts} [opts]
 * @returns {unknown}
 */
export function loadProjectData(App: AppContainer, data: ProjectLoadInputLike, opts?: ProjectLoadOpts) {
  return ensureProjectIoInstalled(App).loadProjectData(data, opts);
}

export function restoreLastSession(App: AppContainer) {
  return ensureProjectIoInstalled(App).restoreLastSession();
}

export function buildDefaultProjectData(App: AppContainer) {
  return ensureProjectIoInstalled(App).buildDefaultProjectData();
}
