import type {
  RecordMap,
  SketchBoxToggleContentKind,
  SketchBoxToggleHoverMode,
} from './canvas_picking_sketch_box_content_commit_contracts.js';
import { replaceManualLayoutSketchBoxCommandHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import {
  decodeSketchBoxContentCommandHover,
  type InternalDrawersCommand,
  type SketchExternalDrawersCommand,
} from './canvas_picking_sketch_box_content_command.js';

function buildToggledDrawerCommand(args: {
  hoverRec: RecordMap;
  boxId: string;
  contentKind: 'drawers' | 'ext_drawers';
  freePlacement: boolean;
  op: 'add' | 'remove';
  removeId: string;
}): InternalDrawersCommand | SketchExternalDrawersCommand | null {
  const decoded = decodeSketchBoxContentCommandHover(args.hoverRec);
  if (!decoded.ok || decoded.value.contentKind !== args.contentKind) return null;
  const command = decoded.value.command;
  if (command.boxId !== args.boxId || command.freePlacement !== args.freePlacement) return null;
  if (command.kind !== 'internal-drawers' && command.kind !== 'sketch-external-drawers') return null;
  return {
    ...command,
    op: args.op,
    removeId: args.op === 'remove' ? args.removeId : null,
    blockedReason: null,
  };
}

export function buildToggleHoverRecord(args: {
  hoverMode: SketchBoxToggleHoverMode;
  hoverRec: RecordMap;
  boxId?: string | null | undefined;
  contentKind: SketchBoxToggleContentKind;
  op: 'add' | 'remove';
  removeId: string;
}): RecordMap | null {
  if (args.hoverMode === 'none' || !args.boxId || args.contentKind === 'regular_ext_drawers') return null;
  const command = buildToggledDrawerCommand({
    hoverRec: args.hoverRec,
    boxId: args.boxId,
    contentKind: args.contentKind,
    freePlacement: args.hoverMode === 'free-toggle',
    op: args.op,
    removeId: args.removeId,
  });
  return command ? replaceManualLayoutSketchBoxCommandHoverRecord(args.hoverRec, command) : null;
}
