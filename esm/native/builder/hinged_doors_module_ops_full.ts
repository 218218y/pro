import { clampHandleAbsY } from './hinged_doors_module_ops_shared.js';
import type {
  HingedDoorIterationState,
  HingedDoorModuleOpsContext,
} from './hinged_doors_module_ops_contracts.js';

function readFullDoorGrooveEnabled(
  ctx: HingedDoorModuleOpsContext,
  state: HingedDoorIterationState
): boolean {
  const colorKey = state.sourceKey;
  const grooveMap = ctx.cfg.groovesMap && typeof ctx.cfg.groovesMap === 'object' ? ctx.cfg.groovesMap : {};
  const doorGrooveKey = `groove_${colorKey}`;
  let mapGrooveOn = !!grooveMap[doorGrooveKey] || !!grooveMap[colorKey];
  if (!mapGrooveOn && colorKey.endsWith('_full')) {
    const base = colorKey.slice(0, -5);
    mapGrooveOn = !!grooveMap[`groove_${base}_full`] || mapGrooveOn;
  }
  return ctx.grooveValSafe(state.currentDoorId, 'full', mapGrooveOn);
}

export function appendFullHingedDoorOps(
  ctx: HingedDoorModuleOpsContext,
  state: HingedDoorIterationState
): void {
  if (!ctx.opsList) {
    throw new Error('[WardrobePro] Hinged door ops list missing');
  }

  const colorKey = state.sourceKey;
  const doorHeight = ctx.totalDoorSpace;
  const doorCenterY = ctx.doorBottomY + doorHeight / 2;
  const curtain = ctx.cfg.isMultiColorMode ? ctx.resolveCurtainForPart(colorKey, null) : null;
  const special = ctx.cfg.isMultiColorMode ? ctx.resolveSpecialForPart(colorKey, curtain) : null;
  const isMirror = special === 'mirror';
  const doorGrooveOn = readFullDoorGrooveEnabled(ctx, state);
  const hasGroove = ctx.isGroovesEnabled && doorGrooveOn && !isMirror;
  const style = special === 'glass' ? 'glass' : null;
  const fullDoorTopY = ctx.doorBottomY + doorHeight;
  const fullHandleAbsY = clampHandleAbsY(ctx, ctx.globalHandleAbsY, ctx.doorBottomY, fullDoorTopY, colorKey);

  ctx.opsList.push({
    partId: colorKey,
    moduleIndex: ctx.index,
    pivotX: state.pivotX,
    y: doorCenterY,
    z: ctx.doorFrontZ + 0.01,
    width: state.doorWidth,
    height: doorHeight,
    meshOffsetX: state.meshOffsetX,
    isLeftHinge: state.isLeftHinge,
    isMirror: !!isMirror,
    hasGroove: !!hasGroove,
    curtain,
    style,
    handleAbsY: fullHandleAbsY,
    isRemoved: ctx.removeDoorsEnabled && ctx.isDoorRemovedSafe(colorKey),
  });
}
