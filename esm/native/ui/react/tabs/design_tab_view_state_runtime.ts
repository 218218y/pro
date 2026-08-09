import {
  DESIGN_TAB_WARDROBE_DEFAULTS,
  resolveDesignTabGrooveLinesAutoBaseline,
  selectColorSwatchesOrder,
  selectCustomUploadedDataURL,
  selectGrooveLinesCount,
  selectGroovesDirty,
  selectRemovedDoorsDirty,
  selectSavedColors,
  selectWardrobeType,
} from '../selectors/config_selectors.js';
import {
  readDesignTabCorniceType,
  readDesignTabDoorStyle,
  type DesignTabCorniceType,
  type DesignTabDoorStyle,
} from './design_tab_shared.js';
import { readRemovedFrameSideShelfState } from '../../../features/part_identity/api.js';
import { readUiRawIntFromSnapshot, readUiRawNumberFromSnapshot } from '../selectors/ui_raw_selectors.js';

import type { GrooveOrientation, UnknownRecord } from '../../../../../types';

export type DesignTabCfgState = {
  wardrobeType: string;
  savedColorsRaw: unknown;
  customUploadedDataURL: string;
  colorSwatchesOrderRaw: unknown;
  grooveLinesCountOverride: unknown;
  groovesDirty: boolean;
  removedDoorsDirty: boolean;
  leftFrameSideRemoved: boolean;
  rightFrameSideRemoved: boolean;
  leftFrameSideShelvesRounded: boolean;
  rightFrameSideShelvesRounded: boolean;
};

export type DesignTabUiState = {
  noMainWardrobeActive: boolean;
  doorStyle: DesignTabDoorStyle;
  colorChoice: string;
  frontColorShelfInheritanceMode: 'all' | 'brace';
  isChestMode: boolean;
  groovesEnabled: boolean;
  grooveManualEnabled: boolean;
  grooveDraftHeightCm: string;
  grooveDraftWidthCm: string;
  grooveOrientation: GrooveOrientation;
  wardrobeWidthCm: number;
  wardrobeHeightCm: number;
  wardrobeDoorsCount: number;
  splitDoors: boolean;
  removeDoorsEnabled: boolean;
  hasCornice: boolean;
  corniceType: DesignTabCorniceType;
};

export type DesignTabDoorFeaturesViewState = {
  wardrobeType: string;
  groovesEnabled: boolean;
  grooveLinesCount: string;
  grooveLinesCountIsAuto: boolean;
  grooveLinesCountAutoBaseline: number;
  splitDoors: boolean;
  removeDoorsEnabled: boolean;
};

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord | null {
  return isUnknownRecord(value) ? value : null;
}

function readBoolean(value: unknown): boolean {
  return !!value;
}

function normalizeFrontColorShelfInheritanceMode(value: unknown): 'all' | 'brace' {
  return value === 'all' ? 'all' : 'brace';
}

function readDraftString(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export function readDesignTabCfgState(cfg: unknown): DesignTabCfgState {
  const rec = asRecord(cfg);
  const frameSideState = readRemovedFrameSideShelfState(rec || {});
  return {
    wardrobeType: selectWardrobeType(rec || {}),
    savedColorsRaw: selectSavedColors(rec || {}),
    customUploadedDataURL: String(selectCustomUploadedDataURL(rec || {}) || ''),
    colorSwatchesOrderRaw: selectColorSwatchesOrder(rec || {}),
    grooveLinesCountOverride: selectGrooveLinesCount(rec || {}),
    groovesDirty: !!selectGroovesDirty(rec || {}),
    removedDoorsDirty: !!selectRemovedDoorsDirty(rec || {}),
    leftFrameSideRemoved: frameSideState.leftRemoved,
    rightFrameSideRemoved: frameSideState.rightRemoved,
    leftFrameSideShelvesRounded: frameSideState.leftRounded,
    rightFrameSideShelvesRounded: frameSideState.rightRounded,
  };
}

export function readDesignTabUiState(ui: unknown): DesignTabUiState {
  const rec = asRecord(ui);
  const doors = readUiRawIntFromSnapshot(ui, 'doors', -1);
  return {
    noMainWardrobeActive: doors === 0,
    doorStyle: readDesignTabDoorStyle(rec?.doorStyle),
    colorChoice: typeof rec?.colorChoice === 'string' && rec.colorChoice ? rec.colorChoice : '#ffffff',
    frontColorShelfInheritanceMode: normalizeFrontColorShelfInheritanceMode(
      rec?.frontColorShelfInheritanceMode
    ),
    isChestMode: readBoolean(rec?.isChestMode),
    groovesEnabled: readBoolean(rec?.groovesEnabled),
    grooveManualEnabled: readBoolean(rec?.grooveManualEnabled),
    grooveDraftHeightCm: readDraftString(rec?.currentGrooveDraftHeightCm),
    grooveDraftWidthCm: readDraftString(rec?.currentGrooveDraftWidthCm),
    grooveOrientation: rec?.currentGrooveOrientation === 'horizontal' ? 'horizontal' : 'vertical',
    wardrobeWidthCm: readUiRawNumberFromSnapshot(ui, 'width', DESIGN_TAB_WARDROBE_DEFAULTS.widthCm),
    wardrobeHeightCm: readUiRawNumberFromSnapshot(ui, 'height', DESIGN_TAB_WARDROBE_DEFAULTS.heightCm),
    wardrobeDoorsCount: doors > 0 ? doors : DESIGN_TAB_WARDROBE_DEFAULTS.doorsCount,
    splitDoors: readBoolean(rec?.splitDoors),
    removeDoorsEnabled: readBoolean(rec?.removeDoorsEnabled),
    hasCornice: readBoolean(rec?.hasCornice),
    corniceType: readDesignTabCorniceType(rec?.corniceType),
  };
}

export function deriveDesignTabDoorFeaturesState(args: {
  wardrobeType: string;
  grooveLinesCountOverride: unknown;
  groovesEnabled: boolean;
  splitDoors: boolean;
  removeDoorsEnabled: boolean;
  grooveOrientation?: unknown;
  grooveDraftHeightCm?: unknown;
  grooveDraftWidthCm?: unknown;
  wardrobeWidthCm?: unknown;
  wardrobeHeightCm?: unknown;
  wardrobeDoorsCount?: unknown;
}): DesignTabDoorFeaturesViewState {
  const grooveLinesCountIsAuto = args.grooveLinesCountOverride == null;
  return {
    wardrobeType: String(args.wardrobeType || ''),
    groovesEnabled: !!args.groovesEnabled,
    grooveLinesCount: grooveLinesCountIsAuto ? '' : String(args.grooveLinesCountOverride),
    grooveLinesCountIsAuto,
    grooveLinesCountAutoBaseline: resolveDesignTabGrooveLinesAutoBaseline(args),
    splitDoors: !!args.splitDoors,
    removeDoorsEnabled: !!args.removeDoorsEnabled,
  };
}
