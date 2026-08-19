import type {
  ConfigStateLike,
  ProjectDataLike,
  ProjectLoadOpts,
  ProjectPdfDraftLike,
  ProjectPdfStateLike,
  ProjectSavedNotesLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types/index.js';

import {
  cloneProjectJson as cloneProjectJsonShared,
  readSavedNotes as readSavedNotesShared,
} from './project_payload_shared.js';
import {
  asRecord,
  captureProjectLoadSourceFlags as captureProjectLoadSourceFlagsImpl,
  captureProjectPrevUiMode as captureProjectPrevUiModeImpl,
  preserveUiEphemeral as preserveUiEphemeralImpl,
  shouldPreserveProjectAutosaveOnLoad as shouldPreserveProjectAutosaveOnLoadImpl,
  readProjectSettings,
  readProjectToggles,
} from './project_io_load_helpers_shared.js';
import { buildProjectConfigSnapshot as buildProjectConfigSnapshotImpl } from './project_io_load_helpers_config.js';
import { SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY } from '../features/shoe_drawer_base_constraint.js';
import { asUiRawInputs } from '../../../types/ui_raw.js';

export type {
  ProjectIoPrevUiModeLike,
  ProjectIoSourceFlagsLike,
  ProjectTextMapLike,
  ProjectToggleMapLike,
} from './project_io_load_helpers_shared.js';

function readSavedNotes(value: unknown): ProjectSavedNotesLike {
  return readSavedNotesShared(value);
}

function cloneProjectJson(value: unknown): ProjectPdfDraftLike | null {
  return cloneProjectJsonShared(value);
}

function readOptionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readLoadedProjectName(rec: UnknownRecord, currentProjectName: string): string {
  if (Object.prototype.hasOwnProperty.call(rec, 'projectName') && typeof rec.projectName === 'string') {
    return rec.projectName;
  }
  return currentProjectName;
}

export function captureProjectPrevUiMode(uiState: unknown) {
  return captureProjectPrevUiModeImpl(uiState);
}

export function captureProjectLoadSourceFlags(opts?: ProjectLoadOpts) {
  return captureProjectLoadSourceFlagsImpl(opts);
}

export function shouldPreserveProjectAutosaveOnLoad(opts?: ProjectLoadOpts): boolean {
  return shouldPreserveProjectAutosaveOnLoadImpl(opts);
}

export function buildProjectConfigSnapshot(
  data: ProjectDataLike | UnknownRecord | null | undefined
): ConfigStateLike {
  return buildProjectConfigSnapshotImpl(data);
}

export function buildProjectUiSnapshot(
  data: ProjectDataLike | UnknownRecord | null | undefined,
  currentProjectName: string
): { uiState: UiStateLike; savedNotes: ProjectSavedNotesLike } {
  const rec = asRecord(data) || {};
  const settings = readProjectSettings(rec);
  const toggles = readProjectToggles(rec);

  const stackEnabled = !!settings.stackSplitEnabled;
  const lowerWidthManual = settings.stackSplitLowerWidthManual === true;
  const lowerDepthManual = settings.stackSplitLowerDepthManual === true;
  const lowerDoorsManual = settings.stackSplitLowerDoorsManual === true;

  const cornerSide =
    settings.cornerSide === 'left' ? 'left' : settings.cornerSide === 'right' ? 'right' : 'right';

  const chestSettings = asRecord(rec.chestSettings) || {};
  const chestCommodeMirrorHeightCm = readOptionalFiniteNumber(chestSettings.mirrorHeightCm);
  const chestCommodeMirrorWidthCm = readOptionalFiniteNumber(chestSettings.mirrorWidthCm);
  const chestCommodeMirrorWidthManual = chestSettings.mirrorWidthManual === true;

  const savedNotes = readSavedNotes(rec.savedNotes);

  const uiState: UiStateLike = {
    raw: asUiRawInputs({
      ...(typeof settings.doors === 'number' ? { doors: settings.doors } : {}),
      ...(typeof settings.width === 'number' ? { width: settings.width } : {}),
      ...(typeof settings.height === 'number' ? { height: settings.height } : {}),
      ...(typeof settings.depth === 'number' ? { depth: settings.depth } : {}),
      ...(typeof settings.cornerWidth === 'number' ? { cornerWidth: settings.cornerWidth } : {}),
      chestCommodeMirrorHeightCm,
      chestCommodeMirrorWidthCm,
      chestCommodeMirrorWidthManual,
      stackSplitLowerHeight: settings.stackSplitLowerHeight,
      stackSplitLowerDepth: settings.stackSplitLowerDepth,
      stackSplitLowerWidth: settings.stackSplitLowerWidth,
      stackSplitLowerDoors: settings.stackSplitLowerDoors,
      stackSplitLowerDepthManual: lowerDepthManual,
      stackSplitLowerWidthManual: lowerWidthManual,
      stackSplitLowerDoorsManual: lowerDoorsManual,
      ...(typeof settings.structureSelection === 'string'
        ? { structureSelect: settings.structureSelection }
        : {}),
      singleDoorPos: settings.singleDoorPos || 'left',
    }),
    projectName: readLoadedProjectName(rec, currentProjectName),
    ...(typeof settings.doors === 'number' ? { doors: settings.doors } : {}),
    ...(typeof settings.width === 'number' ? { width: settings.width } : {}),
    ...(typeof settings.height === 'number' ? { height: settings.height } : {}),
    ...(typeof settings.depth === 'number' ? { depth: settings.depth } : {}),
    ...(typeof settings.cornerWidth === 'number' ? { cornerWidth: settings.cornerWidth } : {}),
    cornerSide,

    ...(typeof settings.baseType === 'string' ? { baseType: settings.baseType } : {}),
    [SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY]:
      settings[SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY] === 'plinth' ||
      settings[SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY] === 'legs' ||
      settings[SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY] === 'none'
        ? settings[SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY]
        : null,
    ...(typeof settings.baseLegStyle === 'string' ? { baseLegStyle: settings.baseLegStyle } : {}),
    ...(typeof settings.baseLegColor === 'string' ? { baseLegColor: settings.baseLegColor } : {}),
    baseLegPlatformMode: settings.baseLegPlatformMode === 'plain' ? 'plain' : 'stage',
    baseLegPlatformSideMode: settings.baseLegPlatformSideMode === 'flush' ? 'flush' : 'overhang',
    ...(typeof settings.basePlinthHeightCm === 'number'
      ? { basePlinthHeightCm: settings.basePlinthHeightCm }
      : {}),
    ...(typeof settings.baseLegHeightCm === 'number' ? { baseLegHeightCm: settings.baseLegHeightCm } : {}),
    ...(typeof settings.baseLegWidthCm === 'number' ? { baseLegWidthCm: settings.baseLegWidthCm } : {}),
    slidingTracksColor: settings.slidingTracksColor === 'black' ? 'black' : 'nickel',
    ...(typeof settings.structureSelection === 'string'
      ? { structureSelect: settings.structureSelection }
      : {}),
    singleDoorPos: settings.singleDoorPos || 'left',
    ...(typeof settings.doorStyle === 'string' ? { doorStyle: settings.doorStyle } : {}),

    corniceType: String(settings.corniceType || 'classic').toLowerCase() === 'wave' ? 'wave' : 'classic',

    ...(typeof settings.color === 'string' ? { colorChoice: settings.color, color: settings.color } : {}),
    ...(typeof settings.customColor === 'string' ? { customColor: settings.customColor } : {}),

    groovesEnabled: !!toggles.grooves,
    internalDrawersEnabled:
      typeof toggles.internalDrawers !== 'undefined' ? !!toggles.internalDrawers : false,
    isChestMode: !!toggles.chestMode,
    chestCommodeEnabled: !!toggles.chestCommode,

    splitDoors: !!toggles.splitDoors,
    handleControl: !!toggles.handleControl,
    cornerMode: !!toggles.cornerMode,
    removeDoorsEnabled: !!toggles.removeDoors,
    hasCornice: !!toggles.addCornice,
    stackSplitEnabled: stackEnabled,
    stackSplitDecorativeSeparatorEnabled: stackEnabled && !!settings.stackSplitDecorativeSeparatorEnabled,
    sketchMode: !!toggles.sketchMode,
    multiColorEnabled: !!toggles.multiColor,
    hingeDirection: !!toggles.hingeDirection,

    showDimensions: typeof toggles.showDimensions !== 'undefined' ? toggles.showDimensions !== false : true,
    showHanger: typeof toggles.showHanger !== 'undefined' ? toggles.showHanger !== false : true,
    showContents: !!toggles.showContents,
    notesEnabled: !!toggles.notesEnabled,
    globalClickMode: typeof toggles.globalClickMode !== 'undefined' ? !!toggles.globalClickMode : true,
    lightingControl: !!toggles.lightingControl,

    lightAmb: typeof toggles.lightAmb !== 'undefined' ? toggles.lightAmb : '',
    lightDir: typeof toggles.lightDir !== 'undefined' ? toggles.lightDir : '',
    lightX: typeof toggles.lightX !== 'undefined' ? toggles.lightX : '',
    lightY: typeof toggles.lightY !== 'undefined' ? toggles.lightY : '',
    lightZ: typeof toggles.lightZ !== 'undefined' ? toggles.lightZ : '',
  };

  const cornerDoors = settings.cornerDoors;
  uiState.cornerDoors = typeof cornerDoors !== 'undefined' ? cornerDoors : 3;

  const cornerHeight = settings.cornerHeight;
  uiState.cornerHeight = typeof cornerHeight !== 'undefined' ? cornerHeight : 240;

  const cornerDepth = settings.cornerDepth;
  const rawDepth = asRecord(uiState.raw)?.depth;
  const resolvedCornerDepth =
    typeof cornerDepth === 'number' ? cornerDepth : typeof rawDepth === 'number' ? rawDepth : undefined;
  if (typeof resolvedCornerDepth === 'number') uiState.cornerDepth = resolvedCornerDepth;
  else delete uiState.cornerDepth;

  const chestCount = chestSettings.drawersCount;
  if (typeof chestCount === 'number' && uiState.raw) {
    uiState.raw.chestDrawersCount = chestCount;
  }

  return { uiState, savedNotes };
}

export function preserveUiEphemeral(uiSnap: unknown, uiNow: unknown): UiStateLike {
  return preserveUiEphemeralImpl(uiSnap, uiNow);
}

export function buildProjectPdfUiPatch(
  data: ProjectDataLike | UnknownRecord | null | undefined,
  _cloneJson: <T>(value: T) => T
): Pick<ProjectPdfStateLike, 'orderPdfEditorDraft' | 'orderPdfEditorZoom'> {
  const rec = asRecord(data) || {};
  const hasDraft = typeof rec.orderPdfEditorDraft !== 'undefined';
  const zoom = rec.orderPdfEditorZoom;
  return {
    orderPdfEditorDraft: hasDraft ? cloneProjectJson(rec.orderPdfEditorDraft) : null,
    orderPdfEditorZoom: typeof zoom === 'number' && Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
  };
}
