import type { UnknownRecord } from '../../../types';
import {
  SKETCH_EXTERNAL_DRAWER_COUNT_MAX,
  SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
} from './canvas_picking_external_drawer_count_policy.js';
import { asRecord } from '../runtime/record.js';

export const MANUAL_LAYOUT_COMMAND_VERSION = 1 as const;
export const MANUAL_LAYOUT_COMMAND_FIELD = 'manualLayoutCommand' as const;

type CommandBase = {
  blockedReason: string | null;
};

export type ManualLayoutBoxAddCommand = CommandBase & {
  kind: 'box';
  op: 'add';
  xCenter: number;
  yCenter: number;
  xNorm: number | null;
};

export type ManualLayoutBoxRemoveCommand = CommandBase & {
  kind: 'box';
  op: 'remove';
  xCenter: number;
  yCenter: number;
  xNorm: number | null;
  removeId: string;
};

export type ManualLayoutShelfAddCommand = CommandBase & {
  kind: 'shelf';
  op: 'add';
  yNorm: number;
  variant: string;
  depthM: number | null;
};

export type ManualLayoutShelfRemoveCommand = {
  kind: 'shelf';
  op: 'remove';
  removeKind: 'base' | 'sketch';
  removeIdx: number | null;
  shelfIndex: number | null;
};

export type ManualLayoutRodAddCommand = CommandBase & {
  kind: 'rod';
  op: 'add';
  yNorm: number;
};

export type ManualLayoutRodRemoveCommand = {
  kind: 'rod';
  op: 'remove';
  removeKind: 'base' | 'sketch';
  removeIdx: number | null;
  rodIndex: number | null;
};

export type ManualLayoutStorageAddCommand = CommandBase & {
  kind: 'storage';
  op: 'add';
  yNorm: number;
};

export type ManualLayoutStorageRemoveCommand = {
  kind: 'storage';
  op: 'remove';
  removeKind: 'base' | 'sketch';
  removeIdx: number | null;
};

export type ManualLayoutDrawerStackBaseCommand = CommandBase & {
  kind: 'drawers' | 'ext_drawers';
  yCenter: number;
  baseY: number | null;
  removeId: string | null;
  removeKind: 'sketch' | 'std' | '';
  removePid: string | null;
  removeSlot: number | null;
  drawerH: number;
  drawerGap: number | null;
  stackH: number;
  drawerHeightM: number;
  drawerCount: number | null;
};

export type ManualLayoutDrawerStackAddCommand = Omit<
  ManualLayoutDrawerStackBaseCommand,
  'removeId' | 'removeKind' | 'removePid' | 'removeSlot'
> & {
  op: 'add';
  removeId: null;
  removeKind: '';
  removePid: null;
  removeSlot: null;
};

export type ManualLayoutDrawerStackRemoveCommand = Omit<
  ManualLayoutDrawerStackBaseCommand,
  'removeId' | 'removeKind' | 'removePid'
> &
  (
    | {
        op: 'remove';
        removeId: null;
        removeKind: 'std';
        removePid: string;
      }
    | {
        op: 'remove';
        removeId: string;
        removeKind: 'sketch' | '';
        removePid: null;
      }
  );

export type ManualLayoutCommand =
  | ManualLayoutBoxAddCommand
  | ManualLayoutBoxRemoveCommand
  | ManualLayoutShelfAddCommand
  | ManualLayoutShelfRemoveCommand
  | ManualLayoutRodAddCommand
  | ManualLayoutRodRemoveCommand
  | ManualLayoutStorageAddCommand
  | ManualLayoutStorageRemoveCommand
  | ManualLayoutDrawerStackAddCommand
  | ManualLayoutDrawerStackRemoveCommand;

export type ManualLayoutCommandEnvelope = {
  version: typeof MANUAL_LAYOUT_COMMAND_VERSION;
  command: ManualLayoutCommand;
};

export type ManualLayoutCommandDecodeResult =
  | { ok: true; command: ManualLayoutCommand }
  | {
      ok: false;
      reason: 'missing-envelope' | 'invalid-envelope-shape' | 'unknown-version' | 'invalid-command';
    };

