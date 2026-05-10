import type { HingeMap, ProjectPreChestStateLike, UnknownRecord } from '../../../../../types';
import {
  getDefaultBaseLegWidthCm,
  normalizeBaseLegColor,
  normalizeBaseLegHeightCm,
  normalizeBaseLegStyle,
  normalizeBaseLegWidthCm,
} from '../../../features/base_leg_support.js';
import {
  DEFAULT_CHEST_DRAWERS_COUNT,
  DEFAULT_CORNER_DOORS,
  DEFAULT_CORNER_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_HINGED_DOORS,
  DEFAULT_STACK_SPLIT_LOWER_HEIGHT,
  DEFAULT_WIDTH,
  getDefaultDepthForWardrobeType,
} from '../../../services/api.js';
import type {
  StructureTabBaseUiState,
  StructureTabCellDimKey,
  StructureTabCellDimsState,
  StructureTabDefaultCellWidthArgs,
  StructureTabDerivedStackSplitState,
  StructureTabSelectionArgs,
  StructureTabSelectionState,
  StructureTabStackSplitArgs,
  StructureTabStackSplitUiState,
  StructureTabUiSnapshot,
} from './structure_tab_view_state_contracts.js';

import {
  readUiRawIntFromSnapshot,
  readUiRawNumberFromSnapshot,
  readUiRawScalarFromSnapshot,
} from '../selectors/ui_raw_selectors.js';
import { hasArrayItem, safeJsonParse } from './structure_tab_library_helpers.js';
import { STRUCTURE_PATTERNS, type StructurePattern } from './structure_tab_saved_models_patterns.js';
import { asFiniteInt, asFiniteNumber, asOptionalNumber } from './structure_tab_shared.js';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asStructureTabRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function normalizeStructureTabPreChestState(value: unknown): ProjectPreChestStateLike {
  const rec = asStructureTabRecord(value);
  return rec ? { ...rec } : null;
}

function readStructureTabHingeEntry(value: unknown): HingeMap[string] | undefined {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  if (isRecord(value)) return { ...value };
  return undefined;
}

export function normalizeStructureTabHingeMap(value: unknown): HingeMap {
  const rec = asStructureTabRecord(value);
  if (!rec) return {};
  const out: HingeMap = {};
  for (const key of Object.keys(rec)) {
    const normalized = readStructureTabHingeEntry(rec[key]);
    if (typeof normalized !== 'undefined') out[key] = normalized;
  }
  return out;
}

export function normalizeStructureTabBaseType(value: unknown): 'plinth' | 'legs' | 'none' {
  return value === 'legs' || value === 'none' ? value : 'plinth';
}

export function normalizeStructureTabSlidingTracksColor(value: unknown): 'nickel' | 'black' {
  return value === 'black' ? 'black' : 'nickel';
}

export function normalizeStructureTabCornerSide(value: unknown): 'left' | 'right' {
  return value === 'left' ? 'left' : 'right';
}

function readStructureTabNumberArray(value: unknown): number[] | null {
  return Array.isArray(value) && value.every(v => typeof v === 'number' && Number.isFinite(v)) ? value : null;
}

export function readStructureTabBaseUiState(ui: StructureTabUiSnapshot): StructureTabBaseUiState {
  const depth = readUiRawNumberFromSnapshot(ui, 'depth', getDefaultDepthForWardrobeType(ui.wardrobeType));
  return {
    width: readUiRawNumberFromSnapshot(ui, 'width', DEFAULT_WIDTH),
    height: readUiRawNumberFromSnapshot(ui, 'height', DEFAULT_HEIGHT),
    depth,
    doors: readUiRawIntFromSnapshot(ui, 'doors', DEFAULT_HINGED_DOORS),
    chestDrawersCount: readUiRawIntFromSnapshot(ui, 'chestDrawersCount', DEFAULT_CHEST_DRAWERS_COUNT),
    baseType: normalizeStructureTabBaseType(ui.baseType),
    baseLegStyle: normalizeBaseLegStyle(ui.baseLegStyle),
    baseLegColor: normalizeBaseLegColor(ui.baseLegColor),
    baseLegHeightCm: normalizeBaseLegHeightCm(ui.baseLegHeightCm),
    baseLegWidthCm: normalizeBaseLegWidthCm(ui.baseLegWidthCm, getDefaultBaseLegWidthCm(ui.baseLegStyle)),
    slidingTracksColor: normalizeStructureTabSlidingTracksColor(ui.slidingTracksColor),
    structureSelectRaw: String(ui.structureSelect || ''),
    singleDoorPosRaw: String(ui.singleDoorPos || ''),
    hingeDirection: !!ui.hingeDirection,
    cornerMode: !!ui.cornerMode,
    cornerSide: normalizeStructureTabCornerSide(ui.cornerSide),
    cornerWidth: asFiniteNumber(ui.cornerWidth, DEFAULT_CORNER_WIDTH),
    cornerDoors: asFiniteInt(ui.cornerDoors, DEFAULT_CORNER_DOORS),
    cornerHeight: asFiniteNumber(ui.cornerHeight, DEFAULT_HEIGHT),
    cornerDepth: asFiniteNumber(ui.cornerDepth, depth),
    isChestMode: !!ui.isChestMode,
  };
}

