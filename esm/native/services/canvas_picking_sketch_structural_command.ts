import type { UnknownRecord } from '../../../types';
import { asRecord } from '../runtime/record.js';

export const SKETCH_STRUCTURAL_COMMAND_VERSION = 1 as const;
export const SKETCH_STRUCTURAL_COMMAND_FIELD = 'boxStructuralCommand' as const;
export const SKETCH_STRUCTURAL_COMMAND_HOVER_KIND = 'box_structural_command' as const;

export type SketchStructuralContentKind = 'divider' | 'shelf' | 'rod' | 'storage' | 'base' | 'cornice';

type CommandBase = {
  boxId: string;
  freePlacement: boolean;
  blockedReason: string | null;
};

type RemovalTarget = {
  removeId: string | null;
  removeIdx: number | null;
};

export type AddShelfCommand = CommandBase & {
  kind: 'add-shelf';
  op: 'add';
  boxYNorm: number;
  contentXNorm: number;
  variant: string;
  depthM: number;
};

export type RemoveShelfCommand = CommandBase &
  RemovalTarget & {
    kind: 'remove-shelf';
    op: 'remove';
  };

export type AddRodCommand = CommandBase & {
  kind: 'add-rod';
  op: 'add';
  boxYNorm: number;
  contentXNorm: number;
};

export type RemoveRodCommand = CommandBase &
  RemovalTarget & {
    kind: 'remove-rod';
    op: 'remove';
  };

export type AddStorageCommand = CommandBase & {
  kind: 'add-storage';
  op: 'add';
  boxYNorm: number;
  contentXNorm: number;
  heightM: number;
};

export type RemoveStorageCommand = CommandBase &
  RemovalTarget & {
    kind: 'remove-storage';
    op: 'remove';
  };

export type AddVerticalDividerCommand = CommandBase & {
  kind: 'add-vertical-divider';
  op: 'add';
  dividerId: string | null;
  dividerXNorm: number;
  dividerYNorm: number | null;
  dividerFrontZ: number | null;
};

export type AddHorizontalDividerCommand = CommandBase & {
  kind: 'add-horizontal-divider';
  op: 'add';
  dividerId: string | null;
  dividerYNorm: number;
  dividerXNorm: number | null;
  dividerFrontZ: number | null;
};

export type RemoveDividerCommand = CommandBase & {
  kind: 'remove-divider';
  op: 'remove';
  axis: 'vertical' | 'horizontal';
  dividerId: string | null;
  dividerXNorm: number | null;
  dividerYNorm: number | null;
};

export type SetBaseCommand = CommandBase & {
  kind: 'set-base';
  op: 'add';
  baseType: string;
  baseLegStyle: string;
  baseLegColor: string;
  baseLegPlatformMode: string;
  baseLegPlatformSideMode: string;
  baseLegPlatformSideOverhangCm: number;
  baseLegPlatformFrontOverhangCm: number;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  basePlinthHeightCm: number;
};

export type RemoveBaseCommand = CommandBase & {
  kind: 'remove-base';
  op: 'remove';
};

export type SetCorniceCommand = CommandBase & {
  kind: 'set-cornice';
  op: 'add';
  corniceType: string;
};

export type RemoveCorniceCommand = CommandBase & {
  kind: 'remove-cornice';
  op: 'remove';
};

export type SketchStructuralCommand =
  | AddShelfCommand
  | RemoveShelfCommand
  | AddRodCommand
  | RemoveRodCommand
  | AddStorageCommand
  | RemoveStorageCommand
  | AddVerticalDividerCommand
  | AddHorizontalDividerCommand
  | RemoveDividerCommand
  | SetBaseCommand
  | RemoveBaseCommand
  | SetCorniceCommand
  | RemoveCorniceCommand;

export type SketchStructuralCommandEnvelope = {
  version: typeof SKETCH_STRUCTURAL_COMMAND_VERSION;
  command: SketchStructuralCommand;
};

