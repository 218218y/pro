import { DOOR_SYSTEM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { readSplitPosListFromMap } from '../runtime/maps_access.js';
import type {
  HingedDoorIterationState,
  HingedDoorModuleOpsContext,
} from './hinged_doors_module_ops_contracts.js';

export function pushHingedDoorSegment(
  ctx: HingedDoorModuleOpsContext,
  state: HingedDoorIterationState,
  args: {
    partId: string;
    segH: number;
    segY: number;
    curtainVal: string | null;
    grooveFlag: unknown;
    handleAbsY: number;
    allowHandle: boolean;
    colorVal: string | null;
  }
): void {
  if (!ctx.opsList) {
    throw new Error('[WardrobePro] Hinged door ops list missing');
  }
  if (!args.partId || !(args.segH > DOOR_SYSTEM_DIMENSIONS.hinged.split.renderMinSegmentHeightM)) return;
  const special = ctx.cfg.isMultiColorMode ? ctx.resolveSpecialForPart(args.partId, args.curtainVal) : null;
  const isMirror = special === 'mirror';
  const hasGroove = ctx.isGroovesEnabled && !!args.grooveFlag && !isMirror;
  const style = special === 'glass' ? 'glass' : null;
  ctx.opsList.push({
    partId: args.partId,
    moduleIndex: ctx.index,
    pivotX: state.pivotX,
    y: args.segY,
    z: ctx.doorFrontZ + DOOR_SYSTEM_DIMENSIONS.hinged.opFrontZOffsetM,
    width: state.doorWidth,
    height: args.segH,
    meshOffsetX: state.meshOffsetX,
    isLeftHinge: state.isLeftHinge,
    isMirror: !!isMirror,
    hasGroove: !!hasGroove,
    curtain: args.curtainVal || null,
    style,
    handleAbsY: args.handleAbsY,
    allowHandle: args.allowHandle !== false,
    isRemoved: ctx.removeDoorsEnabled && ctx.isDoorRemovedSafe(args.partId),
  });
}

export function readSplitPosListSafe(ctx: HingedDoorModuleOpsContext, doorBaseKey: string): number[] {
  return readSplitPosListFromMap(ctx.cfg && ctx.cfg.splitDoorsMap, doorBaseKey);
}
