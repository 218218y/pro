import type { AppContainer } from '../../../../types/app.js';
import { readRuntimeScalarOrDefaultFromApp, applyViewportSketchMode } from '../../services/api.js';
import { _exportReportThrottled } from './export_canvas_core_feedback.js';

export function refreshSceneAndRebuildForExport(App: AppContainer): void {
  try {
    applyViewportSketchMode(App, !!readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false), {
      source: 'export:refreshScene',
      rebuild: true,
      updateShadows: false,
      forceSync: true,
      reason: 'export:refreshSceneAndRebuild',
    });
  } catch (e) {
    _exportReportThrottled(App, 'refreshSceneAndRebuild.viewport', e, { throttleMs: 1000 });
  }
}
