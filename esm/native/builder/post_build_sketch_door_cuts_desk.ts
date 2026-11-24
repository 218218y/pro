import { planArchesOnDeskDoor } from './hinged_doors_module_ops_split.js';
import { resolveSketchDoorSegmentPartId } from './post_build_sketch_door_cuts_rebuild_shared.js';
import type {
  SketchDoorCutsRuntime,
  SketchDoorRebuildSegment,
  SketchDrawerCutSegment,
} from './post_build_sketch_door_cuts_contracts.js';

export function applyDeskLeafArchCuts(
  leaves: SketchDrawerCutSegment[],
  basePartId: string,
  sizing: { visualWidth: number; clearance: number },
  runtime: SketchDoorCutsRuntime
): SketchDoorRebuildSegment[] {
  return leaves.flatMap((leaf, index) => {
    const partId = resolveSketchDoorSegmentPartId(basePartId, leaves.length, index);
    const key = `splitarch_desk_${partId}`;
    const { yMin, yMax } = leaf;
    const deskArchScope = { key, yMin, yMax };
    const cuts = planArchesOnDeskDoor(
      { minX: -sizing.visualWidth / 2, maxX: sizing.visualWidth / 2, minY: yMin, maxY: yMax },
      runtime.readDeskArchCuts?.(key),
      sizing.clearance / 2
    );
    if (!cuts.length) return [{ yMin, yMax, partId, deskArchScope }];
    return cuts.map((piece, pieceIndex) => ({
      ...piece,
      partId: resolveSketchDoorSegmentPartId(partId, cuts.length, pieceIndex),
      deskArchScope,
    }));
  });
}
