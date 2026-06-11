import { readDoorStyleMap } from '../features/door_style_overrides.js';
import { readUiStateFromApp } from '../runtime/root_state_access.js';
import { getCfg } from './store_access.js';

import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type { RenderSketchBoxFrontsArgs } from './render_interior_sketch_boxes_shared.js';
import type { SketchBoxDoorExtra } from './render_interior_sketch_shared.js';
import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
  SketchBoxSegment,
  SketchBoxVerticalSegment,
} from './render_interior_sketch_layout.js';

import { asValueRecord, readObject, readSketchBoxDoors } from './render_interior_sketch_shared.js';
import {
  pickSketchBoxVerticalSegment,
  resolveSketchBoxSegmentForContent,
  resolveSketchBoxVerticalSegments,
} from './render_interior_sketch_layout.js';

export type SketchDoorStyle = 'flat' | 'profile' | 'double_profile';
export type SketchDoorStyleMap = ReturnType<typeof readDoorStyleMap>;

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

export function normalizeSketchDoorStyle(value: unknown): SketchDoorStyle {
  const raw = String(value == null ? '' : value)
    .trim()
    .toLowerCase();
  return raw === 'profile' || raw === 'double_profile' || raw === 'flat' ? raw : 'flat';
}

export function resolveSketchDoorStyle(
  App: RenderSketchBoxFrontsArgs['args']['App'],
  input: RenderSketchBoxFrontsArgs['args']['input']
): SketchDoorStyle {
  const inputRec = asValueRecord(input);
  const inputUi = asValueRecord(inputRec?.ui);
  const configRec = asValueRecord(inputRec?.config);
  const cfgRec = asValueRecord(inputRec?.cfg);
  const appUi = asValueRecord(readUiStateFromApp(App));
  return normalizeSketchDoorStyle(
    inputRec?.doorStyle ??
      inputUi?.doorStyle ??
      appUi?.doorStyle ??
      configRec?.doorStyle ??
      cfgRec?.doorStyle ??
      'flat'
  );
}

export function resolveSketchDoorStyleMap(
  App: RenderSketchBoxFrontsArgs['args']['App'],
  input: RenderSketchBoxFrontsArgs['args']['input']
) {
  const inputRec = asValueRecord(input);
  const configRec = asValueRecord(inputRec?.config);
  const cfgRec = asValueRecord(inputRec?.cfg);
  const appCfg = readObject<InteriorValueRecord>(getCfg(App));
  return readDoorStyleMap(
    inputRec?.doorStyleMap ?? configRec?.doorStyleMap ?? cfgRec?.doorStyleMap ?? appCfg?.doorStyleMap
  );
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
  const boxDoors = readSketchBoxDoors(box);
  return boxDoors.map((door, index) => {
    const verticalSegments =
      horizontalDividers?.length && Number.isFinite(Number(boxCenterY)) && Number.isFinite(Number(innerH))
        ? resolveSketchBoxVerticalSegments({
            dividers: horizontalDividers,
            verticalDividers: dividers,
            boxCenterX,
            innerW,
            boxCenterY: Number(boxCenterY),
            innerH: Number(innerH),
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
              boxCenterY: Number(boxCenterY),
              innerH: Number(innerH),
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
