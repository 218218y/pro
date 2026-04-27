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
  isBottom: boolean;
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
};

export type ManualLayoutSketchBoxContentHoverIntent = {
  kind: 'box_content';
  op: 'add' | 'remove';
  contentKind: string;
  boxId: string;
  freePlacement: boolean;
  boxYNorm: number | null;
  boxBaseYNorm: number | null;
  contentXNorm: number | null;
  dividerXNorm: number | null;
  dividerId: string | null;
  variant: string | null;
  depthM: number | null;
  heightM: number | null;
  removeId: string | null;
  removeIdx: number | null;
  yCenter: number | null;
  baseY: number | null;
  stackH: number | null;
  drawerH: number | null;
  drawerGap: number | null;
  drawerHeightM: number | null;
  drawerCount: number | null;
  hinge: 'left' | 'right' | null;
  doorId: string | null;
  doorLeftId: string | null;
  doorRightId: string | null;
  baseType: string | null;
  baseLegStyle: string | null;
  baseLegColor: string | null;
  baseLegHeightCm: number | null;
  baseLegWidthCm: number | null;
  corniceType: string | null;
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
};

export type ManualLayoutSketchShelfHoverIntent = {
  kind: 'shelf';
  op: 'add' | 'remove';
  removeKind: string;
  removeIdx: number | null;
  shelfIndex: number | null;
};

export type ManualLayoutSketchRodHoverIntent = {
  kind: 'rod';
  op: 'add' | 'remove';
  removeKind: 'base' | 'sketch' | '';
  removeIdx: number | null;
  rodIndex: number | null;
};

export function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

export function normalizeHinge(value: unknown): 'left' | 'right' | null {
  const hinge = readString(value);
  if (!hinge) return null;
  return hinge.trim().toLowerCase() === 'right' ? 'right' : 'left';
}

export function emptyRecord(): RecordMap {
  return {};
}
