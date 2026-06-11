import type { ResolveSketchFreeBoxHoverPlacementResult } from './canvas_picking_manual_layout_sketch_contracts.js';
import { createSketchFreePlacementBoxHoverRecord } from './canvas_picking_sketch_free_commit.js';
import {
  readRecordValue,
  type RecordMap,
  type SketchFreeHoverHost,
} from './canvas_picking_sketch_free_surface_preview_shared.js';

export type SketchFreePlacementPreviewOp = Pick<
  ResolveSketchFreeBoxHoverPlacementResult,
  'op' | 'previewX' | 'previewY' | 'previewH' | 'previewW' | 'previewD' | 'snapToCenter' | 'removeId'
>;

export type SketchFreePlacementHoverPreviewState = {
  hoverRecord: RecordMap;
  removeBox: RecordMap | null;
};

export function resolveSketchFreePlacementHoverPreviewState(args: {
  tool: string;
  host: SketchFreeHoverHost;
  hoverPlacement: SketchFreePlacementPreviewOp;
  freeBoxes: RecordMap[];
}): SketchFreePlacementHoverPreviewState {
  const { tool, host, hoverPlacement, freeBoxes } = args;
  const hoverRecord = createSketchFreePlacementBoxHoverRecord({
    tool,
    host,
    op: hoverPlacement.op,
    previewX: hoverPlacement.previewX,
    previewY: hoverPlacement.previewY,
    previewH: hoverPlacement.previewH,
    previewW: hoverPlacement.previewW,
    previewD: hoverPlacement.previewD,
    removeId: hoverPlacement.removeId,
  });
  const removeBox =
    hoverPlacement.op === 'remove'
      ? freeBoxes.find((entry, index) => {
          const idRaw = readRecordValue(entry, 'id');
          const entryId = idRaw != null && idRaw !== '' ? String(idRaw) : String(index);
          return entryId === hoverPlacement.removeId;
        }) || null
      : null;
  return { hoverRecord, removeBox };
}
