import type { ProjectExportResultLike, UnknownRecord } from '../../../types/index.js';

import { buildDefaultProjectDataSnapshot, finalizeProjectForSavePayload } from './project_io_save_helpers.js';
import { createDefaultState } from '../runtime/default_state.js';
import { getBuildTagsSnapshot } from '../runtime/build_info_access.js';
import { captureProjectSnapshotMaybe } from '../runtime/project_capture_access.js';
import {
  buildProjectExportResult,
  type ProjectIoOwnerDeps,
  type ProjectIoRecordReader,
} from './project_io_orchestrator_shared.js';

export function createProjectIoExportOps(
  deps: ProjectIoOwnerDeps & { readUiStateRecord: ProjectIoRecordReader }
) {
  const { App, reportNonFatal, deepCloneJson, getProjectNameFromState, getHistorySystem, readUiStateRecord } =
    deps;

  function finalizeProjectForSave(projectData: UnknownRecord | null | undefined) {
    return finalizeProjectForSavePayload(projectData, {
      schemaId: deps.schemaId,
      schemaVersion: deps.schemaVersion,
      buildTags: getBuildTagsSnapshot(App),
      userAgent: deps.userAgent,
      cloneJson: deepCloneJson,
      reportNonFatal,
    });
  }

  function exportCurrentProject(meta: UnknownRecord | null | undefined): ProjectExportResultLike | null {
    const safeMeta = meta && typeof meta === 'object' ? meta : {};
    try {
      const projectName = getProjectNameFromState();
      const defaultBaseName = (
        projectName ? projectName : 'wardrobe_project_' + new Date().toISOString().slice(0, 10)
      ).trim();

      const projectDataRaw =
        captureProjectSnapshotMaybe(App, 'persist') ||
        (() => {
          try {
            const historySystem = getHistorySystem();
            if (historySystem && typeof historySystem.getCurrentSnapshot === 'function') {
              return JSON.parse(historySystem.getCurrentSnapshot());
            }
          } catch (err) {
            reportNonFatal('project.export.historySnapshot', err);
          }
          return null;
        })();

      const projectData = finalizeProjectForSave(projectDataRaw);
      if (!projectData || !projectData.settings) throw new Error('Project capture unavailable');

      projectData.version = projectData.version || '1.8-step7';
      projectData.format = projectData.format || 'step7';
      projectData.projectName = projectData.projectName || projectName;
      projectData.timestamp = Date.now();

      try {
        const uiNow = readUiStateRecord(App);
        if (uiNow) {
          const draft = uiNow.orderPdfEditorDraft;
          const zoom = Number(uiNow.orderPdfEditorZoom);
          if (typeof draft !== 'undefined') projectData.orderPdfEditorDraft = deepCloneJson(draft);
          if (Number.isFinite(zoom) && zoom > 0) projectData.orderPdfEditorZoom = zoom;
        }
      } catch (err) {
        reportNonFatal('project.export.orderPdfDraft', err);
      }

      return buildProjectExportResult({
        projectData,
        jsonStr: JSON.stringify(projectData, null, 2),
        defaultBaseName,
        projectName,
        meta: safeMeta,
      });
    } catch (err) {
      try {
        console.error('[projectIO.exportCurrentProject] failed', err);
      } catch (consoleErr) {
        reportNonFatal('project.export.console', consoleErr);
      }
      return null;
    }
  }

  function buildDefaultProjectData(): UnknownRecord {
    return buildDefaultProjectDataSnapshot(deps.asRecord(createDefaultState()) || {});
  }

  return {
    exportCurrentProject,
    buildDefaultProjectData,
  };
}
