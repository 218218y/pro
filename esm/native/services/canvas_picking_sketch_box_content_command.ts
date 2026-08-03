import type { UnknownRecord } from '../../../types';
import {
  SKETCH_EXTERNAL_DRAWER_COUNT_MAX,
  SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
} from './canvas_picking_external_drawer_count_policy.js';
import { asRecord } from '../runtime/record.js';

export const SKETCH_BOX_CONTENT_COMMAND_VERSION = 1 as const;
export const SKETCH_BOX_CONTENT_COMMAND_FIELD = 'boxContentCommand' as const;
export const SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND = 'box_content_command' as const;

export type SketchBoxDrawerContentKind = 'drawers' | 'ext_drawers' | 'regular_ext_drawers';
export type SketchBoxDoorContentKind = 'door' | 'double_door' | 'door_hinge';
export type StrictSketchBoxContentKind = SketchBoxDrawerContentKind | SketchBoxDoorContentKind;

type CommandBase = {
  boxId: string;
  freePlacement: boolean;
  blockedReason: string | null;
};

type DrawerGeometry = {
  contentXNorm: number;
  boxYNorm: number;
  boxBaseYNorm: number;
  drawerHeightM: number;
  drawerH: number;
  stackH: number;
};

export type InternalDrawersCommand = CommandBase &
  DrawerGeometry & {
    kind: 'internal-drawers';
    op: 'add' | 'remove';
    removeId: string | null;
    drawerGap: number;
  };

export type SketchExternalDrawersCommand = CommandBase &
  DrawerGeometry & {
    kind: 'sketch-external-drawers';
    op: 'add' | 'remove';
    removeId: string | null;
    drawerCount: number;
  };

export type RegularExternalDrawersCommand = CommandBase & {
  kind: 'regular-external-drawers';
  op: 'add' | 'remove';
  removeId: string | null;
  contentXNorm: number;
  boxYNorm: number;
  boxBaseYNorm: number;
  drawerCount: number;
  hasShoeDrawer: boolean;
  drawerHeightM: number;
};

export type SingleDoorCommand = CommandBase & {
  kind: 'single-door';
  op: 'add' | 'remove';
  contentXNorm: number;
  boxYNorm: number;
  hinge: 'left' | 'right';
  doorId: string | null;
};

export type DoubleDoorCommand = CommandBase & {
  kind: 'double-door';
  op: 'add' | 'remove';
  contentXNorm: number;
  boxYNorm: number;
};

export type DoorHingeCommand = CommandBase & {
  kind: 'door-hinge';
  op: 'add';
  contentXNorm: number;
  boxYNorm: number;
  doorId: string;
};

export type SketchBoxContentCommand =
  | InternalDrawersCommand
  | SketchExternalDrawersCommand
  | RegularExternalDrawersCommand
  | SingleDoorCommand
  | DoubleDoorCommand
  | DoorHingeCommand;

export type SketchBoxContentCommandEnvelope = {
  version: typeof SKETCH_BOX_CONTENT_COMMAND_VERSION;
  command: SketchBoxContentCommand;
};

export type SketchBoxContentCommandDecodeFailure =
  | 'missing-envelope'
  | 'unknown-version'
  | 'invalid-hover-kind'
  | 'invalid-hover-identity'
  | 'noncanonical-hover-shape'
  | 'invalid-command'
  | 'content-kind-mismatch'
  | 'box-id-mismatch'
  | 'free-placement-mismatch';

export type SketchBoxContentCommandDecodeResult =
  { ok: true; value: SketchBoxContentCommand } | { ok: false; reason: SketchBoxContentCommandDecodeFailure };

export type SketchBoxContentCommandHoverValue = {
  contentKind: StrictSketchBoxContentKind;
  command: SketchBoxContentCommand;
};

export type SketchBoxContentCommandHoverDecodeResult =
  | { ok: true; value: SketchBoxContentCommandHoverValue }
  | { ok: false; reason: SketchBoxContentCommandDecodeFailure };

const COMMAND_KIND_BY_CONTENT_KIND: Readonly<
  Record<StrictSketchBoxContentKind, SketchBoxContentCommand['kind']>
