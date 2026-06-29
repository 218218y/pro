import type { RenderSketchBoxFrontsArgs } from './render_interior_sketch_boxes_shared.js';
import type { SketchBoxDoorExtra } from './render_interior_sketch_shared.js';
import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
  SketchBoxSegment,
  SketchBoxVerticalSegment,
} from './render_interior_sketch_layout.js';

import { readSketchBoxDoors, toFiniteNumber } from './render_interior_sketch_shared.js';
import {
  pickSketchBoxVerticalSegment,
  resolveSketchBoxSegmentForContent,
  resolveSketchBoxVerticalSegments,
} from './render_interior_sketch_layout.js';

export type SketchBoxPartMaterialResolver = (partId: string, defaultMaterial: unknown) => unknown;

export type SketchBoxDoorPlacement = {
  door: SketchBoxDoorExtra;
  index: number;
  segment: SketchBoxSegment | null;
  verticalSegment: SketchBoxVerticalSegment | null;
};

export function createSketchBoxPartMaterialResolver(args: {
  getPartMaterial?: RenderSketchBoxFrontsArgs['args']['getPartMaterial'];
  isFn: RenderSketchBoxFrontsArgs['args']['isFn'];
}): SketchBoxPartMaterialResolver {
  const { getPartMaterial, isFn } = args;
  return (partId: string, defaultMaterial: unknown) => {
    try {
      if (isFn(getPartMaterial)) {
        const resolved = getPartMaterial(partId);
        if (resolved) return resolved;
      }
    } catch {
      // ignore
    }
    return defaultMaterial;
  };
}

export function readSketchBoxDoorPlacements(args: {
  box: unknown;
  dividers: SketchBoxDividerState[];
  horizontalDividers?: SketchBoxHorizontalDividerState[];
  boxCenterY?: number | null;
  innerH?: number | null;
  boxCenterX: number;
  innerW: number;
  woodThick: number;
}): SketchBoxDoorPlacement[] {
  const { box, dividers, horizontalDividers, boxCenterX, boxCenterY, innerW, innerH, woodThick } = args;
  const verticalBoxCenterY = toFiniteNumber(boxCenterY);
  const verticalInnerH = toFiniteNumber(innerH);
  const canResolveVerticalSegments =
    !!horizontalDividers?.length && verticalBoxCenterY != null && verticalInnerH != null;
  const boxDoors = readSketchBoxDoors(box);
  return boxDoors.map((door, index) => {
    const verticalSegments = canResolveVerticalSegments
      ? resolveSketchBoxVerticalSegments({
          dividers: horizontalDividers || [],
          verticalDividers: dividers,
          boxCenterX,
          innerW,
          boxCenterY: verticalBoxCenterY,
          innerH: verticalInnerH,
          woodThick,
          xNorm: door.xNorm,
        })
      : [];
    return {
      door,
      index,
      segment: resolveSketchBoxSegmentForContent({
        dividers,
        boxCenterX,
        innerW,
        woodThick,
        xNorm: door.xNorm,
        horizontalDividers,
        boxCenterY,
        innerH,
        yNorm: door.yNorm,
      }),
      verticalSegment:
        door.yNorm != null && verticalSegments.length
          ? pickSketchBoxVerticalSegment({
              segments: verticalSegments,
              boxCenterY: verticalBoxCenterY as number,
              innerH: verticalInnerH as number,
              yNorm: door.yNorm,
            })
          : null,
    };
  });
}

export function getSketchBoxDoorPlacementSegmentKey(placement: SketchBoxDoorPlacement): string | null {
  const segmentIndex = placement?.segment?.index;
  if (typeof segmentIndex !== 'number' || !Number.isFinite(segmentIndex)) return null;
  const verticalIndex = placement?.verticalSegment?.index;
  const verticalKey =
    typeof verticalIndex === 'number' && Number.isFinite(verticalIndex) ? verticalIndex : -1;
  return `${segmentIndex}:${verticalKey}`;
}

export function indexSketchBoxDoorPlacementsBySegment(
  placements: SketchBoxDoorPlacement[]
): Map<string, SketchBoxDoorPlacement[]> {
  const out = new Map<string, SketchBoxDoorPlacement[]>();
  for (let index = 0; index < placements.length; index++) {
    const placement = placements[index] || null;
    if (!placement) continue;
    const key = getSketchBoxDoorPlacementSegmentKey(placement);
    if (!key) continue;
    const list = out.get(key) || [];
    list.push(placement);
    out.set(key, list);
  }
  return out;
}
