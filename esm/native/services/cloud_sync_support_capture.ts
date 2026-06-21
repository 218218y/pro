import type { AppContainer } from '../../../types';

import { exportProjectResultViaService } from '../runtime/project_io_access.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support_feedback.js';
import { hashString32 } from './cloud_sync_support_shared.js';

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
      _cloudSyncReportNonFatal(
        App,
        'captureSketchSnapshot.projectIoExport',
        new Error(exportResult.message || `ProjectIO export unavailable: ${exportResult.reason}`),
        { throttleMs: 6000 }
      );
      return null;
    }

    const ex = exportResult.exported;
    if (!ex.projectData) {
      _cloudSyncReportNonFatal(
        App,
        'captureSketchSnapshot.projectIoInvalid',
        new Error('ProjectIO export is missing projectData'),
        { throttleMs: 6000 }
      );
      return null;
    }
    return { data: ex.projectData, jsonStr: ex.jsonStr, hash: hashString32(ex.jsonStr) };
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'captureSketchSnapshot.outer', e, { throttleMs: 6000 });
    return null;
  }
}
