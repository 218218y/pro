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

export interface ModuleInternalDrawerItemLike extends UnknownRecord {
  kind?: string;
  height?: number;
  slotIndex?: number;
  drawerType?: string;
}

// Real runtime state currently stores internal drawers mostly as numeric slot indexes,
// while a few migration paths may still materialize richer drawer objects.
// Model both forms explicitly so call-sites can narrow instead of casting.
export type ModuleInternalDrawerSlotLike = number | ModuleInternalDrawerItemLike;

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

// Snapshot/legacy shape: keys may be missing, types may be wrong.
export interface ModuleConfigLike extends UnknownRecord {
  layout?: string;
  extDrawersCount?: number;
  hasShoeDrawer?: boolean;
  intDrawersSlot?: number;
  intDrawersList?: ModuleInternalDrawerSlotLike[];
  isCustom?: boolean;
  customData?: ModuleCustomDataLike;

  // Top modules commonly keep this (and builder normalization enforces it).
  doors?: number;

  // Lower-stack / grid configs (optional)
  gridDivisions?: number;
  gridDivisionsRow?: number;

  // Optional/known extensions used by other features.
  specialDims?: ModuleSpecialDimsLike;
  savedDims?: ModuleSavedDimsLike;
}

export interface ModuleConfigPatchLike extends UnknownRecord {
  layout?: string | null;
  extDrawersCount?: number | null;
  hasShoeDrawer?: boolean | null;
  intDrawersSlot?: number | null;
  intDrawersList?: ModuleInternalDrawerSlotLike[] | null;
  isCustom?: boolean | null;
  customData?: Partial<ModuleCustomDataLike> | null;
  doors?: number | null;
  gridDivisions?: number | null;
  gridDivisionsRow?: number | null;
  specialDims?: Partial<ModuleSpecialDimsLike> | null;
  savedDims?: Partial<ModuleSavedDimsLike> | null;
}

// Normalized top-module config: required keys, stable for builder/pipelines.
export interface NormalizedTopModuleConfigLike extends ModuleConfigLike {
  layout: string;
  extDrawersCount: number;
  hasShoeDrawer: boolean;
  intDrawersSlot: number;
  intDrawersList: ModuleInternalDrawerSlotLike[];
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
  intDrawersList?: ModuleInternalDrawerSlotLike[];
  intDrawersSlot?: number;
  isCustom?: boolean;
  customData?: CornerCustomDataLike;
}

export interface CornerCellConfigurationLike extends ModuleConfigLike {}

// Snapshot/legacy cornerConfiguration shape (keys may be missing).
export interface CornerConfigurationLike extends UnknownRecord {
  layout?: string;
  extDrawersCount?: number;
  hasShoeDrawer?: boolean;
  intDrawersList?: ModuleInternalDrawerSlotLike[];
  intDrawersSlot?: number;
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
  intDrawersList?: ModuleInternalDrawerSlotLike[] | null;
  intDrawersSlot?: number | null;
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
  intDrawersList: ModuleInternalDrawerSlotLike[];
  intDrawersSlot: number;
  isCustom: boolean;
  gridDivisions: number;
  customData: NormalizedCornerCustomDataLike;
  modulesConfiguration?: CornerCellConfigurationLike[];
}
