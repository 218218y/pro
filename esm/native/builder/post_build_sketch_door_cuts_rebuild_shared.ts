// Post-build sketch external-drawer segmented-door rebuild shared node/meta helpers (Pure ESM)
//
// Owns Object3D-like helpers, subtree pick-meta tagging, segment part-id policy, and door-metric metadata writes.

import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { asObject3D, asRecord, type ValueRecord } from './post_build_extras_shared.js';

import type {
  Object3DLike,
  SketchDoorCutsRuntime,
  SketchDrawerCutSegment,
} from './post_build_sketch_door_cuts_contracts.js';

export type SketchDoorNode = Object3DLike;

type DisposableLike = {
  dispose?: () => void;
};

type DisposableRecord = Record<string, unknown> &
  DisposableLike & {
    userData?: ValueRecord;
  };

const MATERIAL_TEXTURE_KEYS: readonly string[] = [
  'map',
  'lightMap',
  'bumpMap',
  'normalMap',
  'specularMap',
  'envMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'displacementMap',
];

export function asSketchDoorNode(value: unknown): SketchDoorNode | null {
  return asObject3D(value);
}

function asDisposableRecord(value: unknown): DisposableRecord | null {
  return asRecord(value) as DisposableRecord | null;
}

function isCachedResource(value: unknown): boolean {
  return asRecord(asDisposableRecord(value)?.userData)?.isCached === true;
}

function disposeResource(value: unknown): void {
  const rec = asDisposableRecord(value);
  if (!rec || isCachedResource(rec) || typeof rec.dispose !== 'function') return;
  try {
    rec.dispose();
  } catch {
    // ignore
  }
}

function disposeMaterialTextures(material: unknown): void {
  const rec = asDisposableRecord(material);
  if (!rec || isCachedResource(rec)) return;
  for (let i = 0; i < MATERIAL_TEXTURE_KEYS.length; i += 1) {
    disposeResource(rec[MATERIAL_TEXTURE_KEYS[i]]);
  }
}

function disposeNodeResources(node: SketchDoorNode): void {
  const children = Array.isArray(node.children) ? node.children : [];
  for (let i = 0; i < children.length; i += 1) {
    const child = asSketchDoorNode(children[i]);
    if (child) disposeNodeResources(child);
  }

  disposeResource(asRecord(node)?.geometry);

  const material = asRecord(node)?.material;
  if (Array.isArray(material)) {
    for (let i = 0; i < material.length; i += 1) {
      disposeMaterialTextures(material[i]);
      disposeResource(material[i]);
    }
    return;
  }

  disposeMaterialTextures(material);
  disposeResource(material);
}

export function removeAllChildren(node: SketchDoorNode): void {
  const children = Array.isArray(node.children) ? node.children.slice() : [];
  for (let i = 0; i < children.length; i++) {
    const child = asSketchDoorNode(children[i]);
    if (!child) continue;
    disposeNodeResources(child);
    try {
      node.remove(child);
    } catch {
      // ignore
    }
  }
}

export function applySketchSegmentPickMeta(node: SketchDoorNode, partId: string): void {
  const stack: SketchDoorNode[] = [node];
  const seen = new Set<SketchDoorNode>();
  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    const currentUd = asRecord(current.userData) || {};
    currentUd.partId = partId;
    currentUd.__wpSketchDoorSegment = true;
    current.userData = currentUd;
    const children = Array.isArray(current.children) ? current.children : [];
    for (let i = 0; i < children.length; i++) {
      const child = asSketchDoorNode(children[i]);
      if (child) stack.push(child);
    }
  }
}

export function readSketchDoorBasePartId(partId: string): string {
  if (!partId) return '';
  return partId.replace(/_(?:full|top|bot|mid\d*)$/i, '');
}

export function resolveSketchDoorSegmentPartId(
  partId: string,
  segCount: number,
  segIndexFromBottom: number
): string {
  const rawId = typeof partId === 'string' ? String(partId) : '';
  if (!rawId) return '';
  if (segCount <= 1) return rawId;
  const baseId = readSketchDoorBasePartId(rawId) || rawId;
  if (segCount === 2) return segIndexFromBottom === 0 ? `${baseId}_bot` : `${baseId}_top`;
  if (segCount === 3) {
    if (segIndexFromBottom === 0) return `${baseId}_bot`;
    if (segIndexFromBottom === 1) return `${baseId}_mid`;
    return `${baseId}_top`;
  }
  if (segIndexFromBottom === 0) return `${baseId}_bot`;
  if (segIndexFromBottom === segCount - 1) return `${baseId}_top`;
  return `${baseId}_mid${segIndexFromBottom}`;
}