const ENVELOPE_FIELDS = new Set(['version', 'command']);
const DRAWER_STACK_FIELDS = new Set([
  'kind',
  'op',
  'yCenter',
  'baseY',
  'removeId',
  'removeKind',
  'removePid',
  'removeSlot',
  'drawerH',
  'drawerGap',
  'stackH',
  'drawerHeightM',
  'drawerCount',
  'blockedReason',
]);
const COMMAND_FIELDS = {
  'box:add': new Set(['kind', 'op', 'xCenter', 'yCenter', 'xNorm', 'blockedReason']),
  'box:remove': new Set(['kind', 'op', 'xCenter', 'yCenter', 'xNorm', 'removeId', 'blockedReason']),
  'shelf:add': new Set(['kind', 'op', 'yNorm', 'variant', 'depthM', 'blockedReason']),
  'shelf:remove': new Set(['kind', 'op', 'removeKind', 'removeIdx', 'shelfIndex']),
  'rod:add': new Set(['kind', 'op', 'yNorm', 'blockedReason']),
  'rod:remove': new Set(['kind', 'op', 'removeKind', 'removeIdx', 'rodIndex']),
  'storage:add': new Set(['kind', 'op', 'yNorm', 'blockedReason']),
  'storage:remove': new Set(['kind', 'op', 'removeKind', 'removeIdx']),
  'drawers:add': DRAWER_STACK_FIELDS,
  'drawers:remove': DRAWER_STACK_FIELDS,
  'ext_drawers:add': DRAWER_STACK_FIELDS,
  'ext_drawers:remove': DRAWER_STACK_FIELDS,
} as const;

function hasOnlyFields(record: UnknownRecord, allowed: ReadonlySet<string>): boolean {
  const keys = Object.keys(record);
  return keys.length === allowed.size && keys.every(key => allowed.has(key));
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.trim() === value ? value : null;
}

function readNullableString(value: unknown): string | null | undefined {
  return value === null ? null : (readString(value) ?? undefined);
}

function readFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readPositive(value: unknown): number | null {
  const numberValue = readFinite(value);
  return numberValue != null && numberValue > 0 ? numberValue : null;
}

function readNonNegative(value: unknown): number | null {
  const numberValue = readFinite(value);
  return numberValue != null && numberValue >= 0 ? numberValue : null;
}

function readUnit(value: unknown): number | null {
  const numberValue = readFinite(value);
  return numberValue != null && numberValue >= 0 && numberValue <= 1 ? numberValue : null;
}

function readNullableUnit(value: unknown): number | null | undefined {
  return value === null ? null : (readUnit(value) ?? undefined);
}

function readNullablePositive(value: unknown): number | null | undefined {
  return value === null ? null : (readPositive(value) ?? undefined);
}

function readIndex(value: unknown): number | null {
  const numberValue = readFinite(value);
  return numberValue != null && Number.isInteger(numberValue) && numberValue >= 0 ? numberValue : null;
}

function readNullableIndex(value: unknown): number | null | undefined {
  return value === null ? null : (readIndex(value) ?? undefined);
}

function readBlockedReason(value: unknown): string | null | undefined {
  return value === null ? null : (readString(value) ?? undefined);
}

function readKey(record: UnknownRecord): keyof typeof COMMAND_FIELDS | null {
  const key = `${String(record.kind)}:${String(record.op)}`;
  return Object.prototype.hasOwnProperty.call(COMMAND_FIELDS, key)
    ? (key as keyof typeof COMMAND_FIELDS)
    : null;
}

