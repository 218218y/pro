import { HANDLE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { RenderSketchBoxDoorFrontsArgs } from './render_interior_sketch_boxes_fronts_door_contracts.js';
import type { SketchBoxDoorPlacement } from './render_interior_sketch_boxes_fronts_support.js';
import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import { createSketchBoxExternalDrawersContext } from './render_interior_sketch_boxes_fronts_drawers_context.js';
import {
  createSketchBoxExternalDrawerOpPlan,
  createSketchBoxExternalDrawerStackPlan,
} from './render_interior_sketch_boxes_fronts_drawers_plan.js';
import { asValueRecord } from './render_interior_sketch_shared.js';

function hasLongEdgeHandleVariant(cfg: InteriorValueRecord | null): boolean {
  if (!cfg || cfg.globalHandleType !== 'edge') return false;
  const handlesMap = asValueRecord(cfg.handlesMap);
  if (!handlesMap) return false;

  if (handlesMap.__wp_edge_handle_variant_global === 'long') return true;

  for (const key of Object.keys(handlesMap)) {
    if (key.startsWith('__wp_edge_handle_variant:') && handlesMap[key] === 'long') return true;
  }
  return false;
}

function readFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolveSketchFreeBoxHandleClampPadding(cfg: InteriorValueRecord | null): number {
  return hasLongEdgeHandleVariant(cfg)
    ? HANDLE_DIMENSIONS.edge.longClampPaddingM
    : HANDLE_DIMENSIONS.edge.shortClampPaddingM;
}

function resolveSketchFreeBoxDoorBoundsY(
  args: RenderSketchBoxDoorFrontsArgs,
  placement: SketchBoxDoorPlacement
) {
  const shell = args.frontsArgs.shell;
  const verticalSegment = placement.verticalSegment || null;
  if (
    verticalSegment &&
    Number.isFinite(verticalSegment.bottomY) &&
    Number.isFinite(verticalSegment.topY) &&
    verticalSegment.topY > verticalSegment.bottomY
  ) {
    return { bottomY: verticalSegment.bottomY, topY: verticalSegment.topY };
  }

  const innerBottomY = readFiniteNumber(shell.innerBottomY);
  const innerTopY = readFiniteNumber(shell.innerTopY);
  if (innerBottomY != null && innerTopY != null && innerTopY > innerBottomY) {
    return { bottomY: innerBottomY, topY: innerTopY };
  }

  const centerY = readFiniteNumber(shell.centerY);
  const sideH = readFiniteNumber(shell.sideH);
  if (centerY != null && sideH != null && sideH > 0) {
    return { bottomY: centerY - sideH / 2, topY: centerY + sideH / 2 };
  }

  return null;
}

function clampAbsYToDoorBounds(absY: number, bottomY: number, topY: number, padding: number): number {
  let y = absY;
  const minY = bottomY + padding;
  const maxY = topY - padding;
  if (y < minY) y = minY;
  if (y > maxY) y = maxY;
  return y;
}

export function resolveSketchFreeBoxDoorHandleAbsY(args: {
  renderArgs: RenderSketchBoxDoorFrontsArgs;
  placement: SketchBoxDoorPlacement;
  sharedHandleAbsY?: number | null;
}): number | null {
  const { renderArgs, placement } = args;
  const { frontsArgs } = renderArgs;
  const { shell } = frontsArgs;
  if (shell.isFreePlacement !== true) return null;

  const inputCfg = asValueRecord(asValueRecord(frontsArgs.args.input)?.cfgSnapshot);
  const hasVerticalSegment =
    args.placement.verticalSegment != null &&
    Number.isFinite(args.placement.verticalSegment.bottomY) &&
    Number.isFinite(args.placement.verticalSegment.topY) &&
    args.placement.verticalSegment.topY > args.placement.verticalSegment.bottomY;
  if (!hasVerticalSegment) {
    return typeof args.sharedHandleAbsY === 'number' && Number.isFinite(args.sharedHandleAbsY)
      ? args.sharedHandleAbsY
      : null;
  }

  const requestedAbsY =
    typeof args.sharedHandleAbsY === 'number' && Number.isFinite(args.sharedHandleAbsY)
      ? args.sharedHandleAbsY
      : HANDLE_DIMENSIONS.edge.defaultGlobalAbsYM;
  const bounds = resolveSketchFreeBoxDoorBoundsY(renderArgs, placement);
  if (!bounds) return Number.isFinite(requestedAbsY) ? requestedAbsY : null;

  const padding = resolveSketchFreeBoxHandleClampPadding(inputCfg);
  const resolved = clampAbsYToDoorBounds(requestedAbsY, bounds.bottomY, bounds.topY, padding);
  return Number.isFinite(resolved) ? resolved : null;
}

export function resolveSketchFreeBoxSharedHandleAbsY(args: RenderSketchBoxDoorFrontsArgs): number | null {
  const { frontsArgs } = args;
  const { shell } = frontsArgs;
  if (shell.isFreePlacement !== true) return null;

  const context = createSketchBoxExternalDrawersContext(args);
  if (!context || !context.boxExtDrawers.length) return null;

  let maxDrawerTopY = -Infinity;
  let maxDrawerCount = 0;

  for (let drawerIndex = 0; drawerIndex < context.boxExtDrawers.length; drawerIndex++) {
    const drawerItem = context.boxExtDrawers[drawerIndex];
    if (drawerItem?.__wpRegularExternalDrawer !== true) continue;

    const stack = createSketchBoxExternalDrawerStackPlan(context, drawerItem, drawerIndex);
    if (!stack || !stack.drawerOps.length) continue;

    maxDrawerCount = Math.max(maxDrawerCount, stack.drawerCount, stack.drawerOps.length);

    for (let opIndex = 0; opIndex < stack.drawerOps.length; opIndex++) {
      const opPlan = createSketchBoxExternalDrawerOpPlan(context, stack, stack.drawerOps[opIndex], opIndex);
      if (!opPlan) continue;
      if (Number.isFinite(opPlan.faceMaxY)) maxDrawerTopY = Math.max(maxDrawerTopY, opPlan.faceMaxY);
    }
  }

  if (!Number.isFinite(maxDrawerTopY)) return null;

  const inputCfg = asValueRecord(asValueRecord(frontsArgs.args.input)?.cfgSnapshot);
  const extraLongEdgeLift =
    maxDrawerCount >= HANDLE_DIMENSIONS.edge.longLiftDrawerCountThreshold &&
    hasLongEdgeHandleVariant(inputCfg)
      ? HANDLE_DIMENSIONS.edge.longLiftExtraM
      : 0;
  const liftedHandleAbsY = maxDrawerTopY + HANDLE_DIMENSIONS.edge.drawerLiftClearanceM + extraLongEdgeLift;
  const currentCenteredAbsY = Number(shell.centerY);
  const sharedAbsY = Math.max(
    Number.isFinite(currentCenteredAbsY) ? currentCenteredAbsY : liftedHandleAbsY,
    liftedHandleAbsY
  );

  return Number.isFinite(sharedAbsY) ? sharedAbsY : null;
}
