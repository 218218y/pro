import { makeMaterialResolver, resolveGlobalColorChoice } from './material_resolver.js';
import { getCommonMatsOrThrow } from './common_mats_resolver.js';
import { getBaseLegColorHex } from '../features/base_leg_support.js';

import type { BuildFlowPlanMaterials, BuildFlowPlanMaterialsArgs } from './build_flow_plan_contracts.js';

export function resolveBuildFlowPlanMaterials(args: BuildFlowPlanMaterialsArgs): BuildFlowPlanMaterials {
  const { App, THREE, ui, cfg, toStr, getMaterialFn } = args;

  const { colorKey: colorHex, useTexture, textureDataURL } = resolveGlobalColorChoice({ ui, cfg, toStr });
  const globalFrontMat = getMaterialFn(colorHex, 'front', useTexture, textureDataURL);
  const bodyMat = globalFrontMat;
  const { masoniteMat, whiteMat, shadowMat } = getCommonMatsOrThrow({ App, THREE });
  const legMat = getMaterialFn(getBaseLegColorHex(ui.baseLegColor), 'metal');

  const materialResolver = makeMaterialResolver({
    App,
    THREE,
    cfg,
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
    getPartColorValue: materialResolver.getPartColorValue,
    getPartMaterial: materialResolver.getPartMaterial,
  };
}
