import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type {
  RecordMap,
  SketchBoxToggleContentKind,
  SketchBoxToggleHoverMode,
} from './canvas_picking_sketch_box_content_commit_contracts.js';
import { createManualLayoutSketchBoxContentHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import {
  createSketchBoxContentCommandEnvelope,
  decodeSketchBoxContentCommand,
  type InternalDrawersCommand,
  type SketchExternalDrawersCommand,
} from './canvas_picking_sketch_box_content_command.js';
import { readRecordNumber } from './canvas_picking_sketch_box_content_commit_records.js';

function buildToggledDrawerCommand(args: {
  hoverRec: RecordMap;
  boxId: string;
  contentKind: 'drawers' | 'ext_drawers';
  freePlacement: boolean;
  op: 'add' | 'remove';
  removeId: string;
}): InternalDrawersCommand | SketchExternalDrawersCommand | null {
  const decoded = decodeSketchBoxContentCommand({
    record: args.hoverRec,
    expectedContentKind: args.contentKind,
    expectedBoxId: args.boxId,
    expectedFreePlacement: args.freePlacement,
  });
  if (!decoded.ok) return null;
  if (decoded.value.kind !== 'internal-drawers' && decoded.value.kind !== 'sketch-external-drawers')
    return null;
  return {
    ...decoded.value,
    op: args.op,
    removeId: args.op === 'remove' ? args.removeId : null,
    blockedReason: null,
  };
}

export function buildFreeToggleHover(args: {
  hoverRec: RecordMap;
  boxId: string;
  contentKind: SketchBoxToggleContentKind;
  op: 'add' | 'remove';
  removeId: string;
  drawerCount?: number;
  drawerHeightM?: number | null;
  drawerH?: number | null;
  hasShoeDrawer?: boolean | null;
}): RecordMap | null {
  if (args.contentKind === 'regular_ext_drawers') return null;
  const command = buildToggledDrawerCommand({
    hoverRec: args.hoverRec,
    boxId: args.boxId,
    contentKind: args.contentKind,
    freePlacement: true,
    op: args.op,
    removeId: args.removeId,
  });
  if (!command) return null;
  return {
    ...args.hoverRec,
    ts: Date.now(),
    op: args.op,
    removeId: args.op === 'remove' ? args.removeId : '',
    removeIdx: null,
    kind: 'box_content',
    contentKind: args.contentKind,
    boxId: args.boxId,
    freePlacement: true,
    ...(args.drawerCount != null ? { drawerCount: args.drawerCount } : {}),
    ...(args.drawerHeightM != null ? { drawerHeightM: args.drawerHeightM } : {}),
    ...(args.drawerH != null ? { drawerH: args.drawerH } : {}),
    ...(args.hasShoeDrawer != null ? { hasShoeDrawer: args.hasShoeDrawer } : {}),
    boxContentCommand: createSketchBoxContentCommandEnvelope(command),
  };
}

export function buildManualToggleHover(args: {
  hoverRec: RecordMap;
  hoverHost: ManualLayoutSketchHoverHost;
  boxId: string;
  contentKind: SketchBoxToggleContentKind;
  op: 'add' | 'remove';
  removeId: string;
  drawerCount?: number;
  drawerHeightM?: number | null;
  drawerH?: number | null;
  hasShoeDrawer?: boolean | null;
}): RecordMap | null {
  if (args.contentKind === 'regular_ext_drawers') return null;
  const command = buildToggledDrawerCommand({
    hoverRec: args.hoverRec,
    boxId: args.boxId,
    contentKind: args.contentKind,
    freePlacement: false,
    op: args.op,
    removeId: args.removeId,
  });
  if (!command) return null;
  return createManualLayoutSketchBoxContentHoverRecord({
    host: args.hoverHost,
    contentKind: args.contentKind,
    boxId: args.boxId,
    op: args.op,
    removeId: args.op === 'remove' ? args.removeId : '',
    contentXNorm: readRecordNumber(args.hoverRec, 'contentXNorm'),
    boxYNorm: readRecordNumber(args.hoverRec, 'boxYNorm'),
    boxBaseYNorm: readRecordNumber(args.hoverRec, 'boxBaseYNorm'),
    yCenter: readRecordNumber(args.hoverRec, 'yCenter'),
    baseY: readRecordNumber(args.hoverRec, 'baseY'),
    stackH: readRecordNumber(args.hoverRec, 'stackH'),
    drawerH: args.drawerH ?? readRecordNumber(args.hoverRec, 'drawerH'),
    drawerGap: readRecordNumber(args.hoverRec, 'drawerGap'),
    drawerHeightM: args.drawerHeightM ?? readRecordNumber(args.hoverRec, 'drawerHeightM'),
    drawerCount: args.drawerCount ?? readRecordNumber(args.hoverRec, 'drawerCount'),
    hasShoeDrawer:
      args.hasShoeDrawer ??
      (args.hoverRec.hasShoeDrawer === true ? true : args.hoverRec.hasShoeDrawer === false ? false : null),
    command,
  });
}

export function buildToggleHoverRecord(args: {
  hoverMode: SketchBoxToggleHoverMode;
  hoverRec: RecordMap;
  hoverHost?: ManualLayoutSketchHoverHost | null;
  boxId?: string | null;
  contentKind: SketchBoxToggleContentKind;
  op: 'add' | 'remove';
  removeId: string;
  drawerCount?: number;
  drawerHeightM?: number | null;
  drawerH?: number | null;
  hasShoeDrawer?: boolean | null;
}): RecordMap | null {
  if (args.hoverMode === 'free-toggle' && args.boxId) {
    return buildFreeToggleHover({
      hoverRec: args.hoverRec,
      boxId: args.boxId,
      contentKind: args.contentKind,
      op: args.op,
      removeId: args.removeId,
      drawerCount: args.drawerCount,
      drawerHeightM: args.drawerHeightM,
      drawerH: args.drawerH,
      hasShoeDrawer:
        args.hasShoeDrawer ??
        (args.hoverRec.hasShoeDrawer === true ? true : args.hoverRec.hasShoeDrawer === false ? false : null),
    });
  }
  if (args.hoverMode === 'manual-toggle' && args.boxId && args.hoverHost) {
    return buildManualToggleHover({
      hoverRec: args.hoverRec,
      hoverHost: args.hoverHost,
      boxId: args.boxId,
      contentKind: args.contentKind,
      op: args.op,
      removeId: args.removeId,
      drawerCount: args.drawerCount,
      drawerHeightM: args.drawerHeightM,
      drawerH: args.drawerH,
      hasShoeDrawer:
        args.hasShoeDrawer ??
        (args.hoverRec.hasShoeDrawer === true ? true : args.hoverRec.hasShoeDrawer === false ? false : null),
    });
  }
  return null;
}
