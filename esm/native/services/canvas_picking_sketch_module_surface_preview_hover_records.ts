import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type { RecordMap } from './canvas_picking_sketch_module_surface_preview_contracts.js';
import { createSketchHoverHostIdentity } from './canvas_picking_sketch_hover_identity.js';
import {
  createManualLayoutCommandEnvelope,
  MANUAL_LAYOUT_COMMAND_FIELD,
} from './canvas_picking_manual_layout_command.js';

export function createShelfAddHoverRecord(args: {
  host: ManualLayoutSketchHoverHost;
  yNorm: number;
  variant: string | null;
  depthM?: number | null;
  blockedReason?: string | null;
}): RecordMap {
  const yNorm = Number.isFinite(args.yNorm) ? Math.max(0, Math.min(1, args.yNorm)) : Number.NaN;
  const variant = args.variant || 'double';
  const depthM = args.depthM != null && Number.isFinite(args.depthM) && args.depthM > 0 ? args.depthM : null;
  const blockedReason = args.blockedReason || null;
  return {
    ts: args.host.ts ?? Date.now(),
    tool: args.host.tool,
    ...createSketchHoverHostIdentity(args.host),
    kind: 'shelf',
    op: 'add',
    yNorm: Number.isFinite(yNorm) ? yNorm : undefined,
    variant,
    depthM: depthM ?? undefined,
    __wpBlockedReason: args.blockedReason || undefined,
    [MANUAL_LAYOUT_COMMAND_FIELD]: createManualLayoutCommandEnvelope({
      kind: 'shelf',
      op: 'add',
      yNorm,
      variant,
      depthM,
      blockedReason,
    }),
  };
}

export function createShelfRemoveHoverRecord(args: {
  host: ManualLayoutSketchHoverHost;
  removeKind: 'sketch' | 'base';
  removeIdx: number | null;
  shelfIndex: number | null;
}): RecordMap {
  const command = {
    kind: 'shelf' as const,
    op: 'remove' as const,
    removeKind: args.removeKind,
    removeIdx: args.removeKind === 'sketch' ? args.removeIdx : null,
    shelfIndex: args.removeKind === 'base' ? args.shelfIndex : null,
  };
  return {
    ts: args.host.ts ?? Date.now(),
    tool: args.host.tool,
    ...createSketchHoverHostIdentity(args.host),
    kind: 'shelf',
    op: 'remove',
    removeKind: args.removeKind,
    removeIdx: args.removeIdx ?? undefined,
    shelfIndex: args.shelfIndex ?? undefined,
    [MANUAL_LAYOUT_COMMAND_FIELD]: createManualLayoutCommandEnvelope(command),
  };
}

export function createStorageRemoveHoverRecord(args: {
  host: ManualLayoutSketchHoverHost;
  removeKind: 'sketch' | 'base';
  removeIdx: number | null;
}): RecordMap {
  const command = {
    kind: 'storage' as const,
    op: 'remove' as const,
    removeKind: args.removeKind,
    removeIdx: args.removeKind === 'sketch' ? args.removeIdx : null,
  };
  return {
    ts: args.host.ts ?? Date.now(),
    tool: args.host.tool,
    ...createSketchHoverHostIdentity(args.host),
    kind: 'storage',
    op: 'remove',
    removeKind: args.removeKind,
    removeIdx: args.removeIdx ?? undefined,
    [MANUAL_LAYOUT_COMMAND_FIELD]: createManualLayoutCommandEnvelope(command),
  };
}

export function createStorageAddHoverRecord(args: {
  host: ManualLayoutSketchHoverHost;
  yNorm: number;
  blockedReason?: string | null;
}): RecordMap {
  const yNorm = Number.isFinite(args.yNorm) ? Math.max(0, Math.min(1, args.yNorm)) : Number.NaN;
  const blockedReason = args.blockedReason || null;
  return {
    ts: args.host.ts ?? Date.now(),
    tool: args.host.tool,
    ...createSketchHoverHostIdentity(args.host),
    kind: 'storage',
    op: 'add',
    yNorm: Number.isFinite(yNorm) ? yNorm : undefined,
    __wpBlockedReason: args.blockedReason || undefined,
    [MANUAL_LAYOUT_COMMAND_FIELD]: createManualLayoutCommandEnvelope({
      kind: 'storage',
      op: 'add',
      yNorm,
      blockedReason,
    }),
  };
}

export function createRodAddHoverRecord(args: {
  host: ManualLayoutSketchHoverHost;
  yNorm: number;
  blockedReason?: string | null;
}): RecordMap {
  const yNorm = Number.isFinite(args.yNorm) ? Math.max(0, Math.min(1, args.yNorm)) : Number.NaN;
  const blockedReason = args.blockedReason || null;
  return {
    ts: args.host.ts ?? Date.now(),
    tool: args.host.tool,
    ...createSketchHoverHostIdentity(args.host),
    kind: 'rod',
    op: 'add',
    yNorm: Number.isFinite(yNorm) ? yNorm : undefined,
    __wpBlockedReason: args.blockedReason || undefined,
    [MANUAL_LAYOUT_COMMAND_FIELD]: createManualLayoutCommandEnvelope({
      kind: 'rod',
      op: 'add',
      yNorm,
      blockedReason,
    }),
  };
}

export function createRodRemoveHoverRecord(args: {
  host: ManualLayoutSketchHoverHost;
  removeKind: 'sketch' | 'base';
  removeIdx: number | null;
  rodIndex: number | null;
}): RecordMap {
  const command = {
    kind: 'rod' as const,
    op: 'remove' as const,
    removeKind: args.removeKind,
    removeIdx: args.removeKind === 'sketch' ? args.removeIdx : null,
    rodIndex: args.removeKind === 'base' ? args.rodIndex : null,
  };
  return {
    ts: args.host.ts ?? Date.now(),
    tool: args.host.tool,
    ...createSketchHoverHostIdentity(args.host),
    kind: 'rod',
    op: 'remove',
    removeKind: args.removeKind,
    removeIdx: args.removeIdx ?? undefined,
    rodIndex: args.rodIndex ?? undefined,
    [MANUAL_LAYOUT_COMMAND_FIELD]: createManualLayoutCommandEnvelope(command),
  };
}
