import type {
  CommitSketchModuleExternalDrawerArgs,
  CommitSketchModuleInternalDrawerArgs,
} from './canvas_picking_sketch_module_stack_commit_contracts.js';
import {
  SKETCH_EXTERNAL_DRAWER_COUNT_MAX,
  SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
} from './canvas_picking_external_drawer_count_policy.js';
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
  hoverRemoveKind: 'sketch' | '';
} {
  let yCenterAbs = args.clampCenter(args.hitYClamped);
  let hoverOp: 'add' | 'remove' = 'add';
  let hoverRemoveId: string | null = null;
  let hoverRemoveKind: 'sketch' | '' = '';

  const stackHover = args.hoverOk ? readManualLayoutSketchStackHoverIntent(args.hoverRec) : null;
  if (stackHover?.kind === 'drawers') {
    if (stackHover.yCenter != null) yCenterAbs = args.clampCenter(stackHover.yCenter);
    hoverOp = stackHover.op;
    hoverRemoveId = stackHover.removeId;
    hoverRemoveKind = stackHover.removeKind === 'sketch' ? 'sketch' : '';
  }

  return {
    yCenterAbs,
    hoverOp,
    hoverRemoveId,
    hoverRemoveKind,
  };
}

export function maybeOverrideExternalDrawerPlacement(args: {
  hoverOk: CommitSketchModuleExternalDrawerArgs['hoverOk'];
  hoverRec: CommitSketchModuleExternalDrawerArgs['hoverRec'];
  requestedDrawerCount: CommitSketchModuleExternalDrawerArgs['requestedDrawerCount'];
  drawerHeightM: CommitSketchModuleExternalDrawerArgs['drawerHeightM'];
  placement: {
    op: 'add' | 'remove' | 'blocked';
    removeId: string | null;
    yCenter: number;
    drawerCount: number;
    drawerH: number;
    stackH: number;
  };
}): {
  op: 'add' | 'remove' | 'blocked';
  removeId: string | null;
  yCenter: number;
  drawerCount: number;
  drawerH: number;
  stackH: number;
} {
  const stackHover = args.hoverOk ? readManualLayoutSketchStackHoverIntent(args.hoverRec) : null;
  if (stackHover?.kind !== 'ext_drawers' || stackHover.yCenter == null) return args.placement;
  if (args.placement.op === 'blocked' && stackHover.op !== 'remove') return args.placement;

  const hoverDrawerCount =
    stackHover.op === 'remove' && stackHover.drawerCount != null
      ? Math.max(
          SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
          Math.min(SKETCH_EXTERNAL_DRAWER_COUNT_MAX, Math.floor(stackHover.drawerCount))
        )
      : args.requestedDrawerCount;
  const drawerH =
    stackHover.op === 'remove' && stackHover.drawerH != null && stackHover.drawerH > 0
      ? stackHover.drawerH
      : args.drawerHeightM;
  return {
    op: stackHover.op,
    removeId: stackHover.removeId,
    yCenter: stackHover.yCenter,
    drawerCount: hoverDrawerCount,
    drawerH,
    stackH: hoverDrawerCount * drawerH,
  };
}
