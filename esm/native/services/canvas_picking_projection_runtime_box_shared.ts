import type { UnknownRecord } from '../../../types';
import { asRecord, getProp, getRecordProp } from '../runtime/record.js';
import { __asNum } from './canvas_picking_core_helpers.js';

export type __ProjectionLocalBox = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

export type __ProjectionLocalBoxWithBackZ = __ProjectionLocalBox & {
  backZ?: number;
};

export type __Box3Like = {
  copy?: (other: unknown) => unknown;
  makeEmpty?: () => unknown;
  union?: (other: unknown) => unknown;
  setFromObject?: (other: unknown) => unknown;
  min?: unknown;
  max?: unknown;
};

export function __readUiRaw(ui: unknown): UnknownRecord {
  return getRecordProp(ui, 'raw') ?? {};
}

export function __readUiNumber(ui: unknown, key: string, defaultValue: number): number {
  return __asNum(getProp(ui, key), defaultValue);
}

export function __readRawNumber(raw: unknown, key: string, defaultValue: number): number {
  return __asNum(getProp(raw, key), defaultValue);
}

export function __readArrayRecordEntry(value: unknown, index: number): UnknownRecord | null {
  return Array.isArray(value) ? asRecord(value[index]) : null;
}
