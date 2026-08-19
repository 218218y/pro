import { getDoorsArray } from '../runtime/render_access.js';
import {
  EDGE_HANDLE_SIZE_POLICY,
  EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY,
  STANDARD_HANDLE_RENDER_POLICY,
} from '../../shared/dimensions/handle_policy.js';
import {
  clampDoorHandleLocalCenterYToFit,
  isUnusuallySmallDoorSegment,
  resolveDoorHandleVerticalFit,
} from '../../shared/wardrobe_construction_validation_shared.js';
import { resolveManualHandleLocalPosition } from '../features/manual_handle_position.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import { createHandleMeshV7 } from './handles_mesh.js';
import {
  notifyHandleFitSuppressions,
  notifyUnusuallySmallDoorSegments,
} from './construction_correction_feedback.js';
import type { HandlesApplyRuntime } from './handles_apply_shared.js';
import type { NodeLike } from './handles_shared.js';
import {
  readDoorLeafRectFromGeometryUserData,
  readGeometryUserDataNumber,
  readGeometryUserDataNumberKey,
  readGeometryUserDataPositiveNumberKey,
  readGeometryUserDataSignKey,
} from './geometry_user_data_contracts.js';

export function applyDoorHandles(runtime: HandlesApplyRuntime): void {
  const { App, removeDoorsEnabled, isDoorRemovedV7, getHandleType, getEdgeHandleVariant, getHandleColor } =
    runtime;
  const doorsArray = getDoorsArray(App);
  if (!Array.isArray(doorsArray)) return;
  const standardSuppressedPartIds: string[] = [];
  const suppressedPartIds: string[] = [];
  const unusuallySmallDoorPartIds: string[] = [];

  for (const d of doorsArray) {
    const g = d && d.group;
    if (!g || !g.userData || !g.userData.partId) continue;
    if (d && d.type === 'sliding') continue;

    const __sk = g.userData && g.userData.__wpStack === 'bottom' ? 'bottom' : 'top';
    if (g.userData.__wpSketchCustomHandles === true) {
      const leaves = collectSketchSegmentHandleLeaves(g);
      collectUnusuallySmallSketchDoorPartIds(leaves, unusuallySmallDoorPartIds);
      refreshSketchSegmentedDoorHandles(runtime, g, __sk, leaves, suppressedPartIds);
      continue;
    }

    runtime.removeExistingHandleChildren(g);

    const id = g.userData.partId;
    if (removeDoorsEnabled && isDoorRemovedV7(id)) continue;

    const doorW = readGeometryUserDataPositiveNumberKey(g.userData, '__doorWidth') ?? 0;
    const doorH = readGeometryUserDataPositiveNumberKey(g.userData, '__doorHeight') ?? 0;
    const partId = formatIdentityValue(readIdentityValue(id));
    if (partId && isUnusuallySmallDoorSegment({ partId, doorHeightM: doorH, isSketchSegment: false })) {
      unusuallySmallDoorPartIds.push(partId);
    }

    const hType = getHandleType(id, __sk);
    if (!hType || hType === 'none') continue;

    const isLeftHinge = !!g.userData.__hingeLeft;
    const edgeHandleVariant = hType === 'edge' ? getEdgeHandleVariant(id) : null;

    const handle = createHandleMeshV7(hType, doorW, doorH, isLeftHinge, false, {
      App,
      addOutlines: runtime.addOutlines,
      edgeHandleVariant,
      handleColor: getHandleColor(id),
    });
    if (!handle) continue;

    applyDoorHandleZFlip(g, handle);
    const isManualPlacement = applyDoorHandleManualPlacement(
      runtime,
      g,
      handle,
      doorW,
      isLeftHinge,
      hType,
      id
    );
    if (!isManualPlacement) {
      applyDoorHandleVerticalPlacement(runtime, g, handle, doorH);
    }
    if (
      !ensureDoorHandleFitsLeaf({
        hType,
        edgeHandleVariant,
        doorH,
        handle,
        isManualPlacement,
      })
    ) {
      const suppressedPartId = formatIdentityValue(readIdentityValue(id));
      if (suppressedPartId) standardSuppressedPartIds.push(suppressedPartId);
      continue;
    }
    g.add(handle);
  }

  notifySuppressedStandardDoorHandles(App, standardSuppressedPartIds);
  notifySuppressedSketchSegmentDoorHandles(App, suppressedPartIds);
  notifyUnusuallySmallDoorSegments(App, unusuallySmallDoorPartIds);
}

