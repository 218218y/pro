import type { UnknownRecord } from '../../../../../types';

import { normalizeHandleFinishColor } from '../../../features/handle_finish_shared.js';
import { asStr } from './interior_tab_helpers.js';
import type {
  DoorTrimUiAxis,
  DoorTrimUiColor,
  DoorTrimUiSpan,
  EdgeHandleVariant,
  ExtDrawerType,
  HandleType,
  HandleUiColor,
  LayoutTypeId,
  ManualToolId,
} from './interior_tab_helpers.js';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function readLayoutTypeId(value: unknown, defaultValue: LayoutTypeId = 'shelves'): LayoutTypeId {
  const raw = asStr(value, defaultValue).trim().toLowerCase();
  return raw === 'shelves' ||
    raw === 'hanging' ||
    raw === 'hanging_split' ||
    raw === 'mixed' ||
    raw === 'storage' ||
    raw === 'brace_shelves'
    ? raw
    : defaultValue;
}

export function readManualToolId(value: unknown, defaultValue: ManualToolId = 'shelf'): ManualToolId {
  const raw = asStr(value, defaultValue).trim().toLowerCase();
  return raw === 'rod' || raw === 'storage' || raw === 'shelf' ? raw : defaultValue;
}

export function readGridShelfVariant(value: unknown): 'regular' | 'double' | 'glass' | 'brace' {
  const raw = asStr(value, 'regular').trim().toLowerCase();
  return raw === 'double' || raw === 'glass' || raw === 'brace' || raw === 'regular' ? raw : 'regular';
}

export function readExtDrawerType(value: unknown, defaultValue: ExtDrawerType = 'regular'): ExtDrawerType {
  const raw = asStr(value, defaultValue).trim().toLowerCase();
  return raw === 'shoe' || raw === 'regular' ? raw : defaultValue;
}

export function readHandleType(value: unknown, defaultValue: HandleType = 'standard'): HandleType {
  const raw = asStr(value, defaultValue).trim().toLowerCase();
  return raw === 'edge' || raw === 'none' || raw === 'standard' ? raw : defaultValue;
}

export function readEdgeHandleVariant(
  value: unknown,
  defaultValue: EdgeHandleVariant = 'short'
): EdgeHandleVariant {
  return asStr(value, defaultValue).trim().toLowerCase() === 'long' ? 'long' : 'short';
}

export function readDoorTrimColor(value: unknown, defaultValue: DoorTrimUiColor = 'nickel'): DoorTrimUiColor {
  const raw = asStr(value, defaultValue).trim().toLowerCase();
  return raw === 'silver' || raw === 'gold' || raw === 'black' || raw === 'nickel' ? raw : defaultValue;
}

export function readHandleUiColor(value: unknown, defaultValue: HandleUiColor = 'nickel'): HandleUiColor {
  const normalizedDefault = normalizeHandleFinishColor(defaultValue);
  return normalizeHandleFinishColor(value ?? normalizedDefault);
}

export function readDoorTrimAxis(
  value: unknown,
  defaultValue: DoorTrimUiAxis = 'horizontal'
): DoorTrimUiAxis {
  return asStr(value, defaultValue).trim().toLowerCase() === 'vertical' ? 'vertical' : 'horizontal';
}

export function readDoorTrimSpan(value: unknown, defaultValue: DoorTrimUiSpan = 'full'): DoorTrimUiSpan {
  const raw = asStr(value, defaultValue).trim().toLowerCase();
  return raw === 'full' ||
    raw === 'three_quarters' ||
    raw === 'half' ||
    raw === 'third' ||
    raw === 'quarter' ||
    raw === 'custom'
    ? raw
    : defaultValue;
}