export type SketchStructuralCommandHoverDecodeResult =
  | {
      ok: true;
      value: {
        contentKind: SketchStructuralContentKind;
        command: SketchStructuralCommand;
      };
    }
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
  SKETCH_STRUCTURAL_COMMAND_FIELD,
]);
const ENVELOPE_FIELDS = new Set(['version', 'command']);
const BASE_FIELDS = ['kind', 'op', 'boxId', 'freePlacement', 'blockedReason'] as const;
const COMMAND_FIELDS: Readonly<Record<SketchStructuralCommand['kind'], ReadonlySet<string>>> = {
  'add-shelf': new Set([...BASE_FIELDS, 'boxYNorm', 'contentXNorm', 'variant', 'depthM']),
  'remove-shelf': new Set([...BASE_FIELDS, 'removeId', 'removeIdx']),
  'add-rod': new Set([...BASE_FIELDS, 'boxYNorm', 'contentXNorm']),
  'remove-rod': new Set([...BASE_FIELDS, 'removeId', 'removeIdx']),
  'add-storage': new Set([...BASE_FIELDS, 'boxYNorm', 'contentXNorm', 'heightM']),
  'remove-storage': new Set([...BASE_FIELDS, 'removeId', 'removeIdx']),
  'add-vertical-divider': new Set([
    ...BASE_FIELDS,
    'dividerId',
    'dividerXNorm',
    'dividerYNorm',
    'dividerFrontZ',
  ]),
  'add-horizontal-divider': new Set([
    ...BASE_FIELDS,
    'dividerId',
    'dividerYNorm',
    'dividerXNorm',
    'dividerFrontZ',
  ]),
  'remove-divider': new Set([...BASE_FIELDS, 'axis', 'dividerId', 'dividerXNorm', 'dividerYNorm']),
  'set-base': new Set([
    ...BASE_FIELDS,
    'baseType',
    'baseLegStyle',
    'baseLegColor',
    'baseLegPlatformMode',
    'baseLegPlatformSideMode',
    'baseLegPlatformSideOverhangCm',
    'baseLegPlatformFrontOverhangCm',
    'baseLegHeightCm',
    'baseLegWidthCm',
    'basePlinthHeightCm',
  ]),
  'remove-base': new Set(BASE_FIELDS),
  'set-cornice': new Set([...BASE_FIELDS, 'corniceType']),
  'remove-cornice': new Set(BASE_FIELDS),
};

const CONTENT_KIND_BY_COMMAND_KIND: Readonly<
  Record<SketchStructuralCommand['kind'], SketchStructuralContentKind>
> = {
  'add-shelf': 'shelf',
  'remove-shelf': 'shelf',
  'add-rod': 'rod',
  'remove-rod': 'rod',
  'add-storage': 'storage',
  'remove-storage': 'storage',
  'add-vertical-divider': 'divider',
  'add-horizontal-divider': 'divider',
  'remove-divider': 'divider',
  'set-base': 'base',
  'remove-base': 'base',
  'set-cornice': 'cornice',
  'remove-cornice': 'cornice',
};

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

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.trim() === value ? value : null;
}

function readNullableString(value: unknown): string | null | undefined {
  return value === null ? null : (readString(value) ?? undefined);
}

function readFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readUnit(value: unknown): number | null {
  const numberValue = readFinite(value);
  return numberValue != null && numberValue >= 0 && numberValue <= 1 ? numberValue : null;
}

function readPositive(value: unknown): number | null {
  const numberValue = readFinite(value);
  return numberValue != null && numberValue > 0 ? numberValue : null;
}

function readNonNegative(value: unknown): number | null {
  const numberValue = readFinite(value);
  return numberValue != null && numberValue >= 0 ? numberValue : null;
}

function readNullableUnit(value: unknown): number | null | undefined {
  return value === null ? null : (readUnit(value) ?? undefined);
}

function readNullableFinite(value: unknown): number | null | undefined {
  return value === null ? null : (readFinite(value) ?? undefined);
}

function readNullableIndex(value: unknown): number | null | undefined {
  if (value === null) return null;
  const numberValue = readFinite(value);
  return numberValue != null && Number.isInteger(numberValue) && numberValue >= 0 ? numberValue : undefined;
}

function readBlockedReason(value: unknown): string | null | undefined {
  return value === null ? null : (readString(value) ?? undefined);
}

function readBase(record: UnknownRecord): CommandBase | null {
  const boxId = readString(record.boxId);
  const blockedReason = readBlockedReason(record.blockedReason);
  if (!boxId || typeof record.freePlacement !== 'boolean' || blockedReason === undefined) return null;
  return { boxId, freePlacement: record.freePlacement, blockedReason };
}