export function readStructureTabStackSplitUiState(
  ui: StructureTabUiSnapshot,
  args: { depth: number; width: number; doors: number }
): StructureTabStackSplitUiState {
  return {
    stackSplitEnabled: !!ui.stackSplitEnabled,
    stackSplitDecorativeSeparatorEnabled: !!ui.stackSplitEnabled && !!ui.stackSplitDecorativeSeparatorEnabled,
    stackSplitLowerHeight: readUiRawNumberFromSnapshot(
      ui,
      'stackSplitLowerHeight',
      DEFAULT_STACK_SPLIT_LOWER_HEIGHT
    ),
    stackSplitLowerDepthRaw: readUiRawNumberFromSnapshot(ui, 'stackSplitLowerDepth', args.depth),
    stackSplitLowerWidthRaw: readUiRawNumberFromSnapshot(ui, 'stackSplitLowerWidth', args.width),
    stackSplitLowerDoorsRaw: readUiRawIntFromSnapshot(ui, 'stackSplitLowerDoors', args.doors),
    stackSplitLowerDepthManualRaw: readUiRawScalarFromSnapshot(ui, 'stackSplitLowerDepthManual'),
    stackSplitLowerWidthManualRaw: readUiRawScalarFromSnapshot(ui, 'stackSplitLowerWidthManual'),
    stackSplitLowerDoorsManualRaw: readUiRawScalarFromSnapshot(ui, 'stackSplitLowerDoorsManual'),
  };
}

export function deriveStructureTabStackSplitState(
  args: StructureTabStackSplitArgs
): StructureTabDerivedStackSplitState {
  const stackSplitLowerDepthManual =
    typeof args.stackSplitLowerDepthManualRaw !== 'undefined'
      ? !!args.stackSplitLowerDepthManualRaw
      : Math.abs(Number(args.stackSplitLowerDepthRaw) - Number(args.depth)) > 0.01;

  const stackSplitLowerWidthManual =
    typeof args.stackSplitLowerWidthManualRaw !== 'undefined'
      ? !!args.stackSplitLowerWidthManualRaw
      : Math.abs(Number(args.stackSplitLowerWidthRaw) - Number(args.width)) > 0.01;

  const stackSplitLowerDoorsManual =
    typeof args.stackSplitLowerDoorsManualRaw !== 'undefined'
      ? !!args.stackSplitLowerDoorsManualRaw
      : Math.round(Number(args.stackSplitLowerDoorsRaw)) !== Math.round(Number(args.doors));

  return {
    stackSplitLowerDepthManual,
    stackSplitLowerWidthManual,
    stackSplitLowerDoorsManual,
    stackSplitLowerDepth: stackSplitLowerDepthManual ? args.stackSplitLowerDepthRaw : args.depth,
    stackSplitLowerWidth: stackSplitLowerWidthManual ? args.stackSplitLowerWidthRaw : args.width,
    stackSplitLowerDoors: stackSplitLowerDoorsManual ? args.stackSplitLowerDoorsRaw : args.doors,
  };
}

export function readStructureTabDefaultCellWidth(args: StructureTabDefaultCellWidthArgs): number {
  const moduleCount = Math.max(1, Number(args.modulesCount) || 1);
  const nextWidth = Number(args.width) || 0;
  return Math.max(1, Math.round((nextWidth / moduleCount) * 10) / 10);
}

export function readStructureTabCellDimsState(ui: StructureTabUiSnapshot): StructureTabCellDimsState {
  return {
    cellDimsWidth: readStructureTabOptionalCellDim(ui, 'cellDimsWidth'),
    cellDimsHeight: readStructureTabOptionalCellDim(ui, 'cellDimsHeight'),
    cellDimsDepth: readStructureTabOptionalCellDim(ui, 'cellDimsDepth'),
  };
}

export function readStructureTabOptionalCellDim(
  ui: StructureTabUiSnapshot,
  key: StructureTabCellDimKey
): number | '' {
  const raw = asOptionalNumber(readUiRawScalarFromSnapshot(ui, key));
  return typeof raw === 'number' ? raw : '';
}

export function deriveStructureTabSelectionState(
  args: StructureTabSelectionArgs
): StructureTabSelectionState {
  const fallbackPatternLabel = args.doors % 2 === 0 ? 'ברירת מחדל (זוגות)' : 'ברירת מחדל';
  const patterns: StructurePattern[] = STRUCTURE_PATTERNS[args.doors] || [
    { label: fallbackPatternLabel, structure: 'default' },
  ];
  const fallbackStruct = patterns.length ? JSON.stringify(patterns[0].structure) : '"default"';
  const structureSelect =
    args.structureSelectRaw && args.structureSelectRaw.trim() ? args.structureSelectRaw : fallbackStruct;
  const structureParsed = safeJsonParse(structureSelect);
  const structureIsDefault = structureParsed === 'default' || structureParsed == null;
  const structureArr = readStructureTabNumberArray(structureParsed);
  const isSliding = args.wardrobeType === 'sliding';
  const shouldShowStructureButtons = !isSliding && args.doors > 1;
  const shouldShowSingleDoor = !isSliding && args.doors > 1 && args.doors % 2 === 1 && structureIsDefault;
  const shouldShowHingeBtn =
    !isSliding &&
    args.doors > 0 &&
    (args.doors === 1 || (structureArr ? hasArrayItem(structureArr, 1) : false) || shouldShowSingleDoor);

  return {
    patterns,
    structureSelect,
    structureIsDefault,
    structureArr,
    isSliding,
    shouldShowStructureButtons,
    shouldShowSingleDoor,
    shouldShowHingeBtn,
  };
}
