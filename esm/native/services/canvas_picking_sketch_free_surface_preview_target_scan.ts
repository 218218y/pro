import type { AppContainer } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type {
  SketchFreeBoxGeometry,
  SketchFreeBoxGeometryArgs,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import {
  type LocalPoint,
  type SelectorLocalBox,
  type SketchFreeBoxTarget,
  type SketchFreeHoverContentKind,
  type SketchFreeHoverHost,
} from './canvas_picking_sketch_free_surface_preview_shared.js';
import { resolveSketchFreeHoverTargetCandidate } from './canvas_picking_sketch_free_surface_preview_target_candidate.js';

export function findSketchFreeHoverTargetBox(args: {
  App: AppContainer;
  tool: string;
  contentKind: SketchFreeHoverContentKind;
  hostModuleKey: SketchFreeHoverHost['moduleKey'];
  freeBoxes: Record<string, unknown>[];
  planeHit: LocalPoint;
  wardrobeBox: SelectorLocalBox;
  wardrobeBackZ: number;
  intersects: RaycastHitLike[];
  localParent: unknown;
  resolveSketchFreeBoxGeometry: (args: SketchFreeBoxGeometryArgs) => SketchFreeBoxGeometry;
  getSketchFreeBoxPartPrefix: (moduleKey: SketchFreeHoverHost['moduleKey'], boxId: unknown) => string;
  findSketchFreeBoxLocalHit: (args: {
    App: AppContainer;
    intersects: RaycastHitLike[];
    localParent: unknown;
    partPrefix: string;
  }) => LocalPoint | null;
}): SketchFreeBoxTarget | null {
  const { freeBoxes, planeHit } = args;
  const planeHitX = Number(planeHit.x);
  const planeHitY = Number(planeHit.y);
  if (!Number.isFinite(planeHitX) || !Number.isFinite(planeHitY)) return null;
  let bestDist = Infinity;
  let bestTarget: SketchFreeBoxTarget | null = null;
  for (let i = 0; i < freeBoxes.length; i++) {
    const candidate = resolveSketchFreeHoverTargetCandidate({ ...args, box: freeBoxes[i], index: i });
    if (!candidate || candidate.dist >= bestDist) continue;
    bestDist = candidate.dist;
    bestTarget = candidate.target;
  }
  return bestTarget;
}
