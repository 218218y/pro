import type { AppContainer } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type {
  SketchFreeBoxGeometry,
  SketchFreeBoxGeometryArgs,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import { asNumberOrNull } from './canvas_picking_sketch_free_box_shared.js';
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
  projectPointerToLocalZPlane?: ((planeZ: number) => LocalPoint | null) | null;
}): SketchFreeBoxTarget | null {
  const { freeBoxes, planeHit } = args;
  const planeHitX = asNumberOrNull(planeHit.x);
  const planeHitY = asNumberOrNull(planeHit.y);
  if (planeHitX == null || planeHitY == null) return null;
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
