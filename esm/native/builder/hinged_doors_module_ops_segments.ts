import { HINGED_DOOR_SPLIT_GEOMETRY_POLICY } from '../../shared/dimensions/door_system_policy.js';
import { hasMirrorSurfaceOnFace, resolveAdhesiveGlassKind } from '../features/door_authoring/api.js';
import { readDoorVisualMirrorLayout } from './door_visual_lookup_state.js';
import { readSplitPosListFromMap } from '../runtime/maps_access.js';
import { attachHiddenModuleDoors } from './hinged_doors_module_ops_metadata.js';
import type {
  HingedDoorIterationState,
  HingedDoorModuleOpsContext,
} from './hinged_doors_module_ops_contracts.js';

function hasOutsideMirrorSurface(ctx: HingedDoorModuleOpsContext, partId: string): boolean {
  const mirrorLayout = readDoorVisualMirrorLayout(ctx.cfg.mirrorLayoutMap, partId);
  return hasMirrorSurfaceOnFace(mirrorLayout, 1, 1);
}

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
  if (!args.partId || !(args.segH > HINGED_DOOR_SPLIT_GEOMETRY_POLICY.renderMinSegmentHeightM)) return;
  const special = ctx.cfg.isMultiColorMode ? ctx.resolveSpecialForPart(args.partId, args.curtainVal) : null;
  const isMirror = special === 'mirror';
  const adhesiveGlassKind = resolveAdhesiveGlassKind(special);
  const hasAdhesiveGlass = !!adhesiveGlassKind;
  const hasGroove =
    ctx.isGroovesEnabled &&
    !!args.grooveFlag &&
    !((isMirror || hasAdhesiveGlass) && hasOutsideMirrorSurface(ctx, args.partId));
  const style = special === 'glass' ? 'glass' : null;
  const op = attachHiddenModuleDoors(
    {
      partId: args.partId,
      moduleIndex: ctx.index,
      pivotX: state.pivotX,
      y: args.segY,
      z: ctx.doorOpZ,
      width: state.doorWidth,
      height: args.segH,
      meshOffsetX: state.meshOffsetX,
      isLeftHinge: state.isLeftHinge,
      isMirror: !!isMirror,
      ...(adhesiveGlassKind ? { adhesiveGlassKind } : null),
      hasGroove: !!hasGroove,
      curtain: args.curtainVal || null,
      style,
      handleAbsY: args.handleAbsY,
      allowHandle: args.allowHandle !== false,
      isRemoved: ctx.removeDoorsEnabled && ctx.isDoorRemovedSafe(args.partId),
    },
    ctx.moduleDoors
  );
  ctx.opsList.push(op);
}

export function readSplitPosListSafe(ctx: HingedDoorModuleOpsContext, doorBaseKey: string): number[] {
  return readSplitPosListFromMap(ctx.cfg && ctx.cfg.splitDoorsMap, doorBaseKey);
}
