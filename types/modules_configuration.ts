// modulesConfiguration typing (incremental, high-value)
//
// Goals:
// - Provide stable, typed keys for per-module configuration objects.
// - Keep permissive index signatures so migration remains incremental.
// - Distinguish between "snapshot" (partial/legacy) and "normalized" shapes.

import type { UnknownRecord } from './common';

export interface ModulesStructureItemLike {
  doors: number;
}

export interface ModuleCustomDataLike extends UnknownRecord {
  shelves: boolean[];
  rods: boolean[];
  storage: boolean;
}

export interface ModuleSpecialDimsLike extends UnknownRecord {
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  isManualWidth?: boolean;
  isManualHeight?: boolean;
  isManualDepth?: boolean;
}

export interface ModuleSavedDimsLike extends UnknownRecord {
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
}

export interface ModuleHexCellLike extends UnknownRecord {
  enabled?: boolean;
  protrusionCm?: number;
  doorWidthCm?: number;
}

// Snapshot/legacy shape: keys may be missing, types may be wrong.
export interface ModuleConfigLike extends UnknownRecord {
  layout?: string;
  extDrawersCount?: number;
  hasShoeDrawer?: boolean;
  isCustom?: boolean;
  customData?: ModuleCustomDataLike;

  // Top modules commonly keep this (and builder normalization enforces it).
  doors?: number;

  // Lower-stack / grid configs (optional)
  gridDivisions?: number;
  gridDivisionsRow?: number;

  /** Four full-height shelf-pin boring rows, at 30 mm pitch, for this module/cell. */
  fullShelfPinBoring?: boolean;

  // Optional/known extensions used by other features.
  specialDims?: ModuleSpecialDimsLike;
  savedDims?: ModuleSavedDimsLike;
  hexCell?: ModuleHexCellLike;
}

export interface ModuleConfigPatchLike extends UnknownRecord {
  layout?: string | null;
  extDrawersCount?: number | null;
  hasShoeDrawer?: boolean | null;
  isCustom?: boolean | null;
  customData?: Partial<ModuleCustomDataLike> | null;
  doors?: number | null;
  gridDivisions?: number | null;
  gridDivisionsRow?: number | null;
  fullShelfPinBoring?: boolean | null;
  specialDims?: Partial<ModuleSpecialDimsLike> | null;
  savedDims?: Partial<ModuleSavedDimsLike> | null;
  hexCell?: Partial<ModuleHexCellLike> | null;
}

// Normalized top-module config: required keys, stable for builder/pipelines.
export interface NormalizedTopModuleConfigLike extends ModuleConfigLike {
  layout: string;
  extDrawersCount: number;
  hasShoeDrawer: boolean;
  isCustom: boolean;
  customData: ModuleCustomDataLike;
  doors: number;
}

export type ModulesConfigurationLike = ModuleConfigLike[];
export type NormalizedModulesConfigurationLike = NormalizedTopModuleConfigLike[];

// Snapshot/legacy corner customData shape: keys may be missing.
export interface CornerCustomDataLike extends UnknownRecord {
  shelves?: boolean[];
  rods?: boolean[];
  storage?: boolean;
}

// Normalized corner customData: required keys, stable for builder + domain.
export interface NormalizedCornerCustomDataLike extends CornerCustomDataLike {
  shelves: boolean[];
  rods: boolean[];
  storage: boolean;
}

export interface CornerStackSplitLowerLike extends UnknownRecord {
  modulesConfiguration?: ModuleConfigLike[];
  isCustom?: boolean;
  customData?: CornerCustomDataLike;
}

export interface CornerCellConfigurationLike extends ModuleConfigLike {}

// Snapshot/legacy cornerConfiguration shape (keys may be missing).
export interface CornerConfigurationLike extends UnknownRecord {
  layout?: string;
  extDrawersCount?: number;
  hasShoeDrawer?: boolean;
  isCustom?: boolean;
  gridDivisions?: number;
  customData?: CornerCustomDataLike;
  modulesConfiguration?: CornerCellConfigurationLike[];
  stackSplitLower?: CornerStackSplitLowerLike;
}

export interface CornerConfigurationPatchLike extends UnknownRecord {
  layout?: string | null;
  extDrawersCount?: number | null;
  hasShoeDrawer?: boolean | null;
  isCustom?: boolean | null;
  gridDivisions?: number | null;
  customData?: Partial<CornerCustomDataLike> | null;
  modulesConfiguration?: CornerCellConfigurationLike[] | null;
  stackSplitLower?: Partial<CornerStackSplitLowerLike> | null;
}

// Normalized cornerConfiguration: required keys, stable for builder + domain.
export interface NormalizedCornerConfigurationLike extends CornerConfigurationLike {
  layout: string;
  extDrawersCount: number;
  hasShoeDrawer: boolean;
  isCustom: boolean;
  gridDivisions: number;
  customData: NormalizedCornerCustomDataLike;
  modulesConfiguration?: CornerCellConfigurationLike[];
}