function applyDoorHandleZFlip(group: NodeLike, handle: NodeLike): void {
  const handleZSign = readGeometryUserDataSignKey(group.userData, '__handleZSign', 1);
  if (handleZSign !== -1) return;

  try {
    handle.traverse?.((ch: NodeLike) => {
      if (ch && ch.position && typeof ch.position.z === 'number') ch.position.z *= -1;
    });
  } catch (_e) {
    // builder-handle-visual-fallback: optional handle visual metadata must not block door rendering
  }
}

function readDoorLeafRectFromUserData(userData: NodeLike['userData'] | null | undefined) {
  return readDoorLeafRectFromGeometryUserData(userData);
}

type SketchSegmentHandleLeaf = {
  node: NodeLike;
  partId: string;
  rootWidth: number;
  height: number;
  constructionHeight: number;
  centerLocalY: number;
  isLeftHinge: boolean;
  handleAbsY: number | null;
};

function isHandleNode(node: NodeLike | null | undefined): boolean {
  return !!(
    node &&
    (node.name === 'handle_group_v7' ||
      node.userData?.__kind === 'handle' ||
      node.userData?.isHandle === true)
  );
}

function readOptionalFinite(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  return readGeometryUserDataNumber(value);
}

function collectSketchSegmentHandleLeaves(root: NodeLike): SketchSegmentHandleLeaf[] {
  const rootWidth = readOptionalFinite(root.userData?.__doorWidth) ?? 0;
  const rootHandleAbsY = readOptionalFinite(root.userData?.__handleAbsY);
  const fallbackHingeLeft = !!root.userData?.__hingeLeft;
  const out: SketchSegmentHandleLeaf[] = [];
  const stack: NodeLike[] = Array.isArray(root.children) ? root.children.slice() : [];
  const seen = new Set<NodeLike>();

  while (stack.length) {
    const node = stack.pop();
    if (!node || seen.has(node) || isHandleNode(node)) continue;
    seen.add(node);

    const ud = node.userData || {};
    const isLeaf = ud.__wpSketchDoorLeaf === true;
    const partId =
      typeof ud.__wpSketchDoorSegmentPartId === 'string' && ud.__wpSketchDoorSegmentPartId
        ? ud.__wpSketchDoorSegmentPartId
        : typeof ud.partId === 'string'
          ? ud.partId
          : '';
    const height = readOptionalFinite(ud.__doorHeight);
    const constructionHeight = readOptionalFinite(ud.__wpDoorConstructionHeight) ?? height;
    const centerLocalY = readOptionalFinite(node.position?.y);
    const effectiveRootWidth = rootWidth > 0 ? rootWidth : (readOptionalFinite(ud.__doorWidth) ?? 0);

    if (
      isLeaf &&
      partId &&
      effectiveRootWidth > 0 &&
      height != null &&
      height > 0 &&
      constructionHeight != null &&
      constructionHeight > 0 &&
      centerLocalY != null &&
      ud.__wpDoorRemoved !== true
    ) {
      out.push({
        node,
        partId,
        rootWidth: effectiveRootWidth,
        height,
        constructionHeight,
        centerLocalY,
        isLeftHinge: typeof ud.__hingeLeft === 'boolean' ? !!ud.__hingeLeft : fallbackHingeLeft,
        handleAbsY: readOptionalFinite(ud.__handleAbsY) ?? rootHandleAbsY,
      });
      continue;
    }

    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) stack.push(child);
  }

  out.sort((a, b) => {
    const ai = readOptionalFinite(a.node.userData?.__wpSketchDoorSegmentIndex);
    const bi = readOptionalFinite(b.node.userData?.__wpSketchDoorSegmentIndex);
    if (ai != null && bi != null && ai !== bi) return ai - bi;
    return a.centerLocalY - b.centerLocalY;
  });
  return out;
}

