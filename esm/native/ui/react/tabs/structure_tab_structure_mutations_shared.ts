import type { UnknownRecord } from '../../../../../types';

import type { SingleDoorPos } from './structure_tab_library_helpers.js';

export type StructureTabNumericKey =
  | 'width'
  | 'height'
  | 'depth'
  | 'doors'
  | 'cellDimsWidth'
  | 'cellDimsHeight'
  | 'cellDimsDepth'
  | 'stackSplitLowerHeight'
  | 'stackSplitLowerDepth'
  | 'stackSplitLowerWidth'
  | 'stackSplitLowerDoors';

export type StructureTabStackSplitField = 'depth' | 'width' | 'doors';

export type DisplayedValueReader = (key: StructureTabNumericKey) => number;
export type StructureRawBooleanKey =
  | 'stackSplitLowerDepthManual'
  | 'stackSplitLowerWidthManual'
  | 'stackSplitLowerDoorsManual';
export type StructureRawPatch = Partial<
  Record<StructureTabNumericKey | StructureRawBooleanKey, number | boolean>
>;
export type StructureUiPatch = {
  raw?: StructureRawPatch;
  structureSelect?: string;
  singleDoorPos?: SingleDoorPos | 'left';
  stackSplitEnabled?: boolean;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function createRecord(): UnknownRecord {
  return {};
}

export function minDoorsAllowed(wardrobeType: string): number {
  return wardrobeType === 'sliding' ? 2 : 0;
}

export function normalizeDoorsValue(wardrobeType: string, value: number): number {
  return Math.max(minDoorsAllowed(wardrobeType), Math.round(Number(value) || 0));
}

export function readSingleDoorPosOr(value: unknown, fallback: SingleDoorPos): SingleDoorPos {
  return value === 'left' ||
    value === 'right' ||
    value === 'center' ||
    value === 'center-left' ||
    value === 'center-right'
    ? value
    : fallback;
}

export function buildRawUiPatch(raw: StructureRawPatch): StructureUiPatch {
  return { raw };
}

export function readRawPatch(patch: StructureUiPatch | null | undefined): UnknownRecord {
  return readRecord(patch?.raw) || createRecord();
}
