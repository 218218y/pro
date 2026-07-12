import type { UnknownRecord } from '../../../types';
import { asRecord } from '../runtime/record.js';
import type {
  ManualLayoutBoxAddCommand,
  ManualLayoutBoxRemoveCommand,
  ManualLayoutDrawerStackAddCommand,
  ManualLayoutDrawerStackRemoveCommand,
  ManualLayoutRodAddCommand,
  ManualLayoutRodRemoveCommand,
  ManualLayoutShelfAddCommand,
  ManualLayoutShelfRemoveCommand,
  ManualLayoutStorageAddCommand,
  ManualLayoutStorageRemoveCommand,
} from './canvas_picking_manual_layout_command.js';

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

export type ManualLayoutSketchBoxHoverIntent = ManualLayoutBoxAddCommand | ManualLayoutBoxRemoveCommand;

export type ManualLayoutSketchStackHoverIntent =
  ManualLayoutDrawerStackAddCommand | ManualLayoutDrawerStackRemoveCommand;

export type ManualLayoutSketchShelfHoverIntent = ManualLayoutShelfAddCommand | ManualLayoutShelfRemoveCommand;

export type ManualLayoutSketchRodHoverIntent = ManualLayoutRodAddCommand | ManualLayoutRodRemoveCommand;

export type ManualLayoutSketchStorageHoverIntent =
  ManualLayoutStorageAddCommand | ManualLayoutStorageRemoveCommand;

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

export function emptyRecord(): RecordMap {
  return {};
}
