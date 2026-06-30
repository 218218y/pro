import { DOOR_SYSTEM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { hasMirrorSurfaceOnFace } from '../features/door_authoring/api.js';
import { readDoorVisualMirrorLayout } from './door_visual_lookup_state.js';
import { clampHandleAbsY } from './hinged_doors_module_ops_shared.js';
import { attachHiddenModuleDoors } from './hinged_doors_module_ops_metadata.js';
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

function hasOutsideMirrorSurface(ctx: HingedDoorModuleOpsContext, partId: string): boolean {
  const mirrorLayout = readDoorVisualMirrorLayout(ctx.cfg.mirrorLayoutMap, partId);
  return hasMirrorSurfaceOnFace(mirrorLayout, 1, 1);
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
  if (!(doorHeight > DOOR_SYSTEM_DIMENSIONS.hinged.split.renderMinSegmentHeightM)) return;
  const doorCenterY = ctx.doorBottomY + doorHeight / 2;
  const curtain = ctx.cfg.isMultiColorMode ? ctx.resolveCurtainForPart(colorKey, null) : null;
  const special = ctx.cfg.isMultiColorMode ? ctx.resolveSpecialForPart(colorKey, curtain) : null;
  const isMirror = special === 'mirror';
  const doorGrooveOn = readFullDoorGrooveEnabled(ctx, state);
  const hasGroove =
    ctx.isGroovesEnabled && doorGrooveOn && !(isMirror && hasOutsideMirrorSurface(ctx, colorKey));
  const style = special === 'glass' ? 'glass' : null;
  const fullDoorTopY = ctx.doorBottomY + doorHeight;
  const fullHandleAbsY = clampHandleAbsY(ctx, ctx.globalHandleAbsY, ctx.doorBottomY, fullDoorTopY, colorKey);

  const op = attachHiddenModuleDoors(
    {
      partId: colorKey,
      moduleIndex: ctx.index,
      pivotX: state.pivotX,
      y: doorCenterY,
      z: ctx.doorOpZ,
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
    },
    ctx.moduleDoors
  );
  ctx.opsList.push(op);
}
