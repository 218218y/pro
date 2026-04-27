import type { MirrorLayoutList } from '../../../types';
import { readMirrorLayoutListForPart } from '../features/mirror_layout.js';
import type { CornerWingCellFlowParams, ValueRecord } from './corner_wing_cell_shared.js';
import {
  requireAddFoldedClothes,
  requireAddHangingClothes,
  requireAddOutlines,
  requireAddRealisticHanger,
  requireCreateDoorVisual,
  requireCreateInternalDrawerBox,
  requireGroupLike,
  requireThreeCornerCellLike,
} from './corner_wing_cell_shared.js';
import type { CornerWingInteriorRuntime } from './corner_wing_cell_interiors_contracts.js';

const isScopedReader = (reader: unknown): reader is (key: string) => unknown => typeof reader === 'function';

export function createCornerWingInteriorRuntime(params: CornerWingCellFlowParams): CornerWingInteriorRuntime {
  const ctx = params.ctx;
  const locals = params.locals;
  const helpers = params.helpers;
  const {
    App,
    woodThick,
    startY,
    wingD,
    wingW,
    blindWidth,
    __mirrorX,
    __stackKey,
    __stackSplitEnabled,
    __stackOffsetZ,
    __isDoorRemoved,
    __stackScopePartKey,
    __handlesMap,
    __individualColors,
    __doorSpecialMap,
    __readScopedMapVal,
    __readScopedReader,
    __getMirrorMat,
    __resolveSpecial,
    getCornerMat,
    bodyMat,
    frontMat,
    getMaterial,
    __sketchMode,
  } = ctx;
  const {
    render,
    materials,
    cornerCells,
    __defaultDoorW,
    __cornerSharedLongEdgeHandleLiftAbsY,
    __cornerSharedAlignedEdgeHandleBaseAbsY,
  } = locals;
  const {
    readMap,
    readMapOrEmpty,
    getOrCreateCacheRecord,
    __isLongEdgeHandleVariantForPart,
    __topSplitHandleInsetForPart,
    __edgeHandleLongLiftAbsYForCell,
    __edgeHandleLongLiftAbsYForCornerCells,
    __edgeHandleAlignedBaseAbsYForCornerCells,
    __clampHandleAbsYForPart,
    isRecord,
    asRecord,
  } = helpers;

  const ensureRenderArray = (rec: ValueRecord, key: string): unknown[] => {
    const v = rec[key];
    if (Array.isArray(v)) return v;
    const arr: unknown[] = [];
    rec[key] = arr;
    return arr;
  };

  const readMirrorLayout = (partId: string): MirrorLayoutList | null => {
    const map = readMapOrEmpty(App, 'mirrorLayoutMap');
    const scopedPartId = __stackKey === 'bottom' ? __stackScopePartKey(partId) : partId;
    const layouts = readMirrorLayoutListForPart({
      map,
      partId,
      scopedPartId,
      preferScopedOnly: __stackSplitEnabled && __stackKey === 'bottom' && scopedPartId !== partId,
    });
    return layouts.length ? layouts : null;
  };

  const readScopedReaderAny = (reader: unknown, partId: string): unknown =>
    isScopedReader(reader) ? __readScopedReader(reader, partId) : undefined;

  return {
    ctx,
    locals,
    helpers,
    App,
    woodThick,
    startY,
    wingD,
    wingW,
    blindWidth,
    __mirrorX,
    __stackKey,
    __stackSplitEnabled,
    __stackOffsetZ,
    __isDoorRemoved,
    __stackScopePartKey,
    __handlesMap,
    __individualColors,
    __doorSpecialMap,
    __readScopedMapVal,
    __readScopedReader,
    __getMirrorMat,
    __resolveSpecial,
    getCornerMat,
    bodyMat,
    frontMat,
    getMaterial,
    __sketchMode,
    THREE: requireThreeCornerCellLike(ctx.THREE),
    wingGroup: requireGroupLike(ctx.wingGroup, 'wingGroup'),
    doorStyle: typeof ctx.doorStyle === 'string' ? ctx.doorStyle : '',
    groovesEnabled: !!ctx.groovesEnabled,
    internalDrawersEnabled: !!ctx.internalDrawersEnabled,
    showHangerEnabled: !!ctx.showHangerEnabled,
    showContentsEnabled: !!ctx.showContentsEnabled,
    __cfg: asRecord(ctx.__cfg),
    getGroove: ctx.getGroove,
    shadowMat: ctx.shadowMat,
    addOutlines: requireAddOutlines(ctx.addOutlines),
    createDoorVisual: requireCreateDoorVisual(ctx.createDoorVisual),
    createInternalDrawerBox: requireCreateInternalDrawerBox(ctx.createInternalDrawerBox),
    addRealisticHanger: requireAddRealisticHanger(ctx.addRealisticHanger),
    addHangingClothes: requireAddHangingClothes(ctx.addHangingClothes),
    addFoldedClothes: requireAddFoldedClothes(ctx.addFoldedClothes),
    render: isRecord(render) ? render : null,
    materials,
    cornerCells,
    __defaultDoorW,
    __cornerSharedLongEdgeHandleLiftAbsY,
    __cornerSharedAlignedEdgeHandleBaseAbsY,
    readMap,
    readMapOrEmpty,
    getOrCreateCacheRecord,
    __isLongEdgeHandleVariantForPart,
    __topSplitHandleInsetForPart,
    __edgeHandleLongLiftAbsYForCell,
    __edgeHandleLongLiftAbsYForCornerCells,
    __edgeHandleAlignedBaseAbsYForCornerCells,
    __clampHandleAbsYForPart,
    isRecord,
    asRecord,
    readMirrorLayout,
    readScopedReaderAny,
    ensureRenderArray,
  };
}
