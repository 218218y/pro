import type { UnknownRecord } from '../../../types';
import {
  createSketchBoxContentCommandEnvelope,
  type SketchBoxContentCommand,
} from './canvas_picking_sketch_box_content_command.js';
import { createSketchHoverHostIdentity } from './canvas_picking_sketch_hover_identity.js';

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
  contentKind: string;
  boxId: string;
  op: 'add' | 'remove';
  freePlacement?: boolean;
  boxYNorm?: number | null;
  boxBaseYNorm?: number | null;
  contentXNorm?: number | null;
  dividerXNorm?: number | null;
  dividerYNorm?: number | null;
  dividerAxis?: string | null;
  dividerId?: string | null;
  dividerFrontZ?: number | null;
  snapToCenter?: boolean | null;
  variant?: string | null;
  depthM?: number | null;
  heightM?: number | null;
  removeId?: string | null;
  removeIdx?: number | null;
  yCenter?: number | null;
  baseY?: number | null;
  stackH?: number | null;
  drawerH?: number | null;
  drawerGap?: number | null;
  drawerHeightM?: number | null;
  drawerCount?: number | null;
  hasShoeDrawer?: boolean | null;
  hinge?: string | null;
  doorId?: string | null;
  doorLeftId?: string | null;
  doorRightId?: string | null;
  blockedReason?: string | null;
  command?: SketchBoxContentCommand | null;
};

type ManualLayoutSketchStackHoverArgs = {
  host: ManualLayoutSketchHoverHost;
  kind: 'drawers' | 'ext_drawers';
  op: 'add' | 'remove';
  yCenter: number;
  baseY?: number | null;
  removeId?: string | null;
  removeKind?: 'sketch' | 'std' | '';
  removePid?: string | null;
  removeSlot?: number | null;
  drawerH?: number | null;
  drawerGap?: number | null;
  stackH?: number | null;
  drawerCount?: number | null;
  drawerHeightM?: number | null;
  hinge?: string | null;
  doorId?: string | null;
  doorLeftId?: string | null;
  doorRightId?: string | null;
  blockedReason?: string | null;
};

function withDefined(target: RecordMap, patch: Record<string, unknown>): RecordMap {
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) target[key] = value;
  }
  return target;
}

function projectSketchBoxContentCommand(command: SketchBoxContentCommand | null | undefined): RecordMap {
  if (!command) return {};
  const common: RecordMap = {
    op: command.op,
    boxId: command.boxId,
    freePlacement: command.freePlacement,
    contentXNorm: command.contentXNorm,
    boxYNorm: command.boxYNorm,
    __wpBlockedReason: command.blockedReason ?? undefined,
  };
  if (command.kind === 'internal-drawers') {
    return {
      ...common,
      removeId: command.removeId ?? undefined,
      boxBaseYNorm: command.boxBaseYNorm,
      drawerHeightM: command.drawerHeightM,
      drawerH: command.drawerH,
      stackH: command.stackH,
      drawerGap: command.drawerGap,
    };
  }
  if (command.kind === 'sketch-external-drawers') {
    return {
      ...common,
      removeId: command.removeId ?? undefined,
      boxBaseYNorm: command.boxBaseYNorm,
      drawerHeightM: command.drawerHeightM,
      drawerH: command.drawerH,
      stackH: command.stackH,
      drawerCount: command.drawerCount,
    };
  }
  if (command.kind === 'regular-external-drawers') {
    return {
      ...common,
      removeId: command.removeId ?? undefined,
      boxBaseYNorm: command.boxBaseYNorm,
      drawerHeightM: command.drawerHeightM,
      drawerCount: command.drawerCount,
      hasShoeDrawer: command.hasShoeDrawer,
    };
  }
  if (command.kind === 'single-door') {
    return {
      ...common,
      hinge: command.hinge,
      doorId: command.doorId ?? undefined,
    };
  }
  if (command.kind === 'door-hinge') {
    return { ...common, doorId: command.doorId };
  }
  return common;
}

function createManualLayoutSketchHoverBase(args: ManualLayoutSketchHoverBaseArgs): RecordMap {
  return {
    ts: args.host.ts ?? Date.now(),
    tool: args.host.tool,
    ...createSketchHoverHostIdentity(args.host),
    kind: args.kind,
    op: args.op,
  };
}

export function createManualLayoutSketchBlockedHoverRecord(host: ManualLayoutSketchHoverHost): RecordMap {
  return createManualLayoutSketchHoverBase({ host, kind: 'box_blocked', op: 'blocked' });
}

export function createManualLayoutSketchBoxHoverRecord(args: ManualLayoutSketchBoxHoverArgs): RecordMap {
  return withDefined(createManualLayoutSketchHoverBase({ host: args.host, kind: 'box', op: args.op }), {
    yCenter: args.yCenter,
    xCenter: args.xCenter,
    xNorm: args.xNorm ?? undefined,
    removeId: args.removeId ?? undefined,
    __wpBlockedReason: args.blockedReason ?? undefined,
  });
}

export function createManualLayoutSketchBoxContentHoverRecord(
  args: ManualLayoutSketchBoxContentHoverArgs
): RecordMap {
  const commandProjection = projectSketchBoxContentCommand(args.command);
  return withDefined(
    createManualLayoutSketchHoverBase({
      host: args.host,
      kind: 'box_content',
      op: args.command?.op ?? args.op,
    }),
    {
      contentKind: args.contentKind,
      boxId: args.boxId,
      freePlacement: args.freePlacement,
      boxYNorm: args.boxYNorm ?? undefined,
      boxBaseYNorm: args.boxBaseYNorm ?? undefined,
      contentXNorm: args.contentXNorm ?? undefined,
      dividerXNorm: args.dividerXNorm ?? undefined,
      dividerYNorm: args.dividerYNorm ?? undefined,
      dividerAxis: args.dividerAxis ?? undefined,
      dividerId: args.dividerId ?? undefined,
      dividerFrontZ: args.dividerFrontZ ?? undefined,
      snapToCenter: args.snapToCenter ?? undefined,
      variant: args.variant ?? undefined,
      depthM: args.depthM ?? undefined,
      heightM: args.heightM ?? undefined,
      removeId: args.removeId ?? undefined,
      removeIdx: args.removeIdx ?? undefined,
      yCenter: args.yCenter ?? undefined,
      baseY: args.baseY ?? undefined,
      stackH: args.stackH ?? undefined,
      drawerH: args.drawerH ?? undefined,
      drawerGap: args.drawerGap ?? undefined,
      drawerHeightM: args.drawerHeightM ?? undefined,
      drawerCount: args.drawerCount ?? undefined,
      hasShoeDrawer: args.hasShoeDrawer ?? undefined,
      hinge: args.hinge ?? undefined,
      doorId: args.doorId ?? undefined,
      doorLeftId: args.doorLeftId ?? undefined,
      doorRightId: args.doorRightId ?? undefined,
      __wpBlockedReason: args.blockedReason ?? undefined,
      ...commandProjection,
      boxContentCommand: args.command ? createSketchBoxContentCommandEnvelope(args.command) : undefined,
    }
  );
}

export function createManualLayoutSketchStackHoverRecord(args: ManualLayoutSketchStackHoverArgs): RecordMap {
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
  });
}
