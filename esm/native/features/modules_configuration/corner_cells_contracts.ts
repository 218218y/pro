// Corner cell contracts + shared mutable-clone helpers.
// Keeps the public corner API typed while focused owners handle patching/snapshots/defaults.

import type {
  CornerConfigurationLike as SharedCornerConfigurationLike,
  CornerCustomDataLike as SharedCornerCustomDataLike,
  ModuleConfigLike,
  ModuleInternalDrawerSlotLike,
  NormalizedCornerConfigurationLike as SharedNormalizedCornerConfigurationLike,
  NormalizedCornerCustomDataLike as SharedNormalizedCornerCustomDataLike,
} from '../../../../types';

export type CornerCellConfigLike = ModuleConfigLike;
export type UnknownRecord = Record<string, unknown>;
export type CornerCustomDataLike = SharedCornerCustomDataLike;
export type NormalizedCornerCustomDataLike = SharedNormalizedCornerCustomDataLike;
export type CornerConfigurationLike = SharedCornerConfigurationLike;
export type NormalizedCornerConfigurationLike = SharedNormalizedCornerConfigurationLike;

export interface NormalizedLowerCornerConfigurationLike extends CornerConfigurationLike {
  layout: string;
  extDrawersCount: number;
  hasShoeDrawer: boolean;
  intDrawersList: ModuleInternalDrawerSlotLike[];
  intDrawersSlot: number;
  isCustom: boolean;
  gridDivisions: number;
  customData: NormalizedCornerCustomDataLike;
  modulesConfiguration: ModuleConfigLike[];
}

export function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function asList(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function readRecord(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

export function cloneRecord<T extends UnknownRecord>(v: T): T {
  return Object.assign({}, v);
}

type CloneMutableCornerValueFn = {
  <T>(value: T[]): T[];
  <T extends UnknownRecord>(value: T): T;
  <T>(value: T): T;
};

export const cloneMutableCornerValue: CloneMutableCornerValueFn = ((value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(entry => cloneMutableCornerValue(entry));
  if (isRecord(value)) {
    const out: UnknownRecord = {};
    for (const key of Object.keys(value)) out[key] = cloneMutableCornerValue(value[key]);
    return out;
  }
  return value;
}) as CloneMutableCornerValueFn;
