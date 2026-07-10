import type { AppContainer } from '../../../../types/app.js';
import { getUi } from '../store_access.js';
import { getRoomDesignServiceMaybe } from '../../services/api.js';
import { asRecord, callFn, getArrayProp, getFn } from './export_canvas_core_shared.js';
import { _exportReportThrottled } from './export_canvas_core_feedback.js';

const EXPORT_WALL_COLOR_BLUE_FALLBACK = '#e3f2fd';

function getPreferredExportWallColor(App: AppContainer): string {
  try {
    const rd = asRecord(getRoomDesignServiceMaybe(App));
    const colors = getArrayProp(rd, 'WALL_COLORS');
    for (const item of colors) {
      const rec = asRecord(item);
      const id = typeof rec.id === 'string' ? rec.id.trim().toLowerCase() : '';
      const name = typeof rec.name === 'string' ? rec.name.trim() : '';
      const rawColor = rec.val || rec.color;
      const val = typeof rawColor === 'string' ? rawColor.trim() : '';
      if (!val) continue;
      if (id === 'blue' || name === 'תכלת עדין') return val;
    }
  } catch (e) {
    _exportReportThrottled(App, 'getPreferredExportWallColor.readPalette', e, { throttleMs: 2000 });
  }
  return EXPORT_WALL_COLOR_BLUE_FALLBACK;
}

function getCurrentWallColorForExportRestore(App: AppContainer): string | null {
  try {
    const ui = asRecord(getUi(App));
    const rawColor = ui?.['lastSelectedWallColor'];
    const v = typeof rawColor === 'string' ? rawColor.trim() : '';
    if (v) return v;
  } catch (e) {
    _exportReportThrottled(App, 'getCurrentWallColorForExportRestore.ui', e, { throttleMs: 2000 });
  }
  try {
    const rd = asRecord(getRoomDesignServiceMaybe(App));
    const rawColor = rd.DEFAULT_WALL_COLOR;
    const v = typeof rawColor === 'string' ? rawColor.trim() : '';
    if (v) return v;
  } catch (e) {
    _exportReportThrottled(App, 'getCurrentWallColorForExportRestore.roomDesign', e, { throttleMs: 2000 });
  }
  return null;
}

function applyRoomWallColor(App: AppContainer, wallColor: string): boolean {
  try {
    const rd = asRecord(getRoomDesignServiceMaybe(App));
    if (!getFn(rd, 'updateRoomWall')) return false;
    callFn(rd, 'updateRoomWall', wallColor, {
      force: true,
      source: 'export:wallColorOverride',
    });
    return true;
  } catch (e) {
    _exportReportThrottled(App, 'applyRoomWallColor', e, { throttleMs: 1500 });
    return false;
  }
}

export function applyExportWallColorOverride(App: AppContainer): () => void {
  const desired = getPreferredExportWallColor(App);
  const original = getCurrentWallColorForExportRestore(App);

  if (original && original.trim().toLowerCase() === desired.trim().toLowerCase()) {
    return () => {};
  }

  const changed = applyRoomWallColor(App, desired);
  return () => {
    if (!changed) return;
    const restoreTo = (original && original.trim()) || getCurrentWallColorForExportRestore(App) || desired;
    try {
      applyRoomWallColor(App, restoreTo);
    } catch (e) {
      _exportReportThrottled(App, 'applyExportWallColorOverride.restore', e, { throttleMs: 2000 });
    }
  };
}
