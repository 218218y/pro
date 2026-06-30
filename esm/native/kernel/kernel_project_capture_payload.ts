import type { UnknownRecord } from '../../../types';

import { readUiRawScalarFromCanonicalSnapshot } from '../runtime/ui_raw_selectors.js';
import { readMirrorLayoutMap, readDoorTrimMap } from '../features/door_authoring/api.js';
import { normalizeDoorMountThicknessCm } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY } from '../features/shoe_drawer_base_constraint.js';

import { asString } from './kernel_shared.js';
import {
  buildKernelProjectCaptureCanonicalConfigLists,
  type KernelProjectCaptureCanonicalConfigLists,
} from './kernel_project_capture_config_lists.js';
import {
  buildStructureCfgSnapshot,
  buildStructureUiSnapshot,
  cloneProjectCaptureValue,
} from './kernel_project_capture_shared.js';
import { canonicalizeComparableProjectConfigSnapshot } from './kernel_project_config_snapshot_canonical.js';

export interface BuildKernelProjectCaptureDataArgs {
  uiRec: UnknownRecord;
  rawAny: UnknownRecord;
  cfgRec: UnknownRecord;
  savedNotes: unknown;
}

function isPlainRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readPlainRecord(value: unknown): UnknownRecord | null {
  return isPlainRecord(value) ? value : null;
}

function readCanonicalCornerSide(uiRec: UnknownRecord, rawAny: UnknownRecord): 'left' | 'right' {
  return rawAny.cornerSide === 'left'
    ? 'left'
    : rawAny.cornerSide === 'right'
      ? 'right'
      : uiRec.cornerSide === 'left'
        ? 'left'
        : uiRec.cornerSide === 'right'
          ? 'right'
          : 'right';
}

