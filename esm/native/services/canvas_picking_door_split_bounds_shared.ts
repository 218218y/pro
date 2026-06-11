import type { AppContainer, UnknownRecord } from '../../../types';
import { getThreeMaybe } from '../runtime/three_access.js';
import { __wp_asRecord } from './canvas_picking_core_shared.js';
import { __wp_getSplitHoverDoorBaseKey } from './canvas_picking_split_hover_bounds.js';

export type CanvasDoorSplitEffectiveBounds = { minY: number; maxY: number };

type SplitBoundsNode = UnknownRecord & {
  children?: unknown[];
  parent?: unknown;
  position?: { y?: unknown } | null;
  userData?: UnknownRecord | null;
};

function readFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function isBoundsUsable(
  bounds: CanvasDoorSplitEffectiveBounds | null
): bounds is CanvasDoorSplitEffectiveBounds {
  return !!(
    bounds &&
    Number.isFinite(bounds.minY) &&
    Number.isFinite(bounds.maxY) &&
    bounds.maxY > bounds.minY
  );
}

function mergeBounds(
  current: CanvasDoorSplitEffectiveBounds | null,
  next: CanvasDoorSplitEffectiveBounds | null
): CanvasDoorSplitEffectiveBounds | null {
  if (!isBoundsUsable(next)) return current;
  if (!isBoundsUsable(current)) return { minY: next.minY, maxY: next.maxY };
  if (next.minY < current.minY) current.minY = next.minY;
  if (next.maxY > current.maxY) current.maxY = next.maxY;
  return current;
}

function readNodeWorldY(App: AppContainer, node: SplitBoundsNode): number | null {
  try {
    const getWorldPosition = node.getWorldPosition;
    const THREE = getThreeMaybe(App);
    if (typeof getWorldPosition === 'function' && THREE && typeof THREE.Vector3 === 'function') {
      const worldPos = new THREE.Vector3();
      Reflect.apply(getWorldPosition, node, [worldPos]);
      const y = readFiniteNumber((worldPos as { y?: unknown }).y);
      if (y != null) return y;
    }
  } catch {
    // Fall back to structural parent-position accumulation below.
  }

  let y = 0;
  let seenAny = false;
  let curr: UnknownRecord | null = node;
  const visited = new Set<UnknownRecord>();
  while (curr && !visited.has(curr)) {
    visited.add(curr);
    const position = __wp_asRecord(curr.position);
    const localY = readFiniteNumber(position?.y);
    if (localY != null) {
      y += localY;
      seenAny = true;
    }
    curr = __wp_asRecord(curr.parent);
  }
  return seenAny ? y : null;
}

export function readCanvasDoorSplitNodeOwnBounds(
  App: AppContainer,
  node: unknown
): CanvasDoorSplitEffectiveBounds | null {
  const rec = __wp_asRecord(node) as SplitBoundsNode | null;
  const ud = __wp_asRecord(rec?.userData);
  if (!rec || !ud) return null;
  const height = readFiniteNumber(ud.__doorHeight);
  if (height == null || !(height > 0)) return null;
  const centerY = readNodeWorldY(App, rec);
  if (centerY == null) return null;
  return { minY: centerY - height / 2, maxY: centerY + height / 2 };
}

function isSketchSegmentDoorLeaf(userData: UnknownRecord | null, baseKey: string): boolean {
  if (!userData) return false;
  const partId = typeof userData.partId === 'string' ? String(userData.partId) : '';
  if (!partId) return false;
  const candidateBase = __wp_getSplitHoverDoorBaseKey(partId);
  if (candidateBase !== baseKey) return false;
  return userData.__wpSketchDoorSegment === true || userData.__wpSketchDoorLeaf === true;
}

export function readCanvasDoorSplitVisibleSegmentBounds(args: {
  App: AppContainer;
  root: unknown;
  baseKey: string;
}): CanvasDoorSplitEffectiveBounds | null {
  const { App, root, baseKey } = args;
  const rootRec = __wp_asRecord(root) as SplitBoundsNode | null;
  if (!rootRec || !baseKey) return null;

  let bounds: CanvasDoorSplitEffectiveBounds | null = null;
  const stack = Array.isArray(rootRec.children) ? rootRec.children.slice() : [];
  const seen = new Set<UnknownRecord>();
  while (stack.length) {
    const curr = __wp_asRecord(stack.pop()) as SplitBoundsNode | null;
    if (!curr || seen.has(curr)) continue;
    seen.add(curr);
    const ud = __wp_asRecord(curr.userData);
    if (isSketchSegmentDoorLeaf(ud, baseKey)) {
      bounds = mergeBounds(bounds, readCanvasDoorSplitNodeOwnBounds(App, curr));
    }
    const children = Array.isArray(curr.children) ? curr.children : [];
    for (let i = 0; i < children.length; i += 1) stack.push(children[i]);
  }
  return bounds;
}

export function readCanvasDoorSplitEffectiveNodeBounds(args: {
  App: AppContainer;
  node: unknown;
  baseKey?: string | null;
}): CanvasDoorSplitEffectiveBounds | null {
  const rec = __wp_asRecord(args.node) as SplitBoundsNode | null;
  const ud = __wp_asRecord(rec?.userData);
  if (!rec || !ud) return null;
  const partId = typeof ud.partId === 'string' ? String(ud.partId) : '';
  const baseKey = args.baseKey || __wp_getSplitHoverDoorBaseKey(partId);

  if (baseKey && ud.__wpSketchSegmentedDoor === true) {
    const visibleBounds = readCanvasDoorSplitVisibleSegmentBounds({
      App: args.App,
      root: rec,
      baseKey,
    });
    if (isBoundsUsable(visibleBounds)) return visibleBounds;
  }

  return readCanvasDoorSplitNodeOwnBounds(args.App, rec);
}
