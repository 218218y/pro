import { computeCarcassOps } from './pure_api.js';
import { getBaseLegColorHex, readBaseLegOptions } from '../features/base_leg_support.js';

import type {
  InteriorGroupLike,
  InteriorOpsCallable,
  InteriorTHREESurface,
} from './render_interior_ops_contracts.js';

import type { SketchBoxExtra } from './render_interior_sketch_shared.js';

export {
  getSketchBoxAdornmentBaseHeight,
  normalizeSketchBoxAdornmentBaseType,
  normalizeSketchBoxAdornmentCorniceType,
} from './render_interior_sketch_visuals_adornments_normalize.js';
export { stripSketchCorniceMiterCaps } from './render_interior_sketch_visuals_adornments_miter.js';

import {
  getSketchBoxAdornmentBaseHeight,
  normalizeSketchBoxAdornmentBaseType,
  normalizeSketchBoxAdornmentCorniceType,
} from './render_interior_sketch_visuals_adornments_normalize.js';
import {
  createSketchAdornmentHolder,
  createSketchAdornmentPlacementRuntime,
  prefixSketchBoxAdornmentOpsPartIds,
} from './render_interior_sketch_visuals_adornments_runtime.js';
import { renderSketchBoxAdornmentBase } from './render_interior_sketch_visuals_adornments_base.js';
import { renderSketchBoxAdornmentCornice } from './render_interior_sketch_visuals_adornments_cornice.js';

export function renderSketchBoxCarcassAdornment(args: {
  THREE: InteriorTHREESurface;
  group: InteriorGroupLike;
  box: SketchBoxExtra;
  boxPid: string;
  moduleKeyStr: string;
  boxId: string;
  boxGeo: { centerX: number; centerZ: number; outerW: number; outerD: number };
  boxCenterY: number;
  boxHeight: number;
  woodThick: number;
  bodyMat: unknown;
  getPartMaterial?: InteriorOpsCallable;
  addOutlines?: InteriorOpsCallable;
  isFreePlacement: boolean;
}): void {
  const {
    THREE,
    group,
    box,
    boxPid,
    moduleKeyStr,
    boxId,
    boxGeo,
    boxCenterY,
    boxHeight,
    woodThick,
    bodyMat,
    getPartMaterial,
    addOutlines,
    isFreePlacement,
  } = args;
  const baseType = normalizeSketchBoxAdornmentBaseType(box.baseType);
  const legOptions = readBaseLegOptions(box);
  const hasCornice = box.hasCornice === true;
  const corniceType = normalizeSketchBoxAdornmentCorniceType(box.corniceType);
  if (baseType === 'none' && !hasCornice) return;

  const baseHeight = getSketchBoxAdornmentBaseHeight(baseType, box);
  const ops = computeCarcassOps({
    totalW: boxGeo.outerW,
    D: boxGeo.outerD,
    H: boxHeight + baseHeight,
    woodThick,
    baseType,
    baseLegStyle: legOptions.style,
    baseLegHeightCm: legOptions.heightCm,
    baseLegWidthCm: legOptions.widthCm,
    doorsCount: 2,
    hasCornice,
    corniceType,
  });
  if (!ops) return;

  const { baseRec, corniceRec } = prefixSketchBoxAdornmentOpsPartIds(ops, boxPid);
  const holder = createSketchAdornmentHolder({
    THREE,
    group,
    boxGeo,
    boxCenterY,
    boxHeight,
    baseHeight,
  });
  const runtime = createSketchAdornmentPlacementRuntime({
    THREE,
    holder,
    bodyMat,
    moduleKeyStr,
    boxId,
    getPartMaterial,
    addOutlines,
    isFreePlacement,
  });

  const legMat =
    typeof THREE.MeshStandardMaterial === 'function'
      ? new THREE.MeshStandardMaterial({
          color: getBaseLegColorHex(legOptions.color),
          metalness: 0.8,
          roughness: 0.2,
        })
      : bodyMat;

  renderSketchBoxAdornmentBase({ THREE, boxPid, baseRec, runtime, bodyMat, legMat });
  renderSketchBoxAdornmentCornice({ THREE: runtime.corniceTHREE, corniceRec, boxPid, runtime });
}
