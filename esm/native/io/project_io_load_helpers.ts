import type {
  ConfigStateLike,
  ProjectDataEnvelopeLike,
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

function readLoadedProjectName(
  rec: UnknownRecord,
  settings: UnknownRecord,
  currentProjectName: string
): string {
  if (
    Object.prototype.hasOwnProperty.call(settings, 'projectName') &&
    typeof settings.projectName === 'string'
  ) {
    return settings.projectName;
  }
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

export function buildProjectConfigSnapshot(
  data: ProjectDataLike | ProjectDataEnvelopeLike | UnknownRecord | null | undefined
): ConfigStateLike {
  return buildProjectConfigSnapshotImpl(data);
}

export function buildProjectUiSnapshot(
  data: ProjectDataLike | ProjectDataEnvelopeLike | UnknownRecord | null | undefined,
  currentProjectName: string
): { uiState: UiStateLike; savedNotes: ProjectSavedNotesLike } {
  const rec = asRecord(data) || {};
  const settings = readProjectSettings(rec);
  const toggles = readProjectToggles(rec);

  const stackEnabled = !!settings.stackSplitEnabled;
  const overallW = Number(settings.width);
  const overallD = Number(settings.depth);
  const overallDoors = Math.max(0, Math.round(Number(settings.doors) || 0));

  const lowerW = Number(settings.stackSplitLowerWidth);
  const lowerD = Number(settings.stackSplitLowerDepth);
  const lowerDoors = Math.max(0, Math.round(Number(settings.stackSplitLowerDoors) || 0));

  const lowerWidthManual =
    typeof settings.stackSplitLowerWidthManual !== 'undefined'
      ? !!settings.stackSplitLowerWidthManual
      : stackEnabled &&
        Number.isFinite(lowerW) &&
        Number.isFinite(overallW) &&
        Math.abs(lowerW - overallW) > 0.01;

  const lowerDepthManual =
    typeof settings.stackSplitLowerDepthManual !== 'undefined'
      ? !!settings.stackSplitLowerDepthManual
      : stackEnabled &&
        Number.isFinite(lowerD) &&
        Number.isFinite(overallD) &&
        Math.abs(lowerD - overallD) > 0.01;

  const lowerDoorsManual =
    typeof settings.stackSplitLowerDoorsManual !== 'undefined'
      ? !!settings.stackSplitLowerDoorsManual
      : stackEnabled &&
        Number.isFinite(lowerDoors) &&
        Number.isFinite(overallDoors) &&
        lowerDoors !== overallDoors;

  const cornerSide =
    settings.cornerSide === 'left' ? 'left' : settings.cornerSide === 'right' ? 'right' : 'right';

  const savedNotesSource = Array.isArray(rec.savedNotes) ? rec.savedNotes : rec.notes;
  const savedNotes = readSavedNotes(savedNotesSource);
  const notesEnabledInFile =
    typeof toggles.notesEnabled !== 'undefined' ? !!toggles.notesEnabled : savedNotes.length > 0;

  const uiState: UiStateLike = {
    raw: {
      doors: settings.doors,
      width: settings.width,
      height: settings.height,
      depth: settings.depth,
      cornerWidth: settings.cornerWidth,
      cornerSide,
      stackSplitLowerHeight: settings.stackSplitLowerHeight,
      stackSplitLowerDepth: settings.stackSplitLowerDepth,
      stackSplitLowerWidth: settings.stackSplitLowerWidth,
      stackSplitLowerDoors: settings.stackSplitLowerDoors,
      stackSplitLowerDepthManual: lowerDepthManual,
      stackSplitLowerWidthManual: lowerWidthManual,
      stackSplitLowerDoorsManual: lowerDoorsManual,
    },
    projectName: readLoadedProjectName(rec, settings, currentProjectName),
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
    baseLegHeightCm: settings.baseLegHeightCm,
    baseLegWidthCm: settings.baseLegWidthCm,
    slidingTracksColor: settings.slidingTracksColor === 'black' ? 'black' : 'nickel',
    structureSelect: settings.structureSelection,
    singleDoorPos: settings.singleDoorPos || settings.singleDoorPosition || 'left',
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

    splitDoors: !!toggles.splitDoors,
    handleControl: !!toggles.handleControl,
    cornerMode: !!toggles.cornerMode,
    removeDoorsEnabled: !!toggles.removeDoors,
    hasCornice: !!toggles.addCornice,
    stackSplitEnabled: stackEnabled,
    sketchMode: !!toggles.sketchMode,
    multiColorEnabled: !!toggles.multiColor,
    hingeDirection: !!toggles.hingeDirection,

    showDimensions: typeof toggles.showDimensions !== 'undefined' ? toggles.showDimensions !== false : true,
    showHanger: typeof toggles.showHanger !== 'undefined' ? toggles.showHanger !== false : true,
    showContents: !!toggles.showContents,
    notesEnabled: notesEnabledInFile,
    globalClickMode: typeof toggles.globalClickMode !== 'undefined' ? !!toggles.globalClickMode : true,
    lightingControl: !!toggles.lightingControl,

    lightAmb: typeof toggles.lightAmb !== 'undefined' ? toggles.lightAmb : settings.lightAmb || '',
    lightDir: typeof toggles.lightDir !== 'undefined' ? toggles.lightDir : settings.lightDir || '',
    lightX: typeof toggles.lightX !== 'undefined' ? toggles.lightX : settings.lightX || '',
    lightY: typeof toggles.lightY !== 'undefined' ? toggles.lightY : settings.lightY || '',
    lightZ: typeof toggles.lightZ !== 'undefined' ? toggles.lightZ : settings.lightZ || '',
  };

  const cornerDoors = settings.cornerDoors;
  uiState.cornerDoors = typeof cornerDoors !== 'undefined' ? cornerDoors : 3;

  const cornerHeight = settings.cornerHeight;
  uiState.cornerHeight = typeof cornerHeight !== 'undefined' ? cornerHeight : 240;

  const cornerDepth = settings.cornerDepth;
  const rawDepth = asRecord(uiState.raw)?.depth;
  uiState.cornerDepth =
    typeof cornerDepth === 'number' ? cornerDepth : typeof rawDepth === 'number' ? rawDepth : undefined;

  const chestSettings = asRecord(rec.chestSettings) || {};
  const chestCount = chestSettings.drawersCount || settings.chestDrawersCount || rec.chestDrawers || '';
  if (chestCount !== '') {
    uiState.chestDrawersCount = chestCount;
  }

  return { uiState, savedNotes };
}

export function preserveUiEphemeral(uiSnap: UiStateLike, uiNow: UiStateLike | null | undefined): UiStateLike {
  return preserveUiEphemeralImpl(uiSnap, uiNow);
}

export function buildProjectPdfUiPatch(
  data: ProjectDataLike | ProjectDataEnvelopeLike | UnknownRecord | null | undefined,
  _cloneJson: <T>(value: T) => T
): Pick<ProjectPdfStateLike, 'orderPdfEditorDraft' | 'orderPdfEditorZoom'> {
  const rec = asRecord(data) || {};
  const hasDraft = typeof rec.orderPdfEditorDraft !== 'undefined';
  const zoom = Number(rec.orderPdfEditorZoom);
  return {
    orderPdfEditorDraft: hasDraft ? cloneProjectJson(rec.orderPdfEditorDraft) : null,
    orderPdfEditorZoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
  };
}
