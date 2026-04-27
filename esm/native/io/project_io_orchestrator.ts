import type {
  ActionMetaLike,
  ProjectLoadInputLike,
  ProjectLoadOpts,
  UnknownRecord,
} from '../../../types/index.js';

import { getHistorySystemMaybe } from '../runtime/history_system_access.js';
import { metaRestore, metaUiOnly } from '../runtime/meta_profiles_access.js';
import { setRuntimeRestoring } from '../services/api.js';
import { logViaPlatform } from '../runtime/platform_access.js';
import {
  asProjectIoRecord as asRecord,
  mergeProjectIoSourceMeta,
  readHistorySystemRecord as readHistorySystem,
  readProjectIoUiState as readUiStateRecord,
  type HistorySystemLike,
  type ProjectIoOwnerDeps,
  type ProjectIoRuntimeContext,
} from './project_io_orchestrator_shared.js';
import { deepCloneProjectJson } from './project_schema_shared.js';
import { cloneProjectJson as cloneProjectJsonSafe } from './project_payload_shared.js';
import { createProjectIoLoadOps } from './project_io_orchestrator_load_ops.js';
import { createProjectIoExportOps } from './project_io_orchestrator_export_ops.js';
export { resolveProjectFileLoadInput } from './project_file_input_resolver.js';

export function createProjectIoOrchestrator(ctx: ProjectIoRuntimeContext) {
  const App = ctx.App;

  function buildMetaRestore(source: string, meta?: ActionMetaLike | UnknownRecord): ActionMetaLike {
    return metaRestore(App, mergeProjectIoSourceMeta(source, meta), source);
  }

  function buildMetaUiOnly(source: string, meta?: ActionMetaLike | UnknownRecord): ActionMetaLike {
    return metaUiOnly(App, mergeProjectIoSourceMeta(source, meta), source);
  }

  function setProjectIoRestoring(on: boolean, meta: ActionMetaLike): void {
    setRuntimeRestoring(App, on, meta);
  }

  function getHistorySystem(): HistorySystemLike | null {
    try {
      return readHistorySystem(getHistorySystemMaybe(App));
    } catch (err) {
      ctx.reportNonFatal('getHistorySystem', err);
      return null;
    }
  }

  function deepCloneJson<T = unknown>(obj: T): T {
    try {
      const cloned = deepCloneProjectJson(obj) as T;
      JSON.stringify(cloned);
      return cloned;
    } catch (err) {
      ctx.reportNonFatal('project.deepCloneJson', err, 10000);
      return cloneProjectJsonSafe(obj) as T;
    }
  }

  function getProjectNameFromState() {
    try {
      const ui = readUiStateRecord(App);
      const pn = ui.projectName;
      const name = typeof pn === 'string' ? pn.trim() : '';
      return name || '';
    } catch (err) {
      ctx.reportNonFatal('projectName.readUiState', err, 6000);
      return '';
    }
  }

  function log(message: string): void {
    logViaPlatform(App, message);
  }

  const deps: ProjectIoOwnerDeps = {
    ...ctx,
    metaRestore: buildMetaRestore,
    metaUiOnly: buildMetaUiOnly,
    setProjectIoRestoring,
    getHistorySystem,
    deepCloneJson,
    getProjectNameFromState,
    asRecord,
    log,
  };

  const loadOps = createProjectIoLoadOps(deps);
  const exportOps = createProjectIoExportOps({
    ...deps,
    readUiStateRecord,
  });

  function handleFileLoad(eventOrFile: unknown) {
    return loadOps.handleFileLoad(eventOrFile);
  }

  function loadProjectData(input: ProjectLoadInputLike, options?: ProjectLoadOpts) {
    return loadOps.loadProjectData(input, options);
  }

  function restoreLastSession() {
    return loadOps.restoreLastSession();
  }

  function exportCurrentProject(meta: UnknownRecord | null | undefined) {
    return exportOps.exportCurrentProject(meta);
  }

  function buildDefaultProjectData() {
    return exportOps.buildDefaultProjectData();
  }

  return {
    handleFileLoad,
    loadProjectData,
    restoreLastSession,
    exportCurrentProject,
    buildDefaultProjectData,
  };
}