function buildProjectCaptureSettings(
  uiRec: UnknownRecord,
  rawAny: UnknownRecord,
  cfgRec: UnknownRecord,
  overallDoors: unknown,
  overallWidth: unknown,
  overallHeight: unknown,
  overallDepth: unknown,
  stackSplitLowerHeight: unknown,
  stackSplitLowerDepth: unknown,
  stackSplitLowerWidth: unknown,
  stackSplitLowerDoors: unknown,
  lowerDepthManual: boolean,
  lowerWidthManual: boolean,
  lowerDoorsManual: boolean
): UnknownRecord {
  return {
    doors: overallDoors,
    width: overallWidth,
    height: overallHeight,
    depth: overallDepth,
    baseType: asString(uiRec.baseType, ''),
    [SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY]:
      typeof uiRec[SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY] === 'string'
        ? uiRec[SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY]
        : null,
    baseLegStyle: asString(uiRec.baseLegStyle, 'tapered'),
    baseLegColor: asString(uiRec.baseLegColor, 'black'),
    baseLegPlatformMode: asString(uiRec.baseLegPlatformMode, 'stage') === 'plain' ? 'plain' : 'stage',
    baseLegPlatformSideMode:
      asString(uiRec.baseLegPlatformSideMode, 'overhang') === 'flush' ? 'flush' : 'overhang',
    basePlinthHeightCm: uiRec.basePlinthHeightCm !== undefined ? uiRec.basePlinthHeightCm : 8,
    baseLegHeightCm: uiRec.baseLegHeightCm !== undefined ? uiRec.baseLegHeightCm : 12,
    baseLegWidthCm: uiRec.baseLegWidthCm !== undefined ? uiRec.baseLegWidthCm : 4,
    slidingTracksColor: asString(uiRec.slidingTracksColor, 'nickel'),
    doorStyle: asString(uiRec.doorStyle, ''),
    corniceType:
      String(asString(uiRec.corniceType, 'classic') || 'classic').toLowerCase() === 'wave'
        ? 'wave'
        : 'classic',
    color: asString(uiRec.colorChoice, '') || asString(uiRec.color, ''),
    customColor: asString(uiRec.customColor, ''),
    structureSelection: asString(uiRec.structureSelect, ''),
    wardrobeType: cfgRec.wardrobeType !== undefined ? asString(cfgRec.wardrobeType, 'hinged') : 'hinged',
    doorMountMode: cfgRec.doorMountMode === 'inset' ? 'inset' : 'overlay',
    boardMaterial:
      cfgRec.boardMaterial !== undefined ? asString(cfgRec.boardMaterial, 'sandwich') : 'sandwich',
    isManualWidth: cfgRec.isManualWidth !== undefined ? !!cfgRec.isManualWidth : false,
    singleDoorPos: asString(uiRec.singleDoorPos, ''),
    globalHandleType:
      cfgRec.globalHandleType !== undefined ? asString(cfgRec.globalHandleType, 'standard') : 'standard',
    cornerWidth: uiRec.cornerWidth !== undefined ? uiRec.cornerWidth : 0,
    cornerSide: readCanonicalCornerSide(uiRec, rawAny),
    cornerDoors: uiRec.cornerDoors !== undefined ? uiRec.cornerDoors : 3,
    cornerHeight:
      uiRec.cornerHeight !== undefined
        ? uiRec.cornerHeight
        : typeof overallHeight !== 'undefined'
          ? overallHeight
          : uiRec.height,
    cornerDepth:
      uiRec.cornerDepth !== undefined
        ? uiRec.cornerDepth
        : typeof overallDepth !== 'undefined'
          ? overallDepth
          : uiRec.depth,
    stackSplitEnabled: typeof uiRec.stackSplitEnabled !== 'undefined' ? !!uiRec.stackSplitEnabled : false,
    stackSplitDecorativeSeparatorEnabled:
      !!uiRec.stackSplitEnabled && !!uiRec.stackSplitDecorativeSeparatorEnabled,
    stackSplitLowerHeight,
    stackSplitLowerDepthManual: lowerDepthManual,
    stackSplitLowerWidthManual: lowerWidthManual,
    stackSplitLowerDoorsManual: lowerDoorsManual,
    stackSplitLowerDepth: lowerDepthManual ? stackSplitLowerDepth : overallDepth,
    stackSplitLowerWidth: lowerWidthManual ? stackSplitLowerWidth : overallWidth,
    stackSplitLowerDoors: lowerDoorsManual ? stackSplitLowerDoors : overallDoors,
  };
}

function buildProjectCaptureToggles(uiRec: UnknownRecord, cfgRec: UnknownRecord): UnknownRecord {
  return {
    sketchMode: !!uiRec.sketchMode,
    multiColor:
      typeof cfgRec.isMultiColorMode !== 'undefined' ? !!cfgRec.isMultiColorMode : !!uiRec.multiColorEnabled,
    chestMode: !!uiRec.isChestMode,
    chestCommode: !!uiRec.chestCommodeEnabled,
    cornerMode: !!uiRec.cornerMode,
    removeDoors: !!uiRec.removeDoorsEnabled,
    splitDoors: !!uiRec.splitDoors,
    grooves: !!uiRec.groovesEnabled,
    internalDrawers: !!uiRec.internalDrawersEnabled,
    handleControl: !!uiRec.handleControl,
    showHanger: (typeof uiRec.showContents !== 'undefined' ? !!uiRec.showContents : false)
      ? false
      : typeof uiRec.showHanger !== 'undefined'
        ? !!uiRec.showHanger
        : true,
    showContents: !!uiRec.showContents,
    hingeDirection: !!uiRec.hingeDirection,
    showDimensions:
      typeof cfgRec.showDimensions !== 'undefined'
        ? !!cfgRec.showDimensions
        : typeof uiRec.showDimensions !== 'undefined'
          ? !!uiRec.showDimensions
          : true,
    addCornice: !!uiRec.hasCornice,
    notesEnabled: !!uiRec.notesEnabled,
    globalClickMode: typeof uiRec.globalClickMode === 'undefined' ? true : !!uiRec.globalClickMode,
    lightingControl: !!uiRec.lightingControl,
    lightAmb: uiRec.lightAmb,
    lightDir: uiRec.lightDir,
    lightX: uiRec.lightX,
    lightY: uiRec.lightY,
    lightZ: uiRec.lightZ,
  };
}

