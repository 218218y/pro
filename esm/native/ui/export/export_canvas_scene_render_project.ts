import type { AppContainer } from '../../../../types/app.js';
import { asRecord } from './export_canvas_core_shared.js';
import { _exportReportThrottled } from './export_canvas_core_feedback.js';
import { getUi } from '../store_access.js';

export function getProjectNameForExport(App: AppContainer): string {
  try {
    const ui = asRecord(getUi(App));
    const n = ui && typeof ui.projectName === 'string' ? String(ui.projectName || '').trim() : '';
    if (n) return n;
  } catch (e) {
    _exportReportThrottled(App, 'getProjectName.uiState', e, { throttleMs: 2000 });
  }
  return '';
}
