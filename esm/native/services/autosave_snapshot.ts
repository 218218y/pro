import { readRootState } from '../runtime/root_state_access.js';
import { getHistorySystemMaybe } from '../runtime/history_system_access.js';
import { getProjectCaptureServiceMaybe } from '../runtime/project_capture_access.js';
import { asRecord } from '../runtime/record.js';

import { deepCloneJson, isAutosaveSnapshotLike, isHistorySnapshotSourceLike } from './autosave_shared.js';

import type { AppContainer, AutosaveSnapshotLike } from '../../../types';
import type { HistorySnapshotSourceLike } from './autosave_shared.js';

export function attachPdfEditorDraft(App: AppContainer, snap: AutosaveSnapshotLike): void {
  const st = readRootState(App);
  const ui = asRecord(st && typeof st.ui === 'object' ? st.ui : null);
  if (!ui) return;

  const draft = ui['orderPdfEditorDraft'];
  const zoom = Number(ui['orderPdfEditorZoom']);
  if (typeof draft !== 'undefined') snap.orderPdfEditorDraft = deepCloneJson(draft);
  if (Number.isFinite(zoom) && zoom > 0) snap.orderPdfEditorZoom = zoom;
}

export function getHistorySystem(App: AppContainer): HistorySnapshotSourceLike | null {
  const hs = getHistorySystemMaybe(App);
  return isHistorySnapshotSourceLike(hs) ? hs : null;
}

export function captureAutosaveSnapshot(App: AppContainer): AutosaveSnapshotLike | null {
  try {
    const proj = getProjectCaptureServiceMaybe(App);
    if (proj && typeof proj.capture === 'function') {
      const snap = proj.capture('persist');
      const snapRec = isAutosaveSnapshotLike(snap) ? snap : null;
      if (snapRec) attachPdfEditorDraft(App, snapRec);
      return snapRec;
    }
  } catch {
    // ignore
  }

  try {
    const historySystem = getHistorySystem(App);
    if (historySystem && typeof historySystem.getCurrentSnapshot === 'function') {
      const parsed = JSON.parse(historySystem.getCurrentSnapshot());
      const snapRec = isAutosaveSnapshotLike(parsed) ? parsed : null;
      if (snapRec) attachPdfEditorDraft(App, snapRec);
      return snapRec;
    }
  } catch {
    // ignore
  }

  return null;
}
