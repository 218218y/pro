import type { RoomWallId, UnknownRecord } from '../../../types';
import { asRecord } from '../runtime/record.js';

export const SKETCH_FREE_BOX_COMMAND_VERSION = 1 as const;
export const SKETCH_FREE_BOX_COMMAND_FIELD = 'freeBoxPlacementCommand' as const;

export type SketchFreeBoxGeometry = {
  centerX: number;
  centerY: number;
  heightM: number;
  widthM: number;
  depthM: number;
  placementWall?: RoomWallId;
};

export type SketchFreeBoxPlacementCommand =
  | {
      kind: 'create-free-box';
      geometry: SketchFreeBoxGeometry;
    }
  | {
      kind: 'remove-free-box';
      boxId: string;
    };

export type SketchFreeBoxPlacementCommandEnvelope = {
  version: typeof SKETCH_FREE_BOX_COMMAND_VERSION;
  command: SketchFreeBoxPlacementCommand;
};

export type SketchFreeBoxPlacementHoverDecodeResult =
  | { ok: true; value: SketchFreeBoxPlacementCommand }
  | {
      ok: false;
      reason:
        | 'invalid-hover-kind'
        | 'invalid-hover-identity'
        | 'noncanonical-hover-shape'
        | 'missing-envelope'
        | 'unknown-version'
        | 'invalid-envelope-shape'
        | 'invalid-command';
    };

const HOVER_FIELDS = new Set([
  'ts',
  'tool',
  'hostModuleKey',
  'hostIsBottom',
  'kind',
  'freePlacement',
  SKETCH_FREE_BOX_COMMAND_FIELD,
]);
const ENVELOPE_FIELDS = new Set(['version', 'command']);
const CREATE_COMMAND_FIELDS = new Set(['kind', 'geometry']);
const REMOVE_COMMAND_FIELDS = new Set(['kind', 'boxId']);
const GEOMETRY_FIELDS = new Set(['centerX', 'centerY', 'heightM', 'widthM', 'depthM', 'placementWall']);

function hasOnlyFields(record: UnknownRecord, allowed: ReadonlySet<string>): boolean {
  return Object.keys(record).every(key => allowed.has(key));
}

function isCanonicalModuleKey(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === 'number' && Number.isInteger(value) && value >= 0) ||
    value === 'corner' ||
    (typeof value === 'string' && /^corner:\d+$/u.test(value))
  );
}

function hasCanonicalHoverIdentity(record: UnknownRecord): boolean {
  return (
    typeof record.ts === 'number' &&
    Number.isFinite(record.ts) &&
    typeof record.tool === 'string' &&
    record.tool.length > 0 &&
    record.tool.trim() === record.tool &&
    Object.prototype.hasOwnProperty.call(record, 'hostModuleKey') &&
    isCanonicalModuleKey(record.hostModuleKey) &&
    typeof record.hostIsBottom === 'boolean'
  );
}

function readFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readPositive(value: unknown): number | null {
  const valueNumber = readFinite(value);
  return valueNumber != null && valueNumber > 0 ? valueNumber : null;
}

function readGeometry(value: unknown): SketchFreeBoxGeometry | null {
  const record = asRecord(value);
  if (!record || !hasOnlyFields(record, GEOMETRY_FIELDS)) return null;
  const centerX = readFinite(record.centerX);
  const centerY = readFinite(record.centerY);
  const heightM = readPositive(record.heightM);
  const widthM = readPositive(record.widthM);
  const depthM = readPositive(record.depthM);
  if (centerX == null || centerY == null || heightM == null || widthM == null || depthM == null) return null;
  const placementWall =
    record.placementWall === 'left' || record.placementWall === 'right' || record.placementWall === 'back'
      ? record.placementWall
      : null;
  if (record.placementWall != null && !placementWall) return null;
  return placementWall
    ? { centerX, centerY, heightM, widthM, depthM, placementWall }
    : { centerX, centerY, heightM, widthM, depthM };
}

function decodeCommand(value: unknown): SketchFreeBoxPlacementCommand | null {
  const record = asRecord(value);
  if (!record) return null;
  if (record.kind === 'create-free-box') {
    if (!hasOnlyFields(record, CREATE_COMMAND_FIELDS)) return null;
    const geometry = readGeometry(record.geometry);
    return geometry ? { kind: 'create-free-box', geometry } : null;
  }
  if (record.kind === 'remove-free-box') {
    if (!hasOnlyFields(record, REMOVE_COMMAND_FIELDS)) return null;
    const boxId = typeof record.boxId === 'string' ? record.boxId : '';
    if (!boxId || boxId.trim() !== boxId) return null;
    return { kind: 'remove-free-box', boxId };
  }
  return null;
}

export function createSketchFreeBoxPlacementCommandEnvelope(
  command: SketchFreeBoxPlacementCommand
): SketchFreeBoxPlacementCommandEnvelope {
  return { version: SKETCH_FREE_BOX_COMMAND_VERSION, command };
}

export function decodeSketchFreeBoxPlacementHover(value: unknown): SketchFreeBoxPlacementHoverDecodeResult {
  const record = asRecord(value);
  if (record?.kind !== 'box' || record.freePlacement !== true)
    return { ok: false, reason: 'invalid-hover-kind' };
  if (!hasOnlyFields(record, HOVER_FIELDS)) return { ok: false, reason: 'noncanonical-hover-shape' };
  if (!hasCanonicalHoverIdentity(record)) return { ok: false, reason: 'invalid-hover-identity' };

  const envelope = asRecord(record[SKETCH_FREE_BOX_COMMAND_FIELD]);
  if (!envelope) return { ok: false, reason: 'missing-envelope' };
  if (!hasOnlyFields(envelope, ENVELOPE_FIELDS)) return { ok: false, reason: 'invalid-envelope-shape' };
  if (envelope.version !== SKETCH_FREE_BOX_COMMAND_VERSION) return { ok: false, reason: 'unknown-version' };
  const command = decodeCommand(envelope.command);
  return command ? { ok: true, value: command } : { ok: false, reason: 'invalid-command' };
}
