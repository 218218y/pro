import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
// Corner wing door context creation.
//
// Keep stack-scoped map access, hinge defaults, and trim readers out of the
// public wing-door owner so downstream door flows receive one canonical context.

import { readDoorTrimMap } from '../features/door_trim.js';
import {
  requireCreateDoorVisual,
  requireGroupLike,
  requireThreeCornerCellLike,
  type CornerWingCellFlowParams,
} from './corner_wing_cell_shared.js';
import type { CornerWingDoorContext } from './corner_wing_cell_doors_contracts.js';

export function createCornerWingDoorContext(params: CornerWingCellFlowParams): CornerWingDoorContext | null {
  const ctx = params.ctx;
  const locals = params.locals;
  const helpers = params.helpers;

  if (!(locals.doorCount > 0)) return null;

  return {
    App: ctx.App,
    THREE: requireThreeCornerCellLike(ctx.THREE),
    wingGroup: requireGroupLike(ctx.wingGroup, 'wingGroup'),
    doorStyle: typeof ctx.doorStyle === 'string' ? ctx.doorStyle : '',
    splitDoors: !!ctx.splitDoors,
    groovesEnabled: !!ctx.groovesEnabled,
    removeDoorsEnabled: !!ctx.removeDoorsEnabled,
    getGroove: ctx.getGroove,
    getCurtain: ctx.getCurtain,
    createDoorVisual: requireCreateDoorVisual(ctx.createDoorVisual),
    render: locals.render,
    cornerCells: locals.cornerCells,
    doorCount: locals.doorCount,
    cornerSharedLongEdgeHandleLiftAbsY: locals.__cornerSharedLongEdgeHandleLiftAbsY,
    cornerSharedAlignedEdgeHandleBaseAbsY: locals.__cornerSharedAlignedEdgeHandleBaseAbsY,
    readMapOrEmpty: helpers.readMapOrEmpty,
    readSplitPosListFromMap: helpers.readSplitPosListFromMap,
    getCfg: helpers.getCfg,
    MODES: helpers.MODES,
    getOrCreateCacheRecord: helpers.getOrCreateCacheRecord,
    isPrimaryMode: helpers.isPrimaryMode,
    isLongEdgeHandleVariantForPart: helpers.__isLongEdgeHandleVariantForPart,
    topSplitHandleInsetForPart: helpers.__topSplitHandleInsetForPart,
    clampHandleAbsYForPart: helpers.__clampHandleAbsYForPart,
    asRecord: helpers.asRecord,
    readNumFrom: helpers.readNumFrom,
    woodThick: ctx.woodThick,
    startY: ctx.startY,
    wingH: ctx.wingH,
    wingD: ctx.wingD,
    activeWidth: ctx.activeWidth,
    blindWidth: ctx.blindWidth,
    uiAny: ctx.uiAny,
    stackKey: ctx.__stackKey,
    stackSplitEnabled: ctx.__stackSplitEnabled,
    isDoorRemoved: ctx.__isDoorRemoved,
    stackScopePartKey: ctx.__stackScopePartKey,
    readScopedReader: ctx.__readScopedReader,
    getMirrorMat: ctx.__getMirrorMat,
    resolveSpecial: ctx.__resolveSpecial,
    getCornerMat: ctx.getCornerMat,
    frontMat: ctx.frontMat,
    cfg0: helpers.getCfg(ctx.App) || {},
    doorTrimMap: readDoorTrimMap((helpers.getCfg(ctx.App) || {}).doorTrimMap),
    hingeMap0: helpers.readMapOrEmpty(ctx.App, 'hingeMap'),
    splitMap0: helpers.readMapOrEmpty(ctx.App, 'splitDoorsMap'),
    splitBottomMap0: helpers.readMapOrEmpty(ctx.App, 'splitDoorsBottomMap'),
    fallbackDoorW: ctx.activeWidth / locals.doorCount,
    splitGap: CORNER_WING_DIMENSIONS.connector.splitGapM,
  };
}
