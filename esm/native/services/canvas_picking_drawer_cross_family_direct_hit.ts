import type { AppContainer, UnknownRecord } from '../../../types';
import { getDrawersArray } from '../runtime/render_access.js';
import type { ModuleKey, PatchConfigForKeyFn } from './canvas_picking_drawer_mode_flow_shared.js';
import {
  asCrossDrawerNode,
  findCrossDrawerHitOnObject,
  readCrossDrawerEntryGroup,
  readCrossDrawerString,
  readCrossDrawerUserData,
  type CrossDrawerObjectNode,
} from './canvas_picking_drawer_cross_family_hit_identity.js';
import type { CrossDrawerFamily, CrossDrawerHit } from './canvas_picking_drawer_cross_family_model.js';
import {
  commitCrossDrawerRemovePlan,
  resolveCrossDrawerRemovePlan,
  sameCrossDrawerModuleKey,
} from './canvas_picking_drawer_cross_family_remove_plan.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import {
  __wp_isViewportRoot,
  __wp_measureObjectLocalBox,
  __wp_projectWorldPointToLocal,
} from './canvas_picking_local_helpers_runtime.js';
import { readSketchHoverHostIdentity } from './canvas_picking_sketch_hover_identity.js';
import { restoreShoeDrawerBaseIfNoShoeDrawersRemain } from './canvas_picking_shoe_drawer_base_auto_none.js';

function isRenderableDirectHitObject(object: unknown): boolean {
  const node = asCrossDrawerNode(object);
  if (!node) return false;
  const type = readCrossDrawerString(node.type);
  return type !== 'LineSegments' && type !== 'Line' && type !== 'Sprite';
}

function resolveHitDrawerGroup(App: AppContainer, hit: CrossDrawerHit): CrossDrawerObjectNode | null {
  let node: CrossDrawerObjectNode | null = asCrossDrawerNode(hit.object);
  while (node && !__wp_isViewportRoot(App, node)) {
    const partId = readCrossDrawerString(readCrossDrawerUserData(node)?.partId);
    if (partId === hit.partId) return node;
    node = asCrossDrawerNode(node.parent);
  }

  const drawers = getDrawersArray(App);
  for (let i = 0; i < drawers.length; i++) {
    const group = readCrossDrawerEntryGroup(drawers[i]);
    if (!group) continue;
    const userData = readCrossDrawerUserData(group);
    const partId = readCrossDrawerString(userData?.partId ?? asCrossDrawerNode(drawers[i])?.id);
    if (partId === hit.partId) return group;
  }
  return asCrossDrawerNode(hit.object);
}

function isPointInsideDirectDrawerHit(App: AppContainer, hit: CrossDrawerHit, point: unknown): boolean {
  const group = resolveHitDrawerGroup(App, hit);
  if (!group) return false;
  const parent = asCrossDrawerNode(group.parent);
  if (!parent) return true;

  const box = __wp_measureObjectLocalBox(App, group, parent);
  if (!box || !(box.width > 0) || !(box.height > 0) || !(box.depth > 0)) return true;

  const localPoint = __wp_projectWorldPointToLocal(App, point, parent);
  if (!localPoint) return true;

  const tolerance = 0.01;
  const withinX = Math.abs(Number(localPoint.x) - Number(box.centerX)) <= Number(box.width) / 2 + tolerance;
  const withinY = Math.abs(Number(localPoint.y) - Number(box.centerY)) <= Number(box.height) / 2 + tolerance;
  if (!withinX || !withinY) return false;

  const halfDepth = Number(box.depth) / 2;
  return Math.abs(Number(localPoint.z) - Number(box.centerZ)) <= halfDepth + Math.max(0.02, halfDepth);
}

export function findDirectCrossDrawerHitInIntersects(
  App: AppContainer,
  intersects: RaycastHitLike[],
  family: CrossDrawerFamily | CrossDrawerFamily[]
): CrossDrawerHit | null {
  const allowed = Array.isArray(family) ? family : [family];
  for (let i = 0; i < intersects.length; i++) {
    const hitObject = intersects[i]?.object;
    if (!isRenderableDirectHitObject(hitObject)) continue;
    const hit = findCrossDrawerHitOnObject(App, hitObject, allowed);
    if (!hit) continue;

    const point = intersects[i]?.point;
    if (!point) {
      if (i === 0) return hit;
      continue;
    }
    if (isPointInsideDirectDrawerHit(App, hit, point)) return hit;
  }
  return null;
}

