import { readDoorStyleMap } from '../features/door_style_overrides.js';
import { readUiStateFromApp } from '../runtime/root_state_access.js';
import { getCfg } from './store_access.js';

import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type { RenderSketchBoxFrontsArgs } from './render_interior_sketch_boxes_shared.js';
import type { SketchBoxDoorExtra } from './render_interior_sketch_shared.js';
import type { SketchBoxDividerState, SketchBoxSegment } from './render_interior_sketch_layout.js';

import { asValueRecord, readObject, readSketchBoxDoors } from './render_interior_sketch_shared.js';
import { resolveSketchBoxSegmentForContent } from './render_interior_sketch_layout.js';

export type SketchDoorStyle = 'flat' | 'profile' | 'tom';
export type SketchDoorStyleMap = ReturnType<typeof readDoorStyleMap>;

export type SketchBoxPartMaterialResolver = (partId: string, fallback: unknown) => unknown;

export type SketchBoxDoorPlacement = {
  door: SketchBoxDoorExtra;
  index: number;
  segment: SketchBoxSegment | null;
};

export function createSketchBoxPartMaterialResolver(args: {
  getPartMaterial?: RenderSketchBoxFrontsArgs['args']['getPartMaterial'];
  isFn: RenderSketchBoxFrontsArgs['args']['isFn'];
}): SketchBoxPartMaterialResolver {
  const { getPartMaterial, isFn } = args;
  return (partId: string, fallback: unknown) => {
    try {
      if (isFn(getPartMaterial)) {
        const resolved = getPartMaterial(partId);
        if (resolved) return resolved;
      }
    } catch {
      // ignore
    }
    return fallback;
  };
}

export function normalizeSketchDoorStyle(value: unknown): SketchDoorStyle {
  const raw = String(value == null ? '' : value)
    .trim()
    .toLowerCase();
  return raw === 'profile' || raw === 'tom' || raw === 'flat' ? raw : 'flat';
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
  boxCenterX: number;
  innerW: number;
  woodThick: number;
}): SketchBoxDoorPlacement[] {
  const { box, dividers, boxCenterX, innerW, woodThick } = args;
  const boxDoors = readSketchBoxDoors(box);
  return boxDoors.map((door, index) => ({
    door,
    index,
    segment: resolveSketchBoxSegmentForContent({
      dividers,
      boxCenterX,
      innerW,
      woodThick,
      xNorm: door.xNorm,
    }),
  }));
}

export function indexSketchBoxDoorPlacementsBySegment(
  placements: SketchBoxDoorPlacement[]
): Map<number, SketchBoxDoorPlacement[]> {
  const out = new Map<number, SketchBoxDoorPlacement[]>();
  for (let index = 0; index < placements.length; index++) {
    const placement = placements[index] || null;
    const segmentIndex = placement?.segment?.index;
    if (typeof segmentIndex !== 'number' || !Number.isFinite(segmentIndex)) continue;
    const list = out.get(segmentIndex) || [];
    list.push(placement);
    out.set(segmentIndex, list);
  }
  return out;
}