function collectUnusuallySmallSketchDoorPartIds(
  leaves: readonly SketchSegmentHandleLeaf[],
  out: string[]
): void {
  for (const leaf of leaves) {
    if (
      isUnusuallySmallDoorSegment({
        partId: leaf.partId,
        doorHeightM: leaf.constructionHeight,
        isSketchSegment: true,
      })
    ) {
      out.push(leaf.partId);
    }
  }
}

function resolveSegmentManualHandleLocalY(args: {
  runtime: HandlesApplyRuntime;
  root: NodeLike;
  handle: NodeLike;
  leaf: SketchSegmentHandleLeaf;
  hType: string;
  edgeHandleVariant: unknown;
}): number | null | undefined {
  const { runtime, root, handle, leaf, hType, edgeHandleVariant } = args;
  const manualPosition = runtime.getManualHandlePosition(leaf.partId);
  if (!manualPosition) return undefined;

  const meshOffsetX = readOptionalFinite(root.userData?.__doorMeshOffsetX) ?? 0;
  const rect = {
    minX: -leaf.rootWidth / 2,
    maxX: leaf.rootWidth / 2,
    minY: -leaf.height / 2,
    maxY: leaf.height / 2,
  };
  const local = resolveManualHandleLocalPosition({ rect, position: manualPosition });
  if (!local) return undefined;

  const fit = resolveDoorHandleVerticalFit({
    handleType: hType,
    edgeHandleVariant,
    doorHeightM: leaf.height,
    localCenterYM: local.y,
  });
  if (!fit.fits) return null;

  const defaultAnchorX = resolveDefaultHandleAnchorX(hType, leaf.rootWidth, leaf.isLeftHinge);
  handle.position.x = meshOffsetX + local.x - defaultAnchorX;
  return local.y;
}

function resolveSegmentHandleClampPadding(edgeHandleVariant: unknown): number {
  return edgeHandleVariant === 'long'
    ? EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.longClampPaddingM
    : EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.shortClampPaddingM;
}

function resolveSegmentAutoHandleLocalY(args: {
  runtime: HandlesApplyRuntime;
  root: NodeLike;
  leaf: SketchSegmentHandleLeaf;
  hType: string;
  edgeHandleVariant: unknown;
}): number | null {
  const { runtime, root, leaf, hType, edgeHandleVariant } = args;
  const rootCenterY = readOptionalFinite(root.position?.y) ?? 0;
  const segmentCenterAbsY = rootCenterY + leaf.centerLocalY;
  const requestedAbsY = leaf.handleAbsY ?? rootCenterY;
  const clampedAbsY = runtime.clampAbsYToGroup(requestedAbsY, segmentCenterAbsY, leaf.height);
  const pad = resolveSegmentHandleClampPadding(edgeHandleVariant);
  const paddedMinAbsY = segmentCenterAbsY - leaf.height / 2 + pad;
  const paddedMaxAbsY = segmentCenterAbsY + leaf.height / 2 - pad;
  const targetAbsY =
    Number.isFinite(paddedMinAbsY) && Number.isFinite(paddedMaxAbsY) && paddedMaxAbsY >= paddedMinAbsY
      ? Math.max(paddedMinAbsY, Math.min(paddedMaxAbsY, clampedAbsY))
      : clampedAbsY;

  return clampDoorHandleLocalCenterYToFit({
    handleType: hType,
    edgeHandleVariant,
    doorHeightM: leaf.height,
    localCenterYM: targetAbsY - segmentCenterAbsY,
  });
}