> = {
  drawers: 'internal-drawers',
  ext_drawers: 'sketch-external-drawers',
  regular_ext_drawers: 'regular-external-drawers',
  door: 'single-door',
  double_door: 'double-door',
  door_hinge: 'door-hinge',
};

const CONTENT_KIND_BY_COMMAND_KIND: Readonly<
  Record<SketchBoxContentCommand['kind'], StrictSketchBoxContentKind>
> = {
  'internal-drawers': 'drawers',
  'sketch-external-drawers': 'ext_drawers',
  'regular-external-drawers': 'regular_ext_drawers',
  'single-door': 'door',
  'double-door': 'double_door',
  'door-hinge': 'door_hinge',
};

const COMMAND_HOVER_FIELDS = new Set([
  'ts',
  'tool',
  'hostModuleKey',
  'hostIsBottom',
  'kind',
  SKETCH_BOX_CONTENT_COMMAND_FIELD,
]);

const BASE_COMMAND_FIELDS = ['kind', 'boxId', 'freePlacement', 'blockedReason', 'op'] as const;
const COMMAND_FIELDS_BY_KIND: Readonly<Record<SketchBoxContentCommand['kind'], ReadonlySet<string>>> = {
  'internal-drawers': new Set([
    ...BASE_COMMAND_FIELDS,
    'removeId',
    'contentXNorm',
    'boxYNorm',
    'boxBaseYNorm',
    'drawerHeightM',
    'drawerH',
    'stackH',
    'drawerGap',
  ]),
  'sketch-external-drawers': new Set([
    ...BASE_COMMAND_FIELDS,
    'removeId',
    'contentXNorm',
    'boxYNorm',
    'boxBaseYNorm',
    'drawerHeightM',
    'drawerH',
    'stackH',
    'drawerCount',
  ]),
  'regular-external-drawers': new Set([
    ...BASE_COMMAND_FIELDS,
    'removeId',
    'contentXNorm',
    'boxYNorm',
    'boxBaseYNorm',
    'drawerCount',
    'hasShoeDrawer',
    'drawerHeightM',
  ]),
  'single-door': new Set([...BASE_COMMAND_FIELDS, 'contentXNorm', 'boxYNorm', 'hinge', 'doorId']),
  'double-door': new Set([...BASE_COMMAND_FIELDS, 'contentXNorm', 'boxYNorm']),
  'door-hinge': new Set([...BASE_COMMAND_FIELDS, 'contentXNorm', 'boxYNorm', 'doorId']),
};

function hasOnlyCommandFields(record: UnknownRecord, kind: SketchBoxContentCommand['kind']): boolean {
  const allowed = COMMAND_FIELDS_BY_KIND[kind];
  return Object.keys(record).every(key => allowed.has(key));
}

function isCanonicalHoverModuleKey(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === 'number' && Number.isInteger(value) && value >= 0) ||
    value === 'corner' ||
    (typeof value === 'string' && /^corner:\d+$/.test(value))
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
    isCanonicalHoverModuleKey(record.hostModuleKey) &&
    typeof record.hostIsBottom === 'boolean'
  );
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) return null;
  return value;
}

function readNullableString(value: unknown): string | null | undefined {
  return value === null ? null : (readString(value) ?? undefined);
}

function readBoolean(value: unknown): boolean | null {
  return value === true ? true : value === false ? false : null;
}

function readFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readUnit(value: unknown): number | null {
  const n = readFinite(value);
  return n != null && n >= 0 && n <= 1 ? n : null;
}

function readPositive(value: unknown): number | null {
  const n = readFinite(value);
  return n != null && n > 0 ? n : null;
}

function readNonNegative(value: unknown): number | null {
  const n = readFinite(value);
  return n != null && n >= 0 ? n : null;
}

function readIntegerInRange(value: unknown, min: number, max: number): number | null {
  const n = readFinite(value);
  return n != null && Number.isInteger(n) && n >= min && n <= max ? n : null;
}

function readBlockedReason(value: unknown): string | null | undefined {
  return value === null ? null : (readString(value) ?? undefined);
}

function readBase(record: UnknownRecord): CommandBase | null {
  const boxId = readString(record.boxId);
  const freePlacement = readBoolean(record.freePlacement);
  const blockedReason = readBlockedReason(record.blockedReason);
  if (!boxId || freePlacement == null || blockedReason === undefined) return null;
  return { boxId, freePlacement, blockedReason };
}