function readRemovalTarget(record: UnknownRecord): RemovalTarget | null {
  const removeId = readNullableString(record.removeId);
  const removeIdx = readNullableIndex(record.removeIdx);
  if (removeId === undefined || removeIdx === undefined || (!removeId && removeIdx == null)) return null;
  return { removeId, removeIdx };
}

function validShape(record: UnknownRecord, kind: SketchStructuralCommand['kind']): boolean {
  return hasOnlyFields(record, COMMAND_FIELDS[kind]);
}

function decodeCommand(value: unknown): SketchStructuralCommand | null {
  const record = asRecord(value);
  if (!record || typeof record.kind !== 'string') return null;
  const kind = record.kind as SketchStructuralCommand['kind'];
  if (!Object.prototype.hasOwnProperty.call(COMMAND_FIELDS, kind) || !validShape(record, kind)) return null;
  const base = readBase(record);
  if (!base) return null;

  if (kind === 'add-shelf') {
    const boxYNorm = readUnit(record.boxYNorm);
    const contentXNorm = readUnit(record.contentXNorm);
    const variant = readString(record.variant);
    const depthM = readPositive(record.depthM);
    if (record.op !== 'add' || boxYNorm == null || contentXNorm == null || !variant || depthM == null)
      return null;
    return { ...base, kind, op: 'add', boxYNorm, contentXNorm, variant, depthM };
  }
  if (kind === 'remove-shelf' || kind === 'remove-rod' || kind === 'remove-storage') {
    const target = readRemovalTarget(record);
    if (record.op !== 'remove' || !target) return null;
    return { ...base, ...target, kind, op: 'remove' };
  }
  if (kind === 'add-rod') {
    const boxYNorm = readUnit(record.boxYNorm);
    const contentXNorm = readUnit(record.contentXNorm);
    if (record.op !== 'add' || boxYNorm == null || contentXNorm == null) return null;
    return { ...base, kind, op: 'add', boxYNorm, contentXNorm };
  }
  if (kind === 'add-storage') {
    const boxYNorm = readUnit(record.boxYNorm);
    const contentXNorm = readUnit(record.contentXNorm);
    const heightM = readPositive(record.heightM);
    if (record.op !== 'add' || boxYNorm == null || contentXNorm == null || heightM == null) return null;
    return { ...base, kind, op: 'add', boxYNorm, contentXNorm, heightM };
  }
  if (kind === 'add-vertical-divider') {
    const dividerId = readNullableString(record.dividerId);
    const dividerXNorm = readUnit(record.dividerXNorm);
    const dividerYNorm = readNullableUnit(record.dividerYNorm);
    const dividerFrontZ = readNullableFinite(record.dividerFrontZ);
    if (
      record.op !== 'add' ||
      dividerId === undefined ||
      dividerXNorm == null ||
      dividerYNorm === undefined ||
      dividerFrontZ === undefined
    )
      return null;
    return {
      ...base,
      kind,
      op: 'add',
      dividerId,
      dividerXNorm,
      dividerYNorm,
      dividerFrontZ,
    };
  }
  if (kind === 'add-horizontal-divider') {
    const dividerId = readNullableString(record.dividerId);
    const dividerYNorm = readUnit(record.dividerYNorm);
    const dividerXNorm = readNullableUnit(record.dividerXNorm);
    const dividerFrontZ = readNullableFinite(record.dividerFrontZ);
    if (
      record.op !== 'add' ||
      dividerId === undefined ||
      dividerYNorm == null ||
      dividerXNorm === undefined ||
      dividerFrontZ === undefined
    )
      return null;
    return {
      ...base,
      kind,
      op: 'add',
      dividerId,
      dividerYNorm,
      dividerXNorm,
      dividerFrontZ,
    };
  }
  if (kind === 'remove-divider') {
    const dividerId = readNullableString(record.dividerId);
    const dividerXNorm = readNullableUnit(record.dividerXNorm);
    const dividerYNorm = readNullableUnit(record.dividerYNorm);
    const axis = record.axis === 'horizontal' || record.axis === 'vertical' ? record.axis : null;
    if (
      record.op !== 'remove' ||
      !axis ||
      dividerId === undefined ||
      dividerXNorm === undefined ||
      dividerYNorm === undefined ||
      (!dividerId && dividerXNorm == null && dividerYNorm == null)
    )
      return null;
    return { ...base, kind, op: 'remove', axis, dividerId, dividerXNorm, dividerYNorm };
  }
  if (kind === 'set-base') {
    const baseType = readString(record.baseType);
    const baseLegStyle = readString(record.baseLegStyle);
    const baseLegColor = readString(record.baseLegColor);
    const baseLegPlatformMode = readString(record.baseLegPlatformMode);
    const baseLegPlatformSideMode = readString(record.baseLegPlatformSideMode);
    const baseLegPlatformSideOverhangCm = readNonNegative(record.baseLegPlatformSideOverhangCm);
    const baseLegPlatformFrontOverhangCm = readNonNegative(record.baseLegPlatformFrontOverhangCm);
    const baseLegHeightCm = readPositive(record.baseLegHeightCm);
    const baseLegWidthCm = readPositive(record.baseLegWidthCm);
    const basePlinthHeightCm = readPositive(record.basePlinthHeightCm);
    if (
      record.op !== 'add' ||
      !baseType ||
      !baseLegStyle ||
      !baseLegColor ||
      !baseLegPlatformMode ||
      !baseLegPlatformSideMode ||
      baseLegPlatformSideOverhangCm == null ||
      baseLegPlatformFrontOverhangCm == null ||
      baseLegHeightCm == null ||
      baseLegWidthCm == null ||
      basePlinthHeightCm == null
    )
      return null;
    return {
      ...base,
      kind,
      op: 'add',
      baseType,
      baseLegStyle,
      baseLegColor,
      baseLegPlatformMode,
      baseLegPlatformSideMode,
      baseLegPlatformSideOverhangCm,
      baseLegPlatformFrontOverhangCm,
      baseLegHeightCm,
      baseLegWidthCm,
      basePlinthHeightCm,
    };
  }
  if (kind === 'remove-base') {
    return record.op === 'remove' ? { ...base, kind, op: 'remove' } : null;
  }
  if (kind === 'set-cornice') {
    const corniceType = readString(record.corniceType);
    return record.op === 'add' && corniceType ? { ...base, kind, op: 'add', corniceType } : null;
  }
  if (kind === 'remove-cornice') {
    return record.op === 'remove' ? { ...base, kind, op: 'remove' } : null;
  }
  return null;
}

