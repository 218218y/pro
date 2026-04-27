// Corner wing extension emission helpers.
//
// Extracted from corner_ops_emit.ts to keep the public owner module focused on
// canonical exports while this file owns the wing-specific geometry policy.

import { getInternalGridMap } from '../runtime/cache_access.js';
import { addToWardrobeGroup, getRenderNamespace } from '../runtime/render_access.js';
import { readMap, readMapOrEmpty, readSplitPosListFromMap } from '../runtime/maps_access.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { getCfg } from './store_access.js';
import { MODES } from '../runtime/api.js';
import { getBaseLegColorHex, resolveBaseLegGeometrySpec } from '../features/base_leg_support.js';
import { getOrCreateCacheRecord } from './corner_cache.js';
import {
  __isLongEdgeHandleVariantForPart,
  __topSplitHandleInsetForPart,
  __edgeHandleLongLiftAbsYForCell,
  __edgeHandleLongLiftAbsYForCornerCells,
  __edgeHandleAlignedBaseAbsYForCornerCells,
  __clampHandleAbsYForPart,
  isRecord,
  asRecord,
  readNumFrom,
  readStrFrom,
  cloneMaybe,
} from './corner_geometry_plan.js';

import { isPrimaryMode, type CornerOpsEmitContext } from './corner_ops_emit_common.js';
import { applyCornerWingCarcass } from './corner_wing_carcass_emit.js';
import { deriveCornerWingCells, resolveCornerWingDoorCount } from './corner_wing_extension_cells.js';
import { applyCornerWingCellFlow } from './corner_wing_cell_emit.js';
import { applyCornerWingCornice } from './corner_wing_cornice_emit.js';

export function emitCornerWingExtension(ctx: CornerOpsEmitContext): void {
  const {
    App,
    THREE,
    woodThick,
    startY,
    wingH,
    wingD,
    wingW,
    activeWidth,
    blindWidth,
    uiAny,
    __mirrorX,
    __stackKey,
    __stackSplitEnabled,
    __stackOffsetZ,
    stackOffsetY,
    baseType,
    baseLegStyle,
    baseLegColor,
    baseLegWidthCm,
    baseH,
    cabinetBodyHeight,
    __corniceAllowedForThisStack,
    __corniceTypeNorm,
    __cfg,
    config,
    __isDoorRemoved,
    __stackScopePartKey,
    __handlesMap,
    __individualColors,
    __doorSpecialMap,
    __readScopedMapVal,
    __readScopedReader,
    __getMirrorMat,
    __resolveSpecial,
    bodyMat,
    frontMat,
    getMaterial,
    __applyStableShadowsToModule,
    __sketchMode,
    wingGroup,
  } = ctx;

  const render = asRecord(getRenderNamespace(App));

  const materials = { front: frontMat, body: bodyMat };

  // If extension width is zero / too small, keep only the corner connector.
  if (wingW <= 0.001 || activeWidth <= 0.01) return;

  const cornerDoorCount = resolveCornerWingDoorCount({ activeWidth, uiAny });

  // Corner door count 0 means: keep ONLY the pentagon connector and suppress the side wing entirely.
  if (!(cornerDoorCount > 0)) return;

  // Floor is built later (per-cell) to support per-cell depth overrides.

  // NOTE:
  // The wing carcass walls/ceiling are constructed AFTER we derive per-cell widths/heights.
  // This allows stepped tops when the user applies per-cell height overrides (like a regular wardrobe).

  if (baseType === 'legs') {
    const legSpec = resolveBaseLegGeometrySpec(baseLegStyle, baseLegWidthCm);
    const legGeo =
      legSpec.shape === 'square'
        ? new THREE.BoxGeometry(legSpec.width, baseH, legSpec.depth)
        : new THREE.CylinderGeometry(legSpec.topRadius, legSpec.bottomRadius, baseH, legSpec.radialSegments);
    const lMat = getMaterial(getBaseLegColorHex(baseLegColor), 'metal');
    const legsCount = Math.max(2, Math.ceil(wingW / 0.6));
    for (let i = 0; i <= legsCount; i++) {
      const xPos = i * ((wingW - 0.1) / legsCount) + 0.05;
      const l1 = new THREE.Mesh(legGeo, lMat);
      l1.position.set(xPos, stackOffsetY + baseH / 2, -0.05);
      wingGroup.add(l1);
      const l2 = new THREE.Mesh(legGeo, lMat);
      l2.position.set(xPos, stackOffsetY + baseH / 2, -wingD + 0.05);
      wingGroup.add(l2);
    }
  }

  const {
    activeFaceCenter,
    doorCount,
    defaultDoorWidth: __defaultDoorW,
    cornerCells,
    cornerSharedLongEdgeHandleLiftAbsY: __cornerSharedLongEdgeHandleLiftAbsY,
    cornerSharedAlignedEdgeHandleBaseAbsY: __cornerSharedAlignedEdgeHandleBaseAbsY,
  } = deriveCornerWingCells({
    App,
    activeWidth,
    blindWidth,
    cabinetBodyHeight,
    config,
    startY,
    uiAny,
    wingD,
    wingH,
    woodThick,
    __cfg,
    __mirrorX,
    __stackKey,
    __stackSplitEnabled,
  });

  const { __wingBackPanelThick, __wingBackPanelCenterZ } = applyCornerWingCarcass({
    ctx,
    locals: { App, cornerCells, activeFaceCenter },
    helpers: { getCfg, getInternalGridMap, asRecord, readNumFrom, readStrFrom, cloneMaybe },
  });

  applyCornerWingCellFlow({
    ctx,
    locals: {
      render,
      materials,
      cornerCells,
      doorCount,
      activeFaceCenter,
      __defaultDoorW,
      __cornerSharedLongEdgeHandleLiftAbsY,
      __cornerSharedAlignedEdgeHandleBaseAbsY,
    },
    helpers: {
      readMap,
      readMapOrEmpty,
      readSplitPosListFromMap,
      readModulesConfigurationListFromConfigSnapshot,
      getCfg,
      MODES,
      getOrCreateCacheRecord,
      isPrimaryMode,
      __isLongEdgeHandleVariantForPart,
      __topSplitHandleInsetForPart,
      __edgeHandleLongLiftAbsYForCell,
      __edgeHandleLongLiftAbsYForCornerCells,
      __edgeHandleAlignedBaseAbsYForCornerCells,
      __clampHandleAbsYForPart,
      isRecord,
      asRecord,
      readNumFrom,
      readStrFrom,
      cloneMaybe,
    },
  });

  applyCornerWingCornice({
    ctx,
    locals: {
      App,
      __wingBackPanelThick,
      __wingBackPanelCenterZ,
    },
    helpers: { getCfg, readMap, isRecord, asRecord, readNumFrom },
  });

  // Enable stable shadows for the corner wing body (exclude doors/drawers).
  __applyStableShadowsToModule(wingGroup);
  addToWardrobeGroup(App, wingGroup);
}
