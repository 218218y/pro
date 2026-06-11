import type {
  CommitSketchModuleExternalDrawerArgs,
  CommitSketchModuleInternalDrawerArgs,
} from './canvas_picking_sketch_module_stack_commit_contracts.js';
import { readManualLayoutSketchStackHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';

export function resolveInternalDrawerHoverIntent(args: {
  hoverOk: CommitSketchModuleInternalDrawerArgs['hoverOk'];
  hoverRec: CommitSketchModuleInternalDrawerArgs['hoverRec'];
  hitYClamped: CommitSketchModuleInternalDrawerArgs['hitYClamped'];
  clampCenter: (yCenter: number) => number;
}): {
  yCenterAbs: number;
  hoverOp: 'add' | 'remove';
  hoverRemoveId: string | null;
  hoverRemoveKind: 'sketch' | 'std' | '';
  hoverRemovePid: string | null;
  hoverRemoveSlot: number | null;
} {
  let yCenterAbs = args.clampCenter(args.hitYClamped);
  let hoverOp: 'add' | 'remove' = 'add';
  let hoverRemoveId: string | null = null;
  let hoverRemoveKind: 'sketch' | 'std' | '' = '';
  let hoverRemovePid: string | null = null;
  let hoverRemoveSlot: number | null = null;

  const stackHover = args.hoverOk ? readManualLayoutSketchStackHoverIntent(args.hoverRec) : null;
  if (stackHover?.kind === 'drawers') {
    if (stackHover.yCenter != null) yCenterAbs = args.clampCenter(stackHover.yCenter);
    hoverOp = stackHover.op;
    hoverRemoveId = stackHover.removeId;
    hoverRemoveKind = stackHover.removeKind;
    hoverRemovePid = stackHover.removePid;
    hoverRemoveSlot = stackHover.removeSlot;
  }

  return {
    yCenterAbs,
    hoverOp,
    hoverRemoveId,
    hoverRemoveKind,
    hoverRemovePid,
    hoverRemoveSlot,
  };
}

export function maybeOverrideExternalDrawerPlacement(args: {
  hoverOk: CommitSketchModuleExternalDrawerArgs['hoverOk'];
  hoverRec: CommitSketchModuleExternalDrawerArgs['hoverRec'];
  requestedDrawerCount: CommitSketchModuleExternalDrawerArgs['requestedDrawerCount'];
  drawerHeightM: CommitSketchModuleExternalDrawerArgs['drawerHeightM'];
  placement: {
    op: 'add' | 'remove';
    removeId: string | null;
    yCenter: number;
    drawerCount: number;
    drawerH: number;
    stackH: number;
  };
}): {
  op: 'add' | 'remove';
  removeId: string | null;
  yCenter: number;
  drawerCount: number;
  drawerH: number;
  stackH: number;
} {
  const stackHover = args.hoverOk ? readManualLayoutSketchStackHoverIntent(args.hoverRec) : null;
  if (stackHover?.kind !== 'ext_drawers' || stackHover.yCenter == null) return args.placement;

  const hoverDrawerCount =
    stackHover.drawerCount != null
      ? Math.max(1, Math.min(5, Math.floor(stackHover.drawerCount)))
      : args.requestedDrawerCount;
  const drawerH =
    stackHover.drawerH != null && stackHover.drawerH > 0 ? stackHover.drawerH : args.drawerHeightM;
  return {
    op: stackHover.op,
    removeId: stackHover.removeId,
    yCenter: stackHover.yCenter,
    drawerCount: hoverDrawerCount,
    drawerH,
    stackH: hoverDrawerCount * drawerH,
  };
}
