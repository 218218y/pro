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

export function captureProjectPrevUiMode(uiState: UiStateLike | null | undefined) {
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
    raw: {
      doors: settings.doors,
      width: settings.width,
      height: settings.height,
      depth: settings.depth,
      cornerWidth: settings.cornerWidth,
      cornerSide,
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
      structureSelect: settings.structureSelection,
      singleDoorPos: settings.singleDoorPos || 'left',
    },
    projectName: readLoadedProjectName(rec, currentProjectName),
    doors: settings.doors,
    width: settings.width,
    height: settings.height,
    depth: settings.depth,
    cornerWidth: settings.cornerWidth,
    cornerSide,

    wardrobeType: settings.wardrobeType || 'hinged',
    baseType: settings.baseType,
    baseLegStyle: settings.baseLegStyle,
    baseLegColor: settings.baseLegColor,
    basePlinthHeightCm: settings.basePlinthHeightCm,
    baseLegHeightCm: settings.baseLegHeightCm,
    baseLegWidthCm: settings.baseLegWidthCm,
    slidingTracksColor: settings.slidingTracksColor === 'black' ? 'black' : 'nickel',
    structureSelect: settings.structureSelection,
    singleDoorPos: settings.singleDoorPos || 'left',
    doorStyle: settings.doorStyle,

    corniceType: String(settings.corniceType || 'classic').toLowerCase() === 'wave' ? 'wave' : 'classic',
    isManualWidth: !!settings.isManualWidth,

    colorChoice: settings.color,
    color: settings.color,
    customColor: settings.customColor,

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
  uiState.cornerDepth =
    typeof cornerDepth === 'number' ? cornerDepth : typeof rawDepth === 'number' ? rawDepth : undefined;

  const chestCount = chestSettings.drawersCount;
  if (typeof chestCount === 'number') {
    uiState.chestDrawersCount = chestCount;
    const raw = asRecord(uiState.raw);
    if (raw) raw.chestDrawersCount = chestCount;
  }

  return { uiState, savedNotes };
}

export function preserveUiEphemeral(uiSnap: UiStateLike, uiNow: UiStateLike | null | undefined): UiStateLike {
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
