import {
  emptyRecord,
  readRecordNumber,
  readRecordString,
  type ManualLayoutSketchHoverMatchState,
  type ManualLayoutSketchHoverSnapshot,
  type MatchManualLayoutSketchHoverArgs,
  type ReadManualLayoutSketchHoverSnapshotArgs,
} from './canvas_picking_manual_layout_sketch_hover_intent_shared.js';
import {
  readSketchHoverHostIsBottom,
  readSketchHoverHostModuleKey,
} from './canvas_picking_sketch_hover_matching.js';
import { asRecord } from '../runtime/record.js';

export function readManualLayoutSketchHoverSnapshot(
  args: ReadManualLayoutSketchHoverSnapshotArgs
): ManualLayoutSketchHoverSnapshot {
  const hover = asRecord(args.hover);
  if (!hover) {
    return {
      hover: null,
      rec: emptyRecord(),
      tool: '',
      moduleKey: null,
      isBottom: false,
      ts: null,
      kind: '',
      op: '',
    };
  }
  return {
    hover,
    rec: hover,
    tool: readRecordString(hover, 'tool') || '',
    moduleKey: readSketchHoverHostModuleKey(hover, args.toModuleKey),
    isBottom: readSketchHoverHostIsBottom(hover),
    ts: readRecordNumber(hover, 'ts'),
    kind: readRecordString(hover, 'kind') || '',
    op: readRecordString(hover, 'op') || '',
  };
}

export function matchesManualLayoutSketchHover(
  snapshot: ManualLayoutSketchHoverSnapshot,
  args: MatchManualLayoutSketchHoverArgs
): boolean {
  if (!snapshot.hover) return false;
  if (snapshot.tool !== args.tool) return false;
  if (snapshot.moduleKey !== args.moduleKey) return false;
  if (snapshot.isBottom !== !!args.isBottom) return false;
  if (!Number.isFinite(snapshot.ts)) return false;
  return args.now - Number(snapshot.ts) <= (args.maxAgeMs ?? 900);
}

export function resolveManualLayoutSketchHoverMatchState(
  args: ReadManualLayoutSketchHoverSnapshotArgs & MatchManualLayoutSketchHoverArgs
): ManualLayoutSketchHoverMatchState {
  const snapshot = readManualLayoutSketchHoverSnapshot({
    hover: args.hover,
    toModuleKey: args.toModuleKey,
  });
  return {
    snapshot,
    hoverRec: snapshot.rec,
    hoverKind: snapshot.kind,
    hoverOp: snapshot.op,
    hoverOk: matchesManualLayoutSketchHover(snapshot, args),
  };
}
