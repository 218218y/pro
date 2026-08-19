import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { readFiniteNumber } from './hinged_doors_shared.js';
import { hasSketchExternalDrawerDoorCutsInConfig } from './sketch_external_drawer_door_cut_ownership.js';
import type {
  HingedDoorIterationState,
  HingedDoorModuleOpsContext,
} from './hinged_doors_module_ops_contracts.js';

export function appendDrawerShadowPlane(ctx: HingedDoorModuleOpsContext): void {
  try {
    const App = ctx.App;
    const THREE = ctx.THREE;
    if (!App || typeof App !== 'object') return;
    const ro = getBuilderRenderOps(App);
    if (
      ctx.drawerHeightTotal > 0 &&
      ro &&
      typeof ro.createDrawerShadowPlane === 'function' &&
      ctx.shadowMat &&
      ctx.externalW > 0
    ) {
      const shadowH = 0.006;
      const shadowY = ctx.drawerTopEdgeAbsolute + shadowH / 2 + 0.0005;
      ro.createDrawerShadowPlane({
        App,
        ...(THREE !== undefined ? { THREE } : {}),
        externalW: ctx.externalW,
        shadowH,
        shadowY,
        externalCenterX: ctx.externalCenterX,
        D: ctx.D,
        frontZ: ctx.doorFrontZ,
        shadowMat: ctx.shadowMat,
      });
    }
  } catch (e) {
    ctx.reportDoorSoftOnce('createDrawerShadowPlane', e, { moduleIndex: ctx.index });
  }
}

export function createHingedDoorIterationState(
  ctx: HingedDoorModuleOpsContext,
  doorIndex: number,
  globalDoorCounter: number
): HingedDoorIterationState {
  const currentDoorId = globalDoorCounter;
  const nextGlobalDoorCounter = globalDoorCounter + 1;
  const doorLeftEdge = ctx.currentX + doorIndex * ctx.singleDoorW;
  let pivotX = 0;
  let meshOffsetX = 0;
  let isLeftHinge = true;
  let doorWidth = ctx.singleDoorW;

  const pivotSpec = ctx.hingedDoorPivotMap && ctx.hingedDoorPivotMap[currentDoorId];
  if (pivotSpec) {
    pivotX = readFiniteNumber(pivotSpec.pivotX, pivotX);
    meshOffsetX = readFiniteNumber(pivotSpec.meshOffsetX, meshOffsetX);
    isLeftHinge = !!pivotSpec.isLeftHinge;
    if (typeof pivotSpec.doorWidth === 'number' && Number.isFinite(pivotSpec.doorWidth)) {
      doorWidth = pivotSpec.doorWidth;
    }
  } else if (ctx.moduleDoors === 1) {
    const hingeKey = `door_hinge_${currentDoorId}`;
    const defaultDir: 'left' | 'right' = ctx.index === ctx.modulesLength - 1 ? 'right' : 'left';
    const chosenDirection = ctx.getHingeDirSafe(hingeKey, defaultDir);
    if (chosenDirection === 'left') {
      pivotX = doorLeftEdge;
      meshOffsetX = ctx.singleDoorW / 2;
      isLeftHinge = true;
    } else {
      pivotX = doorLeftEdge + ctx.singleDoorW;
      meshOffsetX = -ctx.singleDoorW / 2;
      isLeftHinge = false;
    }
  } else if (doorIndex === 0) {
    pivotX = doorLeftEdge;
    meshOffsetX = ctx.singleDoorW / 2;
    isLeftHinge = true;
  } else {
    pivotX = doorLeftEdge + ctx.singleDoorW;
    meshOffsetX = -ctx.singleDoorW / 2;
    isLeftHinge = false;
  }

  const carcassBoundaryX = isLeftHinge ? ctx.currentX : ctx.currentX + ctx.modWidth;
  const rawCarcassMountFaceX = carcassBoundaryX - pivotX;
  const nominalCarcassMountFaceX = (isLeftHinge ? 1 : -1) * (ctx.woodThick / 2);
  const carcassMountFaceX =
    Number.isFinite(rawCarcassMountFaceX) && Math.abs(rawCarcassMountFaceX) <= ctx.woodThick + 1e-6
      ? rawCarcassMountFaceX
      : nominalCarcassMountFaceX;

  const topSplitEnabled = ctx.splitDoors
    ? ctx.isBottomStack
      ? ctx.isDoorSplitExplicitOn(ctx.cfg.splitDoorsMap, currentDoorId)
      : ctx.isDoorSplitSafe(ctx.cfg.splitDoorsMap, currentDoorId)
    : false;
  const bottomSplitEnabled =
    ctx.splitDoors && ctx.isDoorSplitBottomSafe(ctx.cfg.splitDoorsBottomMap, currentDoorId);
  const deferSplitToSketchDoorCutPass = hasSketchExternalDrawerDoorCutsInConfig(ctx.configRecord);

  return {
    currentDoorId,
    nextGlobalDoorCounter,
    doorLeftEdge,
    pivotX,
    meshOffsetX,
    isLeftHinge,
    doorWidth,
    carcassMountFaceX,
    topSplitEnabled,
    bottomSplitEnabled,
    shouldSplitThisDoor:
      ctx.splitDoors && (topSplitEnabled || bottomSplitEnabled) && !deferSplitToSketchDoorCutPass,
    sourceKey: `d${currentDoorId}_full`,
    topKey: `d${currentDoorId}_top`,
    midKey: `d${currentDoorId}_mid`,
    botKey: `d${currentDoorId}_bot`,
  };
}