function decodeCommand(value: unknown): ManualLayoutCommand | null {
  const record = asRecord(value);
  if (!record) return null;
  const key = readKey(record);
  if (!key || !hasOnlyFields(record, COMMAND_FIELDS[key])) return null;

  const blockedReason = readBlockedReason(record.blockedReason);
  if (record.kind === 'box') {
    const xCenter = readFinite(record.xCenter);
    const yCenter = readFinite(record.yCenter);
    const xNorm = readNullableUnit(record.xNorm);
    if (xCenter == null || yCenter == null || xNorm === undefined || blockedReason === undefined) return null;
    if (record.op === 'add') return { kind: 'box', op: 'add', xCenter, yCenter, xNorm, blockedReason };
    const removeId = readString(record.removeId);
    return removeId ? { kind: 'box', op: 'remove', xCenter, yCenter, xNorm, removeId, blockedReason } : null;
  }

  if (record.kind === 'shelf') {
    if (record.op === 'add') {
      const yNorm = readUnit(record.yNorm);
      const variant = readString(record.variant);
      const depthM = readNullablePositive(record.depthM);
      return yNorm != null && variant && depthM !== undefined && blockedReason !== undefined
        ? { kind: 'shelf', op: 'add', yNorm, variant, depthM, blockedReason }
        : null;
    }
    const removeIdx = readNullableIndex(record.removeIdx);
    const shelfIndex = readNullableIndex(record.shelfIndex);
    if (removeIdx === undefined || shelfIndex === undefined) return null;
    if (record.removeKind === 'sketch' && removeIdx != null && shelfIndex === null)
      return { kind: 'shelf', op: 'remove', removeKind: 'sketch', removeIdx, shelfIndex: null };
    if (record.removeKind === 'base' && removeIdx === null && shelfIndex != null)
      return { kind: 'shelf', op: 'remove', removeKind: 'base', removeIdx: null, shelfIndex };
    return null;
  }

  if (record.kind === 'rod') {
    if (record.op === 'add') {
      const yNorm = readUnit(record.yNorm);
      return yNorm != null && blockedReason !== undefined
        ? { kind: 'rod', op: 'add', yNorm, blockedReason }
        : null;
    }
    const removeIdx = readNullableIndex(record.removeIdx);
    const rodIndex = readNullableIndex(record.rodIndex);
    if (removeIdx === undefined || rodIndex === undefined) return null;
    if (record.removeKind === 'sketch' && removeIdx != null && rodIndex === null)
      return { kind: 'rod', op: 'remove', removeKind: 'sketch', removeIdx, rodIndex: null };
    if (record.removeKind === 'base' && removeIdx === null && rodIndex != null)
      return { kind: 'rod', op: 'remove', removeKind: 'base', removeIdx: null, rodIndex };
    return null;
  }

  if (record.kind === 'storage') {
    if (record.op === 'add') {
      const yNorm = readUnit(record.yNorm);
      return yNorm != null && blockedReason !== undefined
        ? { kind: 'storage', op: 'add', yNorm, blockedReason }
        : null;
    }
    const removeIdx = readNullableIndex(record.removeIdx);
    if (removeIdx === undefined) return null;
    if (record.removeKind === 'sketch' && removeIdx != null)
      return { kind: 'storage', op: 'remove', removeKind: 'sketch', removeIdx };
    if (record.removeKind === 'base' && removeIdx === null)
      return { kind: 'storage', op: 'remove', removeKind: 'base', removeIdx: null };
    return null;
  }

  if (record.kind !== 'drawers' && record.kind !== 'ext_drawers') return null;
  const yCenter = readFinite(record.yCenter);
  const baseY = record.baseY === null ? null : readFinite(record.baseY);
  const removeId = readNullableString(record.removeId);
  const removePid = readNullableString(record.removePid);
  const removeSlot = readNullableIndex(record.removeSlot);
  const drawerH = readPositive(record.drawerH);
  const drawerGap = record.drawerGap === null ? null : readNonNegative(record.drawerGap);
  const stackH = readPositive(record.stackH);
  const drawerHeightM = readPositive(record.drawerHeightM);
  const drawerCount = readNullableIndex(record.drawerCount);
  const removeKind =
    record.removeKind === 'sketch' || record.removeKind === 'std' || record.removeKind === ''
      ? record.removeKind
      : null;
  if (
    yCenter == null ||
    (record.baseY !== null && baseY == null) ||
    removeId === undefined ||
    removePid === undefined ||
    removeSlot === undefined ||
    drawerH == null ||
    (record.drawerGap !== null && drawerGap == null) ||
    stackH == null ||
    drawerHeightM == null ||
    drawerCount === undefined ||
    removeKind == null ||
    blockedReason === undefined ||
    (record.kind === 'drawers' && (drawerCount !== null || drawerGap === null)) ||
    (record.kind === 'ext_drawers' &&
      (drawerCount == null ||
        drawerCount < SKETCH_EXTERNAL_DRAWER_COUNT_MIN ||
        drawerCount > SKETCH_EXTERNAL_DRAWER_COUNT_MAX ||
        drawerGap !== null))
  )
    return null;

  const base: ManualLayoutDrawerStackBaseCommand = {
    kind: record.kind,
    yCenter,
    baseY,
    removeId,
    removeKind,
    removePid,
    removeSlot,
    drawerH,
    drawerGap,
    stackH,
    drawerHeightM,
    drawerCount,
    blockedReason,
  };
  if (record.op === 'add') {
    if (removeId !== null || removeKind !== '' || removePid !== null || removeSlot !== null) return null;
    const command: ManualLayoutDrawerStackAddCommand = {
      ...base,
      op: 'add',
      removeId: null,
      removeKind: '',
      removePid: null,
      removeSlot: null,
    };
    return command;
  }
  if (removeKind === 'std') {
    if (!removePid || removeId !== null || record.kind !== 'ext_drawers') return null;
    return { ...base, op: 'remove', removeId: null, removeKind: 'std', removePid };
  }
  if (!removeId || removePid !== null) return null;
  return { ...base, op: 'remove', removeId, removeKind, removePid: null };
}

export function createManualLayoutCommandEnvelope(command: ManualLayoutCommand): ManualLayoutCommandEnvelope {
  return { version: MANUAL_LAYOUT_COMMAND_VERSION, command };
}

export function decodeManualLayoutCommand(value: unknown): ManualLayoutCommandDecodeResult {
  const record = asRecord(value);
  const envelope = asRecord(record?.[MANUAL_LAYOUT_COMMAND_FIELD]);
  if (!envelope) return { ok: false, reason: 'missing-envelope' };
  if (!hasOnlyFields(envelope, ENVELOPE_FIELDS)) return { ok: false, reason: 'invalid-envelope-shape' };
  if (envelope.version !== MANUAL_LAYOUT_COMMAND_VERSION) return { ok: false, reason: 'unknown-version' };
  const command = decodeCommand(envelope.command);
  return command ? { ok: true, command } : { ok: false, reason: 'invalid-command' };
}
