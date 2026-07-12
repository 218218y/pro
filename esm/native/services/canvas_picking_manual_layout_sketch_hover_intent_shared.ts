import type { UnknownRecord } from '../../../types';
import { asRecord } from '../runtime/record.js';

type RecordMap = UnknownRecord;
export type { RecordMap };

export type ManualLayoutSketchHoverModuleKey = number | 'corner' | `corner:${number}` | null;

export type ToModuleKeyFn = (value: unknown) => ManualLayoutSketchHoverModuleKey;

export type ReadManualLayoutSketchHoverSnapshotArgs = {
  hover: unknown;
  toModuleKey: ToModuleKeyFn;
};

export type MatchManualLayoutSketchHoverArgs = {
  tool: string;
  moduleKey: ManualLayoutSketchHoverModuleKey;
  isBottom: boolean;
  now: number;
  maxAgeMs?: number;
};

export type ManualLayoutSketchHoverSnapshot = {
  hover: RecordMap | null;
  rec: RecordMap;
  tool: string;
  moduleKey: ManualLayoutSketchHoverModuleKey;
  isBottom: boolean | null;
  ts: number | null;
  kind: string;
  op: string;
};

export type ManualLayoutSketchHoverMatchState = {
  snapshot: ManualLayoutSketchHoverSnapshot;
  hoverRec: RecordMap;
  hoverKind: string;
  hoverOp: string;
  hoverOk: boolean;
};

export type ManualLayoutSketchBoxHoverIntent = {
  kind: 'box';
  op: 'add' | 'remove';
  xCenter: number | null;
  yCenter: number | null;
  xNorm: number | null;
  removeId: string | null;
  blockedReason: string | null;
};

export type ManualLayoutSketchStackHoverIntent = {
  kind: 'drawers' | 'ext_drawers';
  op: 'add' | 'remove';
  yCenter: number | null;
  baseY: number | null;
  removeId: string | null;
  removeKind: 'sketch' | 'std' | '';
  removePid: string | null;
  removeSlot: number | null;
  drawerH: number | null;
  drawerGap: number | null;
  stackH: number | null;
  drawerHeightM: number | null;
  drawerCount: number | null;
  blockedReason: string | null;
};

export type ManualLayoutSketchShelfHoverIntent = {
  kind: 'shelf';
  op: 'add' | 'remove';
  removeKind: string;
  removeIdx: number | null;
  shelfIndex: number | null;
  yNorm: number | null;
  variant: string | null;
  depthM: number | null;
  blockedReason: string | null;
};

export type ManualLayoutSketchRodHoverIntent = {
  kind: 'rod';
  op: 'add' | 'remove';
  removeKind: 'base' | 'sketch' | '';
  removeIdx: number | null;
  rodIndex: number | null;
};

export type ManualLayoutSketchStorageHoverIntent = {
  kind: 'storage';
  op: 'add' | 'remove';
  removeKind: 'base' | 'sketch' | '';
  removeIdx: number | null;
};

export function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

export function readRecordValue(record: unknown, key: string): unknown {
  const rec = asRecord(record);
  return rec ? rec[key] : null;
}

export function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readRecordValue(record, key));
}

export function readRecordString(record: unknown, key: string): string | null {
  return readString(readRecordValue(record, key));
}

export function normalizeOp(value: unknown): 'add' | 'remove' {
  return readString(value) === 'remove' ? 'remove' : 'add';
}

export function emptyRecord(): RecordMap {
  return {};
}
