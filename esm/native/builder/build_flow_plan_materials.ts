import { makeMaterialResolver } from './material_resolver.js';
import { resolveGlobalFrontMaterialInput } from './material_selection.js';
import { getCommonMatsOrThrow } from './common_mats_resolver.js';
import { getBaseLegColorHex } from '../features/base_leg_support.js';
import { isFrontColorBraceShelvesOnlyMode } from '../features/front_color_shelf_inheritance.js';
import { createShelfFrontEdgeMaterials } from '../features/shelf_front_edge_material.js';

import type { BuildFlowPlanMaterials, BuildFlowPlanMaterialsArgs } from './build_flow_plan_contracts.js';

export function resolveBuildFlowPlanMaterials(args: BuildFlowPlanMaterialsArgs): BuildFlowPlanMaterials {
  const { App, THREE, ui, cfg, sketchMode, toStr, getMaterialFn } = args;

  const {
    colorKey: colorHex,
    useTexture,
    textureDataURL,
  } = resolveGlobalFrontMaterialInput({
    colorChoice: ui.colorChoice,
    customColor: ui.customColor,
    cfg,
    toStr,
  });
  const globalFrontMat = getMaterialFn(colorHex, 'front', useTexture, textureDataURL);
  const bodyMat = globalFrontMat;
  const { masoniteMat, whiteMat, shadowMat } = getCommonMatsOrThrow({ App, THREE });
  const defaultShelfMat = isFrontColorBraceShelvesOnlyMode(ui.frontColorShelfInheritanceMode)
    ? whiteMat
    : bodyMat;
  const braceShelfMat = isFrontColorBraceShelvesOnlyMode(ui.frontColorShelfInheritanceMode)
    ? createShelfFrontEdgeMaterials({ shelfMaterial: whiteMat, frontEdgeMaterial: bodyMat })
    : bodyMat;
  const legMat = getMaterialFn(getBaseLegColorHex(ui.baseLegColor), 'metal');

  const materialResolver = makeMaterialResolver({
    App,
    THREE,
    cfg,
    materialSnapshot: { cfgSnapshot: cfg, sketchMode },
    getMaterial: getMaterialFn,
    globalFrontMat,
  });

  return {
    colorHex,
    useTexture,
    textureDataURL,
    globalFrontMat,
    bodyMat,
    masoniteMat,
    whiteMat,
    shadowMat,
    legMat,
    defaultShelfMat,
    braceShelfMat,
    getPartColorValue: materialResolver.getPartColorValue,
    getPartMaterial: materialResolver.getPartMaterial,
  };
}
