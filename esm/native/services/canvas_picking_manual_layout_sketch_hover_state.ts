import type { UnknownRecord } from '../../../types';
import {
  createSketchBoxContentCommandEnvelope,
  decodeSketchBoxContentCommandHover,
  SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND,
  type SketchBoxContentCommand,
} from './canvas_picking_sketch_box_content_command.js';
import { asRecord } from '../runtime/record.js';
import {
  createSketchStructuralCommandEnvelope,
  SKETCH_STRUCTURAL_COMMAND_HOVER_KIND,
  type SketchStructuralCommand,
  type SketchStructuralContentKind,
} from './canvas_picking_sketch_structural_command.js';
import { createSketchHoverHostIdentity } from './canvas_picking_sketch_hover_identity.js';
import {
  createManualLayoutCommandEnvelope,
  MANUAL_LAYOUT_COMMAND_FIELD,
  type ManualLayoutCommand,
  type ManualLayoutDrawerStackAddCommand,
  type ManualLayoutDrawerStackBaseCommand,
  type ManualLayoutDrawerStackRemoveCommand,
} from './canvas_picking_manual_layout_command.js';

type RecordMap = UnknownRecord;

type ManualLayoutSketchHoverModuleKey = number | 'corner' | `corner:${number}` | null;

export type ManualLayoutSketchHoverHost = {
  tool: string;
  moduleKey: ManualLayoutSketchHoverModuleKey;
  isBottom: boolean;
  ts?: number;
};

type ManualLayoutSketchHoverBaseArgs = {
  host: ManualLayoutSketchHoverHost;
  kind: string;
  op: string;
};

type ManualLayoutSketchBoxHoverArgs = {
  host: ManualLayoutSketchHoverHost;
  op: 'add' | 'remove';
  yCenter: number;
  xCenter: number;
  xNorm?: number | null;
  removeId?: string | null;
  blockedReason?: string | null;
};

type ManualLayoutSketchBoxContentHoverArgs = {
  host: ManualLayoutSketchHoverHost;
  contentKind: Exclude<SketchStructuralContentKind, 'base' | 'cornice'>;
  boxId: string;
  op: 'add' | 'remove';
  freePlacement?: boolean;
  boxYNorm?: number | null;
  contentXNorm?: number | null;
  dividerXNorm?: number | null;
  dividerYNorm?: number | null;
  dividerAxis?: string | null;
  dividerId?: string | null;
  dividerFrontZ?: number | null;
  variant?: string | null;
  depthM?: number | null;
  heightM?: number | null;
  removeId?: string | null;
  removeIdx?: number | null;
  blockedReason?: string | null;
};

type ManualLayoutSketchStackHoverArgs = {
  host: ManualLayoutSketchHoverHost;
  kind: 'drawers' | 'ext_drawers';
  op: 'add' | 'remove';
  yCenter: number;
  baseY?: number | null | undefined;
  removeId?: string | null | undefined;
  removeKind?: 'sketch' | 'std' | '' | undefined;
  removePid?: string | null | undefined;
  removeSlot?: number | null | undefined;
  drawerH?: number | null | undefined;
  drawerGap?: number | null | undefined;
  stackH?: number | null | undefined;
  drawerCount?: number | null | undefined;
  drawerHeightM?: number | null | undefined;
  hinge?: string | null | undefined;
  doorId?: string | null | undefined;
  doorLeftId?: string | null | undefined;
  doorRightId?: string | null | undefined;
  blockedReason?: string | null | undefined;
};

function withDefined(target: RecordMap, patch: Record<string, unknown>): RecordMap {
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) target[key] = value;
  }
  return target;
}

function createManualLayoutSketchHoverIdentity(host: ManualLayoutSketchHoverHost, kind: string): RecordMap {
  return {
    ts: host.ts ?? Date.now(),
    tool: host.tool,
    ...createSketchHoverHostIdentity(host),
    kind,
  };
}

function createManualLayoutSketchHoverBase(args: ManualLayoutSketchHoverBaseArgs): RecordMap {
  return { ...createManualLayoutSketchHoverIdentity(args.host, args.kind), op: args.op };
}

export function createManualLayoutSketchBoxCommandHoverRecord(args: {
  host: ManualLayoutSketchHoverHost;
  command: SketchBoxContentCommand;
}): RecordMap {
  return {
    ...createManualLayoutSketchHoverIdentity(args.host, SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND),
    boxContentCommand: createSketchBoxContentCommandEnvelope(args.command),
  };
}

