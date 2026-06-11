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

export function readLayoutTypeId(value: unknown, fallback: LayoutTypeId = 'shelves'): LayoutTypeId {
  const raw = asStr(value, fallback).trim().toLowerCase();
  return raw === 'shelves' ||
    raw === 'hanging' ||
    raw === 'hanging_split' ||
    raw === 'mixed' ||
    raw === 'storage' ||
    raw === 'brace_shelves'
    ? raw
    : fallback;
}

export function readManualToolId(value: unknown, fallback: ManualToolId = 'shelf'): ManualToolId {
  const raw = asStr(value, fallback).trim().toLowerCase();
  return raw === 'rod' || raw === 'storage' || raw === 'shelf' ? raw : fallback;
}

export function readGridShelfVariant(value: unknown): 'regular' | 'double' | 'glass' | 'brace' {
  const raw = asStr(value, 'regular').trim().toLowerCase();
  return raw === 'double' || raw === 'glass' || raw === 'brace' || raw === 'regular' ? raw : 'regular';
}

export function readExtDrawerType(value: unknown, fallback: ExtDrawerType = 'regular'): ExtDrawerType {
  const raw = asStr(value, fallback).trim().toLowerCase();
  return raw === 'shoe' || raw === 'regular' ? raw : fallback;
}

export function readHandleType(value: unknown, fallback: HandleType = 'standard'): HandleType {
  const raw = asStr(value, fallback).trim().toLowerCase();
  return raw === 'edge' || raw === 'none' || raw === 'standard' ? raw : fallback;
}

export function readEdgeHandleVariant(
  value: unknown,
  fallback: EdgeHandleVariant = 'short'
): EdgeHandleVariant {
  return asStr(value, fallback).trim().toLowerCase() === 'long' ? 'long' : 'short';
}

export function readDoorTrimColor(value: unknown, fallback: DoorTrimUiColor = 'nickel'): DoorTrimUiColor {
  const raw = asStr(value, fallback).trim().toLowerCase();
  return raw === 'silver' || raw === 'gold' || raw === 'black' || raw === 'nickel' ? raw : fallback;
}

export function readHandleUiColor(value: unknown, fallback: HandleUiColor = 'nickel'): HandleUiColor {
  const normalizedFallback = normalizeHandleFinishColor(fallback);
  return normalizeHandleFinishColor(value ?? normalizedFallback);
}

export function readDoorTrimAxis(value: unknown, fallback: DoorTrimUiAxis = 'horizontal'): DoorTrimUiAxis {
  return asStr(value, fallback).trim().toLowerCase() === 'vertical' ? 'vertical' : 'horizontal';
}

export function readDoorTrimSpan(value: unknown, fallback: DoorTrimUiSpan = 'full'): DoorTrimUiSpan {
  const raw = asStr(value, fallback).trim().toLowerCase();
  return raw === 'full' ||
    raw === 'three_quarters' ||
    raw === 'half' ||
    raw === 'third' ||
    raw === 'quarter' ||
    raw === 'custom'
    ? raw
    : fallback;
}
