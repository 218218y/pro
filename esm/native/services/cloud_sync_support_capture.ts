import type { AppContainer } from '../../../types';

import { cloneProjectJson } from '../features/project_config/project_config_persisted_payload_shared.js';
import { readUiStateFromStore } from '../runtime/root_state_access.js';
import { getStoreSurfaceMaybe } from '../runtime/store_surface_access.js';
import { captureProjectSnapshotMaybe } from '../runtime/project_capture_access.js';
import { exportProjectResultViaService } from '../runtime/project_io_access.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support_feedback.js';
import {
  asRecord,
  asUiState,
  hashString32,
  stableSerializeCloudSyncValue,
} from './cloud_sync_support_shared.js';

export function captureSketchSnapshot(
  App: AppContainer
): { data: unknown; jsonStr: string; hash: string } | null {
  try {
    const exportResult = exportProjectResultViaService(
      App,
      { source: 'cloudSketch.capture' },
      '[WardrobePro] Cloud sketch export failed.'
    );
    if ('reason' in exportResult) {
      if (exportResult.reason !== 'not-installed') {
        _cloudSyncReportNonFatal(
          App,
          'captureSketchSnapshot.projectIoExport',
          new Error(exportResult.message || 'Project export unavailable'),
          { throttleMs: 6000 }
        );
        return null;
      }
    } else {
      const ex = exportResult.exported;
      if (ex.projectData)
        return { data: ex.projectData, jsonStr: ex.jsonStr, hash: hashString32(ex.jsonStr) };
      _cloudSyncReportNonFatal(
        App,
        'captureSketchSnapshot.projectIoInvalid',
        new Error('projectData missing'),
        { throttleMs: 6000 }
      );
      return null;
    }

    const rawData = captureProjectSnapshotMaybe(App, 'persist');
    if (!rawData) return null;
    const data = cloneProjectJson(rawData);
    const dataRec = asRecord(data);
    if (!dataRec) {
      _cloudSyncReportNonFatal(
        App,
        'captureSketchSnapshot.captureInvalid',
        new Error('Project capture snapshot is not serializable'),
        { throttleMs: 6000 }
      );
      return null;
    }

    try {
      const store = getStoreSurfaceMaybe(App);
      const ui = store ? asUiState(readUiStateFromStore(store)) : null;
      if (ui) {
        const draft = ui.orderPdfEditorDraft;
        const zoom = Number(ui.orderPdfEditorZoom);
        if (typeof draft !== 'undefined') {
          const clonedDraft = cloneProjectJson(draft);
          if (clonedDraft !== null || draft === null) dataRec.orderPdfEditorDraft = clonedDraft;
        }
        if (Number.isFinite(zoom) && zoom > 0) dataRec.orderPdfEditorZoom = zoom;
      }
    } catch (e) {
      _cloudSyncReportNonFatal(App, 'captureSketchSnapshot.includePdfDraft', e, { throttleMs: 8000 });
    }

    const fallbackJsonStr = stableSerializeCloudSyncValue(dataRec);
    return { data: dataRec, jsonStr: fallbackJsonStr, hash: hashString32(fallbackJsonStr) };
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'captureSketchSnapshot.outer', e, { throttleMs: 6000 });
    return null;
  }
}
