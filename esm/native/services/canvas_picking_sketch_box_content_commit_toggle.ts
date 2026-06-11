import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type {
  RecordMap,
  SketchBoxToggleContentKind,
  SketchBoxToggleHoverMode,
} from './canvas_picking_sketch_box_content_commit_contracts.js';
import { createManualLayoutSketchBoxContentHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import { readRecordNumber } from './canvas_picking_sketch_box_content_commit_records.js';

export function buildFreeToggleHover(args: {
  hoverRec: RecordMap;
  boxId: string;
  contentKind: SketchBoxToggleContentKind;
  op: 'add' | 'remove';
  removeId: string;
  drawerCount?: number;
  drawerHeightM?: number | null;
  drawerH?: number | null;
}): RecordMap {
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
}): RecordMap {
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
    });
  }
  return null;
}