export function applySegmentPosition(node: SketchDoorNode, x: number, y: number): void {
  if (node.position?.set) node.position.set(x, y, 0);
  else if (node.position) {
    node.position.x = x;
    node.position.y = y;
    node.position.z = 0;
  }
}

export function markSketchSegmentDoorMetrics(args: {
  node: SketchDoorNode;
  partId: string;
  width: number;
  height: number;
  hingeLeft: boolean;
  thickness: number;
  handleAbsY: number | null;
}): ValueRecord {
  const { node, partId, width, height, hingeLeft, thickness, handleAbsY } = args;
  const userData = asRecord(node.userData) || {};
  userData.partId = partId;
  userData.__doorWidth = width;
  userData.__doorHeight = height;
  userData.__doorMeshOffsetX = 0;
  userData.__doorRectMinX = -width / 2;
  userData.__doorRectMaxX = width / 2;
  userData.__doorRectMinY = -height / 2;
  userData.__doorRectMaxY = height / 2;
  userData.__hingeLeft = hingeLeft;
  userData.__wpFrontThickness = thickness;
  userData.__wpSketchDoorSegment = true;
  userData.__wpSketchDoorLeaf = true;
  userData.__doorPivotCentered = true;
  userData.__wpDoorRemoved = false;
  if (handleAbsY != null) userData.__handleAbsY = handleAbsY;
  else delete userData.__handleAbsY;
  node.userData = userData;
  return userData;
}

export function createRemovedDoorRestoreTarget(args: {
  runtime: SketchDoorCutsRuntime;
  width: number;
  height: number;
  thickness: number;
  partId: string;
  hingeLeft: boolean;
  handleAbsY: number | null;
}): SketchDoorNode {
  const { runtime, width, height, thickness, partId, hingeLeft, handleAbsY } = args;
  const { THREE } = runtime;
  const target = asSketchDoorNode(
    new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.max(DRAWER_DIMENSIONS.sketch.rebuiltSegmentRestoreTargetMinDimensionM, width),
        Math.max(DRAWER_DIMENSIONS.sketch.rebuiltSegmentRestoreTargetMinDimensionM, height),
        Math.max(DRAWER_DIMENSIONS.sketch.rebuiltSegmentRestoreTargetMinThicknessM, thickness)
      ),
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      })
    )
  );
  if (!target) {
    throw new Error(
      '[WardrobePro][sketch_door_cuts] THREE.Mesh did not produce an Object3D-like restore target'
    );
  }
  const targetUd = markSketchSegmentDoorMetrics({
    node: target,
    partId,
    width,
    height,
    hingeLeft,
    thickness,
    handleAbsY,
  });
  targetUd.__wpDoorRemoved = true;
  target.userData = targetUd;
  return target;
}

export function buildSketchSegmentUserData(args: {
  node: SketchDoorNode;
  partId: string;
  width: number;
  height: number;
  hingeLeft: boolean;
  thickness: number;
  handleAbsY: number | null;
  segmentIndex: number;
  includeSegmentPartId?: boolean;
  removed?: boolean;
}): void {
  const {
    node,
    partId,
    width,
    height,
    hingeLeft,
    thickness,
    handleAbsY,
    segmentIndex,
    includeSegmentPartId = true,
    removed = false,
  } = args;
  const userData = markSketchSegmentDoorMetrics({
    node,
    partId,
    width,
    height,
    hingeLeft,
    thickness,
    handleAbsY,
  });
  userData.__wpSketchDoorSegmentIndex = segmentIndex;
  if (includeSegmentPartId) userData.__wpSketchDoorSegmentPartId = partId;
  if (removed) userData.__wpDoorRemoved = true;
  node.userData = userData;
}

export function resolveSegmentHandleAbsY(args: {
  seg: SketchDrawerCutSegment;
  handleAbsY: number | null;
  padding?: number;
}): number | null {
  const { seg, handleAbsY, padding = DRAWER_DIMENSIONS.sketch.rebuiltSegmentDefaultHandlePaddingM } = args;
  if (handleAbsY == null) return null;
  return Math.max(seg.yMin + padding, Math.min(seg.yMax - padding, handleAbsY));
}