function readDrawerGeometry(record: UnknownRecord): DrawerGeometry | null {
  const contentXNorm = readUnit(record.contentXNorm);
  const boxYNorm = readUnit(record.boxYNorm);
  const boxBaseYNorm = readUnit(record.boxBaseYNorm);
  const drawerHeightM = readPositive(record.drawerHeightM);
  const drawerH = readPositive(record.drawerH);
  const stackH = readPositive(record.stackH);
  if (
    contentXNorm == null ||
    boxYNorm == null ||
    boxBaseYNorm == null ||
    drawerHeightM == null ||
    drawerH == null ||
    stackH == null
  )
    return null;
  return { contentXNorm, boxYNorm, boxBaseYNorm, drawerHeightM, drawerH, stackH };
}

function readOp(value: unknown): 'add' | 'remove' | null {
  return value === 'add' || value === 'remove' ? value : null;
}

function decodeCommand(value: unknown): SketchBoxContentCommand | null {
  const record = asRecord(value);
  if (!record) return null;
  const base = readBase(record);
  const op = readOp(record.op);
  if (!base || !op) return null;

  if (record.kind === 'internal-drawers') {
    if (!hasOnlyCommandFields(record, 'internal-drawers')) return null;
    const geometry = readDrawerGeometry(record);
    const removeId = readNullableString(record.removeId);
    const drawerGap = readNonNegative(record.drawerGap);
    if (
      !geometry ||
      removeId === undefined ||
      drawerGap == null ||
      (op === 'remove' && !removeId) ||
      (op === 'add' && removeId !== null)
    )
      return null;
    return { ...base, ...geometry, kind: 'internal-drawers', op, removeId, drawerGap };
  }

  if (record.kind === 'sketch-external-drawers') {
    if (!hasOnlyCommandFields(record, 'sketch-external-drawers')) return null;
    const geometry = readDrawerGeometry(record);
    const removeId = readNullableString(record.removeId);
    const drawerCount = readIntegerInRange(
      record.drawerCount,
      SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
      SKETCH_EXTERNAL_DRAWER_COUNT_MAX
    );
    if (
      !geometry ||
      removeId === undefined ||
      drawerCount == null ||
      (op === 'remove' && !removeId) ||
      (op === 'add' && removeId !== null)
    )
      return null;
    return { ...base, ...geometry, kind: 'sketch-external-drawers', op, removeId, drawerCount };
  }

  if (record.kind === 'regular-external-drawers') {
    if (!hasOnlyCommandFields(record, 'regular-external-drawers')) return null;
    const removeId = readNullableString(record.removeId);
    const contentXNorm = readUnit(record.contentXNorm);
    const boxYNorm = readUnit(record.boxYNorm);
    const boxBaseYNorm = readUnit(record.boxBaseYNorm);
    const drawerCount = readIntegerInRange(record.drawerCount, 0, SKETCH_EXTERNAL_DRAWER_COUNT_MAX);
    const hasShoeDrawer = readBoolean(record.hasShoeDrawer);
    const drawerHeightM = readPositive(record.drawerHeightM);
    if (
      removeId === undefined ||
      contentXNorm == null ||
      boxYNorm == null ||
      boxBaseYNorm == null ||
      drawerCount == null ||
      hasShoeDrawer == null ||
      drawerHeightM == null ||
      (op === 'remove' && !removeId) ||
      (drawerCount === 0 && !hasShoeDrawer && !removeId)
    )
      return null;
    return {
      ...base,
      kind: 'regular-external-drawers',
      op,
      removeId,
      contentXNorm,
      boxYNorm,
      boxBaseYNorm,
      drawerCount,
      hasShoeDrawer,
      drawerHeightM,
    };
  }

  if (record.kind === 'single-door') {
    if (!hasOnlyCommandFields(record, 'single-door')) return null;
    const contentXNorm = readUnit(record.contentXNorm);
    const boxYNorm = readUnit(record.boxYNorm);
    const hinge = record.hinge === 'left' || record.hinge === 'right' ? record.hinge : null;
    const doorId = readNullableString(record.doorId);
    if (
      contentXNorm == null ||
      boxYNorm == null ||
      !hinge ||
      doorId === undefined ||
      (op === 'remove' && !doorId)
    )
      return null;
    return { ...base, kind: 'single-door', op, contentXNorm, boxYNorm, hinge, doorId };
  }

  if (record.kind === 'double-door') {
    if (!hasOnlyCommandFields(record, 'double-door')) return null;
    const contentXNorm = readUnit(record.contentXNorm);
    const boxYNorm = readUnit(record.boxYNorm);
    if (contentXNorm == null || boxYNorm == null) return null;
    return { ...base, kind: 'double-door', op, contentXNorm, boxYNorm };
  }

  if (record.kind === 'door-hinge') {
    if (!hasOnlyCommandFields(record, 'door-hinge')) return null;
    const contentXNorm = readUnit(record.contentXNorm);
    const boxYNorm = readUnit(record.boxYNorm);
    const doorId = readString(record.doorId);
    if (op !== 'add' || contentXNorm == null || boxYNorm == null || !doorId) return null;
    return { ...base, kind: 'door-hinge', op: 'add', contentXNorm, boxYNorm, doorId };
  }

  return null;
}

