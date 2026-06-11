import {
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

import type { UnknownRecord } from '../../../../../types';

export type DesignTabCfgState = {
  wardrobeType: string;
  savedColorsRaw: unknown;
  customUploadedDataURL: string;
  colorSwatchesOrderRaw: unknown;
  grooveLinesCountOverride: unknown;
  groovesDirty: boolean;
  removedDoorsDirty: boolean;
};

export type DesignTabUiState = {
  doorStyle: DesignTabDoorStyle;
  colorChoice: string;
  groovesEnabled: boolean;
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

export function readDesignTabCfgState(cfg: unknown): DesignTabCfgState {
  const rec = asRecord(cfg);
  return {
    wardrobeType: selectWardrobeType(rec || {}),
    savedColorsRaw: selectSavedColors(rec || {}),
    customUploadedDataURL: String(selectCustomUploadedDataURL(rec || {}) || ''),
    colorSwatchesOrderRaw: selectColorSwatchesOrder(rec || {}),
    grooveLinesCountOverride: selectGrooveLinesCount(rec || {}),
    groovesDirty: !!selectGroovesDirty(rec || {}),
    removedDoorsDirty: !!selectRemovedDoorsDirty(rec || {}),
  };
}

export function readDesignTabUiState(ui: unknown): DesignTabUiState {
  const rec = asRecord(ui);
  return {
    doorStyle: readDesignTabDoorStyle(rec?.doorStyle),
    colorChoice: String(rec?.colorChoice || '#ffffff'),
    groovesEnabled: readBoolean(rec?.groovesEnabled),
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
}): DesignTabDoorFeaturesViewState {
  const grooveLinesCountIsAuto = args.grooveLinesCountOverride == null;
  return {
    wardrobeType: String(args.wardrobeType || ''),
    groovesEnabled: !!args.groovesEnabled,
    grooveLinesCount: grooveLinesCountIsAuto ? '' : String(args.grooveLinesCountOverride),
    grooveLinesCountIsAuto,
    splitDoors: !!args.splitDoors,
    removeDoorsEnabled: !!args.removeDoorsEnabled,
  };
}
