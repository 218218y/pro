import type { ProjectDataLike, UnknownRecord } from '../../../types/index.js';

import type { EnsureSettingsRecordFn, EnsureTogglesRecordFn } from './project_schema_migrations_shared.js';

export function normalizeToggleDefaults(
  data: ProjectDataLike,
  ensureTogglesRecord: EnsureTogglesRecordFn
): void {
  try {
    const toggles = ensureTogglesRecord(data);
    const showContents = !!toggles.showContents;
    const showHanger = typeof toggles.showHanger !== 'undefined' ? toggles.showHanger : undefined;
    const showDimensions = typeof toggles.showDimensions !== 'undefined' ? toggles.showDimensions : undefined;
    const globalClickMode =
      typeof toggles.globalClickMode !== 'undefined' ? !!toggles.globalClickMode : undefined;

    if (!showContents && showHanger === false) toggles.showHanger = true;
    if (showContents && showHanger === true) toggles.showHanger = false;

    if (!showContents && showHanger === false && showDimensions === false) {
      toggles.showHanger = true;
      toggles.showDimensions = true;
    }

    if (typeof globalClickMode === 'undefined') toggles.globalClickMode = true;
    if (typeof toggles.showDimensions === 'undefined') toggles.showDimensions = true;
  } catch {}
}

export function normalizeGlobalHandleType(
  data: ProjectDataLike,
  ensureSettingsRecord: EnsureSettingsRecordFn
): void {
  try {
    const settings = ensureSettingsRecord(data);
    const value: unknown = settings.globalHandleType;
    settings.globalHandleType =
      value === 'standard' || value === 'edge' || value === 'none' ? value : 'standard';
  } catch {}
}

export function stripDeprecatedProjectCompatFields(
  data: ProjectDataLike,
  ensureSettingsRecord: EnsureSettingsRecordFn
): void {
  const record: ProjectDataLike & UnknownRecord = data;
  const settings = ensureSettingsRecord(data);
  const rootCompatKeys = ['hingeDoorsMap', 'grooveMap', 'doorsCount', 'wardrobeWidth', 'wardrobeHeight'];
  for (const key of rootCompatKeys) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    try {
      delete record[key];
    } catch {
      record[key] = undefined;
    }
  }

  const settingsCompatKeys = [
    'modulesConfiguration',
    'stackSplitLowerModulesConfiguration',
    'isLibraryMode',
    'preChestState',
  ];
  for (const key of settingsCompatKeys) {
    if (!Object.prototype.hasOwnProperty.call(settings, key)) continue;
    try {
      delete settings[key];
    } catch {
      settings[key] = undefined;
    }
  }
}

export function inferStackSplitManualFlags(
  data: ProjectDataLike,
  ensureSettingsRecord: EnsureSettingsRecordFn
): void {
  try {
    const settings = ensureSettingsRecord(data);
    const stackEnabled = !!settings.stackSplitEnabled;
    const overallWidth = Number(settings.width);
    const overallDepth = Number(settings.depth);
    const overallDoors = Math.max(0, Math.round(Number(settings.doors) || 0));
    const lowerWidth = Number(settings.stackSplitLowerWidth);
    const lowerDepth = Number(settings.stackSplitLowerDepth);
    const lowerDoors = Math.max(0, Math.round(Number(settings.stackSplitLowerDoors) || 0));

    if (typeof settings.stackSplitLowerWidthManual === 'undefined') {
      settings.stackSplitLowerWidthManual =
        stackEnabled &&
        Number.isFinite(lowerWidth) &&
        Number.isFinite(overallWidth) &&
        Math.abs(lowerWidth - overallWidth) > 0.01;
    }
    if (typeof settings.stackSplitLowerDepthManual === 'undefined') {
      settings.stackSplitLowerDepthManual =
        stackEnabled &&
        Number.isFinite(lowerDepth) &&
        Number.isFinite(overallDepth) &&
        Math.abs(lowerDepth - overallDepth) > 0.01;
    }
    if (typeof settings.stackSplitLowerDoorsManual === 'undefined') {
      settings.stackSplitLowerDoorsManual =
        stackEnabled &&
        Number.isFinite(lowerDoors) &&
        Number.isFinite(overallDoors) &&
        Math.abs(lowerDoors - overallDoors) > 0;
    }
  } catch {}
}