function buildProjectCaptureLists(
  cfgRec: UnknownRecord,
  uiRec: UnknownRecord,
  rawAny: UnknownRecord
): KernelProjectCaptureCanonicalConfigLists {
  return buildKernelProjectCaptureCanonicalConfigLists(cfgRec, uiRec, rawAny);
}

function readCurtainSnapshot(value: unknown): UnknownRecord {
  const src = readPlainRecord(value);
  if (!src) return {};
  const out: UnknownRecord = {};
  for (const [key, entry] of Object.entries(src)) {
    if (typeof entry === 'string') out[key] = entry;
  }
  return out;
}

export function buildKernelProjectCaptureData(args: BuildKernelProjectCaptureDataArgs): UnknownRecord {
  const { uiRec, rawAny, cfgRec, savedNotes } = args;

  const overallDoors = readUiRawScalarFromCanonicalSnapshot(uiRec, 'doors');
  const overallWidth = readUiRawScalarFromCanonicalSnapshot(uiRec, 'width');
  const overallHeight = readUiRawScalarFromCanonicalSnapshot(uiRec, 'height');
  const overallDepth = readUiRawScalarFromCanonicalSnapshot(uiRec, 'depth');
  const chestDrawersCount = readUiRawScalarFromCanonicalSnapshot(uiRec, 'chestDrawersCount');
  const chestCommodeMirrorHeightCm = readUiRawScalarFromCanonicalSnapshot(
    uiRec,
    'chestCommodeMirrorHeightCm'
  );
  const chestCommodeMirrorWidthCm = readUiRawScalarFromCanonicalSnapshot(uiRec, 'chestCommodeMirrorWidthCm');
  const chestCommodeMirrorWidthManual = !!readUiRawScalarFromCanonicalSnapshot(
    uiRec,
    'chestCommodeMirrorWidthManual'
  );

  const lowerDepthManual = !!readUiRawScalarFromCanonicalSnapshot(uiRec, 'stackSplitLowerDepthManual');
  const lowerWidthManual = !!readUiRawScalarFromCanonicalSnapshot(uiRec, 'stackSplitLowerWidthManual');
  const lowerDoorsManual = !!readUiRawScalarFromCanonicalSnapshot(uiRec, 'stackSplitLowerDoorsManual');
  const stackSplitLowerHeight = readUiRawScalarFromCanonicalSnapshot(uiRec, 'stackSplitLowerHeight');
  const stackSplitLowerDepth = readUiRawScalarFromCanonicalSnapshot(uiRec, 'stackSplitLowerDepth');
  const stackSplitLowerWidth = readUiRawScalarFromCanonicalSnapshot(uiRec, 'stackSplitLowerWidth');
  const stackSplitLowerDoors = readUiRawScalarFromCanonicalSnapshot(uiRec, 'stackSplitLowerDoors');

  const canonicalConfigLists = buildProjectCaptureLists(cfgRec, uiRec, rawAny);
  const canonicalCfg = canonicalizeComparableProjectConfigSnapshot(cfgRec, {
    uiSnapshot: buildStructureUiSnapshot(uiRec, rawAny),
    cfgSnapshot: buildStructureCfgSnapshot(cfgRec),
    cornerMode: 'auto',
    topMode: 'clone',
    savedColorsMode: 'mixed',
  });

  return {
    settings: buildProjectCaptureSettings(
      uiRec,
      rawAny,
      cfgRec,
      overallDoors,
      overallWidth,
      overallHeight,
      overallDepth,
      stackSplitLowerHeight,
      stackSplitLowerDepth,
      stackSplitLowerWidth,
      stackSplitLowerDoors,
      lowerDepthManual,
      lowerWidthManual,
      lowerDoorsManual
    ),
    toggles: buildProjectCaptureToggles(uiRec, cfgRec),
    chestSettings: {
      drawersCount: typeof chestDrawersCount !== 'undefined' ? chestDrawersCount : 4,
      commodeEnabled: !!uiRec.chestCommodeEnabled,
      mirrorHeightCm: chestCommodeMirrorHeightCm,
      mirrorWidthCm: chestCommodeMirrorWidthCm,
      mirrorWidthManual: chestCommodeMirrorWidthManual,
    },
    modulesConfiguration: canonicalConfigLists.modulesConfiguration,
    stackSplitLowerModulesConfiguration: canonicalConfigLists.stackSplitLowerModulesConfiguration,
    cornerConfiguration: canonicalConfigLists.cornerConfiguration,
    groovesMap: cloneProjectCaptureValue(canonicalCfg.groovesMap, {}),
    grooveLinesCountMap: cloneProjectCaptureValue(canonicalCfg.grooveLinesCountMap, {}),
    splitDoorsMap: cloneProjectCaptureValue(canonicalCfg.splitDoorsMap, {}),
    splitDoorsBottomMap: cloneProjectCaptureValue(canonicalCfg.splitDoorsBottomMap, {}),
    removedDoorsMap: cloneProjectCaptureValue(canonicalCfg.removedDoorsMap, {}),
    roundedFrameSideShelvesMap: cloneProjectCaptureValue(canonicalCfg.roundedFrameSideShelvesMap, {}),
    drawerDividersMap: cloneProjectCaptureValue(canonicalCfg.drawerDividersMap, {}),
    individualColors: cloneProjectCaptureValue(canonicalCfg.individualColors, {}),
    doorSpecialMap: cloneProjectCaptureValue(canonicalCfg.doorSpecialMap, {}),
    doorStyleMap: cloneProjectCaptureValue(canonicalCfg.doorStyleMap, {}),
    mirrorLayoutMap: cloneProjectCaptureValue(readMirrorLayoutMap(cfgRec.mirrorLayoutMap), {}),
    savedColors: cloneProjectCaptureValue(canonicalCfg.savedColors, []),
    handlesMap: cloneProjectCaptureValue(canonicalCfg.handlesMap, {}),
    hingeMap: cloneProjectCaptureValue(canonicalCfg.hingeMap, {}),
    curtainMap: cloneProjectCaptureValue(readCurtainSnapshot(cfgRec.curtainMap), {}),
    doorTrimMap: cloneProjectCaptureValue(readDoorTrimMap(cfgRec.doorTrimMap), {}),
    preChestState: cloneProjectCaptureValue(canonicalCfg.preChestState, null),
    overlayFrameThicknessCm: normalizeDoorMountThicknessCm(canonicalCfg.overlayFrameThicknessCm),
    overlayShelfThicknessCm: normalizeDoorMountThicknessCm(canonicalCfg.overlayShelfThicknessCm),
    insetFrameThicknessCm: normalizeDoorMountThicknessCm(canonicalCfg.insetFrameThicknessCm),
    insetShelfThicknessCm: normalizeDoorMountThicknessCm(canonicalCfg.insetShelfThicknessCm),
    grooveLinesCount:
      typeof canonicalCfg.grooveLinesCount === 'number' && Number.isFinite(canonicalCfg.grooveLinesCount)
        ? canonicalCfg.grooveLinesCount
        : null,
    isLibraryMode: canonicalCfg.isLibraryMode === true,
    savedNotes: cloneProjectCaptureValue(savedNotes, []),
    projectName: asString(uiRec.projectName, ''),
  };
}