export function isStrictSketchStructuralContentKind(value: string): value is SketchStructuralContentKind {
  return (
    value === 'divider' ||
    value === 'shelf' ||
    value === 'rod' ||
    value === 'storage' ||
    value === 'base' ||
    value === 'cornice'
  );
}

export function getSketchStructuralContentKindForCommand(
  command: SketchStructuralCommand
): SketchStructuralContentKind {
  return CONTENT_KIND_BY_COMMAND_KIND[command.kind];
}

export function createSketchStructuralCommandEnvelope(
  command: SketchStructuralCommand
): SketchStructuralCommandEnvelope {
  return { version: SKETCH_STRUCTURAL_COMMAND_VERSION, command };
}

export function decodeSketchStructuralCommandHover(value: unknown): SketchStructuralCommandHoverDecodeResult {
  const record = asRecord(value);
  if (record?.kind !== SKETCH_STRUCTURAL_COMMAND_HOVER_KIND)
    return { ok: false, reason: 'invalid-hover-kind' };
  if (!hasOnlyFields(record, HOVER_FIELDS)) return { ok: false, reason: 'noncanonical-hover-shape' };
  if (!hasCanonicalHoverIdentity(record)) return { ok: false, reason: 'invalid-hover-identity' };
  const envelope = asRecord(record[SKETCH_STRUCTURAL_COMMAND_FIELD]);
  if (!envelope) return { ok: false, reason: 'missing-envelope' };
  if (!hasOnlyFields(envelope, ENVELOPE_FIELDS)) return { ok: false, reason: 'invalid-envelope-shape' };
  if (envelope.version !== SKETCH_STRUCTURAL_COMMAND_VERSION) return { ok: false, reason: 'unknown-version' };
  const command = decodeCommand(envelope.command);
  return command
    ? {
        ok: true,
        value: {
          contentKind: getSketchStructuralContentKindForCommand(command),
          command,
        },
      }
    : { ok: false, reason: 'invalid-command' };
}