function isMatchingRecentSketchInternalRemoveHover(args: {
  hover: UnknownRecord | null;
  tool: string;
  moduleKey: ModuleKey | 'corner' | null;
  isBottom: boolean;
  drawerId: string;
  toModuleKey: (value: unknown) => ModuleKey | 'corner' | null;
  now?: number;
  maxAgeMs?: number;
}): boolean {
  const hover = args.hover;
  if (!hover || !args.tool || !args.drawerId) return false;
  if (readCrossDrawerString(hover.tool) !== args.tool) return false;
  if (readCrossDrawerString(hover.kind) !== 'drawers') return false;
  if (readCrossDrawerString(hover.op) !== 'remove') return false;
  if (readCrossDrawerString(hover.removeId) !== args.drawerId) return false;
  const hoverHost = readSketchHoverHostIdentity(hover, args.toModuleKey);
  if (!hoverHost) return false;
  if (hoverHost.moduleKey !== args.moduleKey || hoverHost.isBottom !== !!args.isBottom) return false;

  const timestamp = typeof hover.ts === 'number' ? hover.ts : Number(hover.ts);
  if (!Number.isFinite(timestamp)) return false;
  return (args.now ?? Date.now()) - timestamp <= (args.maxAgeMs ?? 900);
}

export function tryRemoveSketchExternalDrawerByDirectHit(args: {
  App: AppContainer;
  intersects: RaycastHitLike[];
  activeModuleKey: ModuleKey | 'corner' | null;
  patchConfigForKey: PatchConfigForKeyFn;
  source: string;
}): boolean {
  const hit = findDirectCrossDrawerHitInIntersects(args.App, args.intersects || [], 'sketch_external');
  if (!hit) return false;

  const plan = resolveCrossDrawerRemovePlan({ hit, activeModuleKey: args.activeModuleKey });
  if (!plan || plan.kind !== 'remove-sketch-external-drawer') return false;
  const changed = commitCrossDrawerRemovePlan({
    plan,
    patchConfigForKey: args.patchConfigForKey,
    source: args.source,
  });
  if (!changed) return false;

  restoreShoeDrawerBaseIfNoShoeDrawersRemain(args.App, `${args.source}:autoBaseRestore`);
  return true;
}

export function tryRemoveSketchInternalDrawerByDirectHit(args: {
  App: AppContainer;
  intersects: RaycastHitLike[];
  activeModuleKey: ModuleKey | 'corner' | null;
  patchConfigForKey: PatchConfigForKeyFn;
  source: string;
}): boolean {
  const hit = findDirectCrossDrawerHitInIntersects(args.App, args.intersects || [], 'sketch_internal');
  if (!hit) return false;

  const plan = resolveCrossDrawerRemovePlan({ hit, activeModuleKey: args.activeModuleKey });
  if (!plan || plan.kind !== 'remove-sketch-internal-drawer') return false;
  return commitCrossDrawerRemovePlan({
    plan,
    patchConfigForKey: args.patchConfigForKey,
    source: args.source,
  });
}

export function tryRemoveSketchInternalDrawerByMatchingHoverDirectHit(args: {
  App: AppContainer;
  intersects: RaycastHitLike[];
  activeModuleKey: ModuleKey | 'corner' | null;
  isBottom: boolean;
  tool: string;
  hover: UnknownRecord | null;
  toModuleKey: (value: unknown) => ModuleKey | 'corner' | null;
  patchConfigForKey: PatchConfigForKeyFn;
  source: string;
}): boolean {
  const hit = findDirectCrossDrawerHitInIntersects(args.App, args.intersects || [], 'sketch_internal');
  if (!hit) return false;

  const plan = resolveCrossDrawerRemovePlan({ hit, activeModuleKey: args.activeModuleKey });
  if (!plan || plan.kind !== 'remove-sketch-internal-drawer') return false;
  if (
    !isMatchingRecentSketchInternalRemoveHover({
      hover: args.hover,
      tool: args.tool,
      moduleKey: plan.moduleKey,
      isBottom: args.isBottom,
      drawerId: plan.drawerId,
      toModuleKey: args.toModuleKey,
    })
  ) {
    return false;
  }

  return commitCrossDrawerRemovePlan({
    plan,
    patchConfigForKey: args.patchConfigForKey,
    source: args.source,
  });
}

export function sameModuleKey(a: unknown, b: unknown): boolean {
  return sameCrossDrawerModuleKey(a, b);
}
