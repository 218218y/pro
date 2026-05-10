import type {
  BuildStateLike,
  ConfigStateLike,
  ProjectDataLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types/index.js';

import { PROJECT_SCHEMA_ID, PROJECT_SCHEMA_VERSION } from './project_schema.js';
import { canonicalizeComparableProjectConfigSnapshot } from '../features/project_config/project_config_snapshot_canonical.js';
import {
  buildStructureCfgSnapshot,
  buildStructureUiSnapshotFromUiState,
} from '../features/project_config/project_config_lists_canonical.js';
import { readPersistedProjectConfigSnapshot } from '../features/project_config/project_config_persisted_snapshot.js';

type ReportNonFatalFn = (op: string, err: unknown, throttleMs?: number) => void;

type FinalizeSaveOptions = {
  schemaId?: string;
  schemaVersion?: number;
  buildTags?: unknown;
  userAgent?: string | null;
  cloneJson: <T>(value: T) => T;
  reportNonFatal?: ReportNonFatalFn;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readBuildState(value: unknown): BuildStateLike {
  const rec = asRecord(value);
  return rec ? { ...rec } : {};
}

function readUiState(value: unknown): UiStateLike {
  const rec = asRecord(value);
  return rec ? { ...rec } : {};
}

function readConfigState(value: unknown): ConfigStateLike {
  const rec = asRecord(value);
  return rec ? { ...rec } : {};
}

function readFiniteNumber(value: unknown): number | undefined {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(num) ? num : undefined;
}

function readCanonicalProjectConfigForExportPayload(
  projectData: ProjectDataLike | UnknownRecord
): UnknownRecord {
  const settings = asRecord(projectData.settings) || {};
  return canonicalizeComparableProjectConfigSnapshot(projectData, {
    settings,
    cornerMode: 'auto',
    topMode: 'clone',
    savedColorsMode: 'mixed',
  });
}

function readCanonicalProjectConfigForSave(cfg: ConfigStateLike, ui: UiStateLike): UnknownRecord {
  return canonicalizeComparableProjectConfigSnapshot(cfg, {
    uiSnapshot: buildStructureUiSnapshotFromUiState(ui),
    cfgSnapshot: buildStructureCfgSnapshot(cfg),
    cornerMode: 'auto',
    topMode: 'clone',
    savedColorsMode: 'mixed',
  });
}

export function finalizeProjectForSavePayload(
  projectData: ProjectDataLike | UnknownRecord | null | undefined,
  options: FinalizeSaveOptions
): ProjectDataLike {
  const cloneJson = options.cloneJson;
  const reportNonFatal = options.reportNonFatal;
  const out = cloneJson(projectData || {});

  const canonicalCfg = readCanonicalProjectConfigForExportPayload(out);
  Object.assign(out, readPersistedProjectConfigSnapshot(canonicalCfg));

  out.__schema = options.schemaId || PROJECT_SCHEMA_ID;
  out.__version = options.schemaVersion || PROJECT_SCHEMA_VERSION;
  out.__createdAt = out.__createdAt || new Date().toISOString();

  try {
    const appMeta = asRecord(out.__app) || {};
    out.__app = appMeta;
    appMeta.buildTags = options.buildTags || null;
    appMeta.userAgent = options.userAgent || null;
    appMeta.timeZone =
      typeof Intl !== 'undefined' && Intl.DateTimeFormat
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : null;
  } catch (_e) {
    if (typeof reportNonFatal === 'function') {
      reportNonFatal('finalizeProjectForSavePayload.__app', _e);
    }
  }

  return out;
}

export function buildDefaultProjectDataSnapshot(
  defaultState: BuildStateLike | UnknownRecord | null | undefined
): ProjectDataLike {
  const def = readBuildState(defaultState);
  const ui = readUiState(def.ui);
  const raw = asRecord(ui.raw) || {};
  const cfg = readConfigState(def.config);

  const color =
    typeof ui.colorChoice === 'string' && ui.colorChoice
      ? String(ui.colorChoice)
      : typeof ui.color === 'string' && ui.color
        ? String(ui.color)
        : '#ffffff';

  const canonicalCfg = readCanonicalProjectConfigForSave(cfg, ui);
  const persistedConfig = readPersistedProjectConfigSnapshot(canonicalCfg);

  return {
    settings: {
      doors: readFiniteNumber(raw.doors),
      width: readFiniteNumber(raw.width),
      height: readFiniteNumber(raw.height),
      depth: readFiniteNumber(raw.depth),
      chestDrawersCount: readFiniteNumber(raw.chestDrawersCount),

      baseType: ui.baseType,
      baseLegStyle: ui.baseLegStyle,
      baseLegColor: ui.baseLegColor,
      baseLegHeightCm: readFiniteNumber(ui.baseLegHeightCm),
      baseLegWidthCm: readFiniteNumber(ui.baseLegWidthCm),
      slidingTracksColor: ui.slidingTracksColor === 'black' ? 'black' : 'nickel',
      doorStyle: ui.doorStyle,
      corniceType: String(ui.corniceType || 'classic').toLowerCase() === 'wave' ? 'wave' : 'classic',
      color,
      customColor: ui.customColor,
      structureSelection: ui.structureSelect || '',
      wardrobeType: cfg.wardrobeType === 'sliding' ? 'sliding' : 'hinged',
      isManualWidth: !!cfg.isManualWidth,
      singleDoorPos: ui.singleDoorPos || 'left',
      globalHandleType: cfg.globalHandleType || 'standard',

      cornerWidth: ui.cornerWidth,
      cornerDoors: ui.cornerDoors,
      cornerHeight: ui.cornerHeight,
      cornerDepth: ui.cornerDepth,

      stackSplitEnabled: !!ui.stackSplitEnabled,
      stackSplitDecorativeSeparatorEnabled:
        !!ui.stackSplitEnabled && !!ui.stackSplitDecorativeSeparatorEnabled,
      stackSplitLowerHeight: readFiniteNumber(raw.stackSplitLowerHeight),
      stackSplitLowerDepth: readFiniteNumber(raw.stackSplitLowerDepth),
      stackSplitLowerWidth: readFiniteNumber(raw.stackSplitLowerWidth),
      stackSplitLowerDoors: readFiniteNumber(raw.stackSplitLowerDoors),
      stackSplitLowerDepthManual: !!raw.stackSplitLowerDepthManual,
      stackSplitLowerWidthManual: !!raw.stackSplitLowerWidthManual,
      stackSplitLowerDoorsManual: !!raw.stackSplitLowerDoorsManual,
    },

    toggles: {
      sketchMode: !!ui.sketchMode,
      addCornice: !!ui.hasCornice,
      splitDoors: !!ui.splitDoors,
      grooves: !!ui.groovesEnabled,
      internalDrawers: !!ui.internalDrawersEnabled,
      multiColor: !!ui.multiColorEnabled,
      handleControl: !!ui.handleControl,
      chestMode: !!ui.isChestMode,
      cornerMode: !!ui.cornerMode,
      removeDoors: !!ui.removeDoorsEnabled,
      hingeDirection: !!ui.hingeDirection,
      notesEnabled: !!ui.notesEnabled,
      showContents: !!ui.showContents,
      showHanger: !!ui.showHanger,
      showDimensions: typeof ui.showDimensions === 'undefined' ? true : !!ui.showDimensions,
      globalClickMode: typeof ui.globalClickMode === 'undefined' ? true : !!ui.globalClickMode,
      lightingControl: !!ui.lightingControl,
    },

    chestSettings: {
      drawersCount: readFiniteNumber(raw.chestDrawersCount),
      bodyColor: color,
    },

    ...persistedConfig,
    savedNotes: [],
  } satisfies ProjectDataLike;
}