export function isStrictSketchBoxContentKind(value: string): value is StrictSketchBoxContentKind {
  return Object.prototype.hasOwnProperty.call(COMMAND_KIND_BY_CONTENT_KIND, value);
}

export function createSketchBoxContentCommandEnvelope(
  command: SketchBoxContentCommand
): SketchBoxContentCommandEnvelope {
  return { version: SKETCH_BOX_CONTENT_COMMAND_VERSION, command };
}

function decodeSketchBoxContentCommandEnvelope(recordValue: unknown): SketchBoxContentCommandDecodeResult {
  const record = asRecord(recordValue);
  const envelope = asRecord(record?.[SKETCH_BOX_CONTENT_COMMAND_FIELD]);
  if (!envelope) return { ok: false, reason: 'missing-envelope' };
  if (envelope.version !== SKETCH_BOX_CONTENT_COMMAND_VERSION)
    return { ok: false, reason: 'unknown-version' };
  const command = decodeCommand(envelope.command);
  return command ? { ok: true, value: command } : { ok: false, reason: 'invalid-command' };
}

export function getSketchBoxContentKindForCommand(
  command: SketchBoxContentCommand
): StrictSketchBoxContentKind {
  return CONTENT_KIND_BY_COMMAND_KIND[command.kind];
}

export function decodeSketchBoxContentCommandHover(
  recordValue: unknown
): SketchBoxContentCommandHoverDecodeResult {
  const record = asRecord(recordValue);
  if (record?.kind !== SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND)
    return { ok: false, reason: 'invalid-hover-kind' };
  if (Object.keys(record).some(key => !COMMAND_HOVER_FIELDS.has(key)))
    return { ok: false, reason: 'noncanonical-hover-shape' };
  if (!hasCanonicalHoverIdentity(record)) return { ok: false, reason: 'invalid-hover-identity' };
  const decoded = decodeSketchBoxContentCommandEnvelope(record);
  if (decoded.ok === false) return { ok: false, reason: decoded.reason };
  return {
    ok: true,
    value: {
      contentKind: getSketchBoxContentKindForCommand(decoded.value),
      command: decoded.value,
    },
  };
}

export function decodeSketchBoxContentCommand(args: {
  record: unknown;
  expectedContentKind: StrictSketchBoxContentKind;
  expectedBoxId?: string | null;
  expectedFreePlacement?: boolean | null;
}): SketchBoxContentCommandDecodeResult {
  const decoded = decodeSketchBoxContentCommandEnvelope(args.record);
  if (!decoded.ok) return decoded;
  const command = decoded.value;
  if (command.kind !== COMMAND_KIND_BY_CONTENT_KIND[args.expectedContentKind])
    return { ok: false, reason: 'content-kind-mismatch' };
  if (args.expectedBoxId && command.boxId !== args.expectedBoxId)
    return { ok: false, reason: 'box-id-mismatch' };
  if (args.expectedFreePlacement != null && command.freePlacement !== args.expectedFreePlacement)
    return { ok: false, reason: 'free-placement-mismatch' };
  return { ok: true, value: command };
}