export function createManualLayoutSketchStructuralCommandHoverRecord(args: {
  host: ManualLayoutSketchHoverHost;
  command: SketchStructuralCommand;
}): RecordMap {
  return {
    ...createManualLayoutSketchHoverIdentity(args.host, SKETCH_STRUCTURAL_COMMAND_HOVER_KIND),
    boxStructuralCommand: createSketchStructuralCommandEnvelope(args.command),
  };
}

export function replaceManualLayoutSketchBoxCommandHoverRecord(
  value: unknown,
  command: SketchBoxContentCommand
): RecordMap | null {
  const record = asRecord(value);
  if (!record || !decodeSketchBoxContentCommandHover(record).ok) return null;
  if (typeof record.tool !== 'string' || typeof record.hostIsBottom !== 'boolean') return null;
  if (!Object.prototype.hasOwnProperty.call(record, 'hostModuleKey')) return null;
  return {
    ts: Date.now(),
    tool: record.tool,
    hostModuleKey: record.hostModuleKey,
    hostIsBottom: record.hostIsBottom,
    kind: SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND,
    boxContentCommand: createSketchBoxContentCommandEnvelope(command),
  };
}

export function createManualLayoutSketchBlockedHoverRecord(host: ManualLayoutSketchHoverHost): RecordMap {
  return createManualLayoutSketchHoverBase({ host, kind: 'box_blocked', op: 'blocked' });
}

export function createManualLayoutSketchBoxHoverRecord(args: ManualLayoutSketchBoxHoverArgs): RecordMap {
  const blockedReason = args.blockedReason ?? null;
  const xNorm = args.xNorm ?? null;
  const command: ManualLayoutCommand | null =
    args.op === 'add'
      ? {
          kind: 'box',
          op: 'add',
          yCenter: args.yCenter,
          xCenter: args.xCenter,
          xNorm,
          blockedReason,
        }
      : args.removeId
        ? {
            kind: 'box',
            op: 'remove',
            yCenter: args.yCenter,
            xCenter: args.xCenter,
            xNorm,
            removeId: args.removeId,
            blockedReason,
          }
        : null;
  if (!command) return createManualLayoutSketchBlockedHoverRecord(args.host);
  return withDefined(createManualLayoutSketchHoverBase({ host: args.host, kind: 'box', op: args.op }), {
    yCenter: args.yCenter,
    xCenter: args.xCenter,
    xNorm: args.xNorm ?? undefined,
    removeId: args.removeId ?? undefined,
    __wpBlockedReason: args.blockedReason ?? undefined,
    [MANUAL_LAYOUT_COMMAND_FIELD]: createManualLayoutCommandEnvelope(command),
  });
}

function createStructuralCommandFromHoverArgs(
  args: ManualLayoutSketchBoxContentHoverArgs
): SketchStructuralCommand | null {
  const base = {
    boxId: args.boxId,
    freePlacement: args.freePlacement === true,
    blockedReason: args.blockedReason ?? null,
  };
  const removeId = args.removeId ?? null;
  const removeIdx = args.removeIdx ?? null;

  if (args.contentKind === 'shelf') {
    if (args.op === 'remove') {
      return removeId || removeIdx != null
        ? { ...base, kind: 'remove-shelf', op: 'remove', removeId, removeIdx }
        : null;
    }
    if (args.boxYNorm == null || args.contentXNorm == null || !args.variant || args.depthM == null)
      return null;
    return {
      ...base,
      kind: 'add-shelf',
      op: 'add',
      boxYNorm: args.boxYNorm,
      contentXNorm: args.contentXNorm,
      variant: args.variant,
      depthM: args.depthM,
    };
  }
  if (args.contentKind === 'rod') {
    if (args.op === 'remove') {
      return removeId || removeIdx != null
        ? { ...base, kind: 'remove-rod', op: 'remove', removeId, removeIdx }
        : null;
    }
    if (args.boxYNorm == null || args.contentXNorm == null) return null;
    return {
      ...base,
      kind: 'add-rod',
      op: 'add',
      boxYNorm: args.boxYNorm,
      contentXNorm: args.contentXNorm,
    };
  }
  if (args.contentKind === 'storage') {
    if (args.op === 'remove') {
      return removeId || removeIdx != null
        ? { ...base, kind: 'remove-storage', op: 'remove', removeId, removeIdx }
        : null;
    }
    if (args.boxYNorm == null || args.contentXNorm == null || args.heightM == null) return null;
    return {
      ...base,
      kind: 'add-storage',
      op: 'add',
      boxYNorm: args.boxYNorm,
      contentXNorm: args.contentXNorm,
      heightM: args.heightM,
    };
  }

  const axis = args.dividerAxis === 'horizontal' ? 'horizontal' : 'vertical';
  const dividerId = args.dividerId ?? null;
  const dividerXNorm = args.dividerXNorm ?? null;
  const dividerYNorm = args.dividerYNorm ?? null;
  if (args.op === 'remove') {
    return dividerId || dividerXNorm != null || dividerYNorm != null
      ? {
          ...base,
          kind: 'remove-divider',
          op: 'remove',
          axis,
          dividerId,
          dividerXNorm,
          dividerYNorm,
        }
      : null;
  }
  if (axis === 'horizontal') {
    if (dividerYNorm == null) return null;
    return {
      ...base,
      kind: 'add-horizontal-divider',
      op: 'add',
      dividerId,
      dividerYNorm,
      dividerXNorm,
      dividerFrontZ: args.dividerFrontZ ?? null,
    };
  }
  if (dividerXNorm == null) return null;
  return {
    ...base,
    kind: 'add-vertical-divider',
    op: 'add',
    dividerId,
    dividerXNorm,
    dividerYNorm,
    dividerFrontZ: args.dividerFrontZ ?? null,
  };
}