function refreshSketchSegmentedDoorHandles(
  runtime: HandlesApplyRuntime,
  root: NodeLike,
  stackKey: 'top' | 'bottom',
  leaves: readonly SketchSegmentHandleLeaf[],
  suppressedPartIds: string[]
): void {
  if (root.userData?.__wpSketchSegmentedDoor !== true) return;

  runtime.removeExistingHandleChildren(root);
  if (!leaves.length) return;

  for (const leaf of leaves) {
    if (runtime.removeDoorsEnabled && runtime.isDoorRemovedV7(leaf.partId)) continue;

    const hType = runtime.getHandleType(leaf.partId, stackKey);
    if (!hType || hType === 'none') continue;

    const edgeHandleVariant = hType === 'edge' ? runtime.getEdgeHandleVariant(leaf.partId) : null;
    const handle = createHandleMeshV7(hType, leaf.rootWidth, leaf.height, leaf.isLeftHinge, false, {
      App: runtime.App,
      addOutlines: runtime.addOutlines,
      edgeHandleVariant,
      handleColor: runtime.getHandleColor(leaf.partId),
    });
    if (!handle) continue;

    applyDoorHandleZFlip(root, handle);
    const manualLocalY = resolveSegmentManualHandleLocalY({
      runtime,
      root,
      handle,
      leaf,
      hType,
      edgeHandleVariant,
    });
    const localCenterY =
      manualLocalY === undefined
        ? resolveSegmentAutoHandleLocalY({ runtime, root, leaf, hType, edgeHandleVariant })
        : manualLocalY;

    if (localCenterY == null) {
      suppressedPartIds.push(leaf.partId);
      continue;
    }

    handle.position.y = leaf.centerLocalY + localCenterY;
    handle.userData = { ...handle.userData, partId: leaf.partId };
    root.add(handle);
  }
}

function resolveDefaultHandleAnchorX(hType: string, doorW: number, isLeftHinge: boolean): number {
  if (hType === 'edge') {
    return isLeftHinge
      ? doorW + EDGE_HANDLE_SIZE_POLICY.doorAnchorOffsetM
      : -doorW - EDGE_HANDLE_SIZE_POLICY.doorAnchorOffsetM;
  }
  const offset = STANDARD_HANDLE_RENDER_POLICY.doorOffsetM;
  return isLeftHinge ? doorW - offset : -doorW + offset;
}

function applyDoorHandleManualPlacement(
  runtime: HandlesApplyRuntime,
  group: NodeLike,
  handle: NodeLike,
  doorW: number,
  isLeftHinge: boolean,
  hType: string,
  id: unknown
): boolean {
  const manualPosition = runtime.getManualHandlePosition(id);
  if (!manualPosition) return false;

  const rect = readDoorLeafRectFromUserData(group.userData);
  const local = resolveManualHandleLocalPosition({ rect, position: manualPosition });
  if (!local) return false;

  const defaultAnchorX = resolveDefaultHandleAnchorX(hType, doorW, isLeftHinge);
  handle.position.x = local.x - defaultAnchorX;
  handle.position.y = local.y;
  return true;
}

function applyDoorHandleVerticalPlacement(
  runtime: HandlesApplyRuntime,
  group: NodeLike,
  handle: NodeLike,
  doorH: number
): void {
  const absY = readGeometryUserDataNumberKey(group.userData, '__handleAbsY');
  if (absY == null) return;
  const groupY = readGeometryUserDataNumber(group.position?.y) ?? 0;
  const targetAbsY = runtime.clampAbsYToGroup(absY, groupY, doorH);
  handle.position.y = targetAbsY - groupY;
}

function ensureDoorHandleFitsLeaf(args: {
  hType: string;
  edgeHandleVariant: unknown;
  doorH: number;
  handle: NodeLike;
  isManualPlacement: boolean;
}): boolean {
  const input = {
    handleType: args.hType,
    edgeHandleVariant: args.edgeHandleVariant,
    doorHeightM: args.doorH,
    localCenterYM: readGeometryUserDataNumber(args.handle.position?.y) ?? 0,
  };

  if (args.isManualPlacement) {
    return resolveDoorHandleVerticalFit(input).fits;
  }

  const clampedY = clampDoorHandleLocalCenterYToFit(input);
  if (clampedY == null) return false;
  args.handle.position.y = clampedY;
  return true;
}

function notifySuppressedStandardDoorHandles(App: unknown, partIds: string[]): void {
  notifyHandleFitSuppressions(App, partIds, {
    scope: 'standard-door-handles',
    completePass: true,
  });
}

function notifySuppressedSketchSegmentDoorHandles(App: unknown, partIds: string[]): void {
  notifyHandleFitSuppressions(App, partIds, {
    scope: 'sketch-segment-door-handles',
    completePass: true,
  });
}
