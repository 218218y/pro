import type {
  EstimateVisibleModuleFrontZArgs,
  InteriorHoverTarget,
  ResolveInteriorHoverTargetArgs,
} from './canvas_picking_hover_targets_shared.js';
import { estimateVisibleModuleFrontZ as estimateVisibleModuleFrontZImpl } from './canvas_picking_hover_targets_interior_front.js';
import { scanInteriorHoverHit } from './canvas_picking_hover_targets_interior_scan.js';
import { buildInteriorHoverTarget } from './canvas_picking_hover_targets_interior_target.js';

export function resolveInteriorHoverTarget(args: ResolveInteriorHoverTargetArgs): InteriorHoverTarget | null {
  try {
    const scan = scanInteriorHoverHit(args);
    return scan ? buildInteriorHoverTarget({ ...args, scan }) : null;
  } catch {
    return null;
  }
}

export function estimateVisibleModuleFrontZ(args: EstimateVisibleModuleFrontZArgs): number {
  return estimateVisibleModuleFrontZImpl(args);
}
