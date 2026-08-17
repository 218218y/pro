import type { ResolveSketchFreeBoxHoverPlacementResult } from './canvas_picking_manual_layout_sketch_contracts.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import { createSketchFreePlacementBoxHoverRecord } from './canvas_picking_sketch_free_commit.js';
import {
  readRecordValue,
  type RecordMap,
  type SketchFreeHoverHost,
} from './canvas_picking_sketch_free_surface_preview_shared.js';

export type SketchFreePlacementPreviewOp = Pick<
  ResolveSketchFreeBoxHoverPlacementResult,
  | 'op'
  | 'previewX'
  | 'previewY'
  | 'previewH'
  | 'previewW'
  | 'previewD'
  | 'snapToCenter'
  | 'removeId'
  | 'placementWall'
>;

export type SketchFreePlacementHoverPreviewState = {
  hoverRecord: RecordMap | null;
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
    placementWall: hoverPlacement.placementWall,
    removeId: hoverPlacement.removeId,
  });
  const removeBox =
    hoverPlacement.op === 'remove'
      ? freeBoxes.find((entry, index) => {
          const idRaw = readRecordValue(entry, 'id');
          const entryId = formatIdentityValue(readIdentityValue(idRaw)) || formatIdentityValue(index);
          return entryId === hoverPlacement.removeId;
        }) || null
      : null;
  return { hoverRecord, removeBox };
}