export function createManualLayoutSketchBoxContentHoverRecord(
  args: ManualLayoutSketchBoxContentHoverArgs
): RecordMap {
  const command = createStructuralCommandFromHoverArgs(args);
  return command
    ? createManualLayoutSketchStructuralCommandHoverRecord({ host: args.host, command })
    : createManualLayoutSketchBlockedHoverRecord(args.host);
}

export function createManualLayoutSketchStackHoverRecord(args: ManualLayoutSketchStackHoverArgs): RecordMap {
  const removeId = args.removeId ?? null;
  const removeKind: ManualLayoutDrawerStackBaseCommand['removeKind'] = args.removeKind || '';
  const removePid = args.removePid ?? null;
  const removeSlot = args.removeSlot ?? null;
  const commandBase: ManualLayoutDrawerStackBaseCommand = {
    kind: args.kind,
    yCenter: args.yCenter,
    baseY: args.baseY ?? null,
    removeId,
    removeKind,
    removePid,
    removeSlot,
    drawerH: args.drawerH ?? Number.NaN,
    drawerGap: args.drawerGap ?? null,
    stackH: args.stackH ?? Number.NaN,
    drawerHeightM: args.drawerHeightM ?? Number.NaN,
    drawerCount: args.drawerCount ?? null,
    blockedReason: args.blockedReason ?? null,
  };
  let command: ManualLayoutCommand | null = null;
  if (args.op === 'add') {
    const addCommand: ManualLayoutDrawerStackAddCommand = {
      ...commandBase,
      op: 'add',
      removeId: null,
      removeKind: '',
      removePid: null,
      removeSlot: null,
    };
    command = addCommand;
  } else if (removeKind === 'std' && removePid && !removeId) {
    const removeCommand: ManualLayoutDrawerStackRemoveCommand = {
      ...commandBase,
      op: 'remove',
      removeId: null,
      removeKind: 'std',
      removePid,
    };
    command = removeCommand;
  } else if (removeKind !== 'std' && removeId && !removePid) {
    const removeCommand: ManualLayoutDrawerStackRemoveCommand = {
      ...commandBase,
      op: 'remove',
      removeId,
      removeKind,
      removePid: null,
    };
    command = removeCommand;
  }
  if (!command) return createManualLayoutSketchBlockedHoverRecord(args.host);
  return withDefined(createManualLayoutSketchHoverBase({ host: args.host, kind: args.kind, op: args.op }), {
    yCenter: args.yCenter,
    baseY: args.baseY ?? undefined,
    removeId: args.removeId ?? undefined,
    removeKind: args.removeKind || undefined,
    removePid: args.removePid ?? undefined,
    removeSlot: args.removeSlot ?? undefined,
    drawerH: args.drawerH ?? undefined,
    drawerGap: args.drawerGap ?? undefined,
    stackH: args.stackH ?? undefined,
    drawerCount: args.drawerCount ?? undefined,
    drawerHeightM: args.drawerHeightM ?? undefined,
    hinge: args.hinge ?? undefined,
    doorId: args.doorId ?? undefined,
    doorLeftId: args.doorLeftId ?? undefined,
    doorRightId: args.doorRightId ?? undefined,
    __wpBlockedReason: args.blockedReason ?? undefined,
    [MANUAL_LAYOUT_COMMAND_FIELD]: createManualLayoutCommandEnvelope(command),
  });
}
