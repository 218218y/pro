import type { AppContainer, UnknownRecord } from '../../../types';
import {
  DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY,
  DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY,
  DRAWER_SKETCH_SIZING_POLICY,
} from '../../shared/dimensions/drawer_sketch_policy.js';
import { getDrawersArray } from '../runtime/render_access.js';
import {
  asCrossDrawerNode,
  classifyCrossDrawerPart,
  readCrossDrawerCanonicalPartId,
  readCrossDrawerEntryGroup,
  readCrossDrawerModuleKeyFromInternalPartId,
  readCrossDrawerString,
  readCrossDrawerUserData,
} from './canvas_picking_drawer_cross_family_hit_identity.js';
import type { CrossDrawerFamily } from './canvas_picking_drawer_cross_family_model.js';
import { __wp_measureObjectLocalBox } from './canvas_picking_local_helpers_runtime.js';

export type CrossDrawerPreviewBox = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

export type CrossDrawerHoverPreviewTarget = {
  drawer: UnknownRecord;
  parent: UnknownRecord;
  box: CrossDrawerPreviewBox;
};

export type CrossDrawerStackPreview = {
  anchor: unknown;
  anchorParent: unknown;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  stackH: number;
  drawerH: number;
  drawerCount: number;
  drawers: Array<{ y: number; h: number }>;
};

export type CrossDrawerMeasureObjectLocalBoxFn = (
  App: AppContainer,
  obj: unknown,
  parentOverride?: unknown
) => CrossDrawerPreviewBox | null;

export type CrossInternalDrawerStackPreview = {
  anchor: unknown;
  anchorParent: unknown;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  stackH: number;
  drawerH: number;
  drawerGap: number;
};

export function resolveInternalCrossDrawerStackPreview(args: {
  App: AppContainer;
  targetGroup: unknown;
  targetParent: unknown;
  targetBox: CrossDrawerPreviewBox;
  targetPartId: string;
  targetModuleKey?: string;
  measureObjectLocalBox?: CrossDrawerMeasureObjectLocalBoxFn;
  minWidth?: number;
  minDepth?: number;
  minHeight?: number;
  drawerGap?: number;
}): CrossInternalDrawerStackPreview | null {
  const targetParent = asCrossDrawerNode(args.targetParent);
  const targetGroup = asCrossDrawerNode(args.targetGroup);
  if (!targetParent || !targetGroup || !args.targetPartId) return null;

  const measureObjectLocalBox = args.measureObjectLocalBox || __wp_measureObjectLocalBox;
  const targetPartId = readCrossDrawerCanonicalPartId(
    args.targetPartId,
    readCrossDrawerUserData(targetGroup)
  );
  const boxes: CrossDrawerPreviewBox[] = [];
  const entries = getDrawersArray(args.App);
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const group = readCrossDrawerEntryGroup(entry);
    if (!group) continue;
    const userData = readCrossDrawerUserData(group);
    const entryRecord = asCrossDrawerNode(entry);
    const partId = readCrossDrawerCanonicalPartId(userData?.partId ?? entryRecord?.id, userData);
    if (partId !== targetPartId) continue;
    const moduleKey =
      readCrossDrawerString(userData?.moduleIndex ?? userData?.__wpSketchModuleKey) ||
      readCrossDrawerModuleKeyFromInternalPartId(partId);
    if (args.targetModuleKey && moduleKey && moduleKey !== args.targetModuleKey) continue;
    let box = measureObjectLocalBox(args.App, group, targetParent);
    if (!box && group === targetGroup) box = args.targetBox;
    if (!box || !(box.width > 0) || !(box.height > 0) || !(box.depth > 0)) continue;
    boxes.push(box);
  }

  if (!boxes.length) boxes.push(args.targetBox);
  boxes.sort((a, b) => a.centerY - b.centerY);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let drawerH = 0;
  let drawerGap =
    typeof args.drawerGap === 'number' && Number.isFinite(args.drawerGap) && args.drawerGap >= 0
      ? args.drawerGap
      : DRAWER_SKETCH_SIZING_POLICY.internalGapM;

  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    minX = Math.min(minX, box.centerX - box.width / 2);
    maxX = Math.max(maxX, box.centerX + box.width / 2);
    minY = Math.min(minY, box.centerY - box.height / 2);
    maxY = Math.max(maxY, box.centerY + box.height / 2);
    minZ = Math.min(minZ, box.centerZ - box.depth / 2);
    maxZ = Math.max(maxZ, box.centerZ + box.depth / 2);
    drawerH = Math.max(drawerH, box.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return null;
  }

  if (boxes.length > 1) {
    const measuredGaps: number[] = [];
    for (let i = 1; i < boxes.length; i++) {
      const previous = boxes[i - 1];
      const current = boxes[i];
      const gap = current.centerY - current.height / 2 - (previous.centerY + previous.height / 2);
      if (Number.isFinite(gap) && gap >= 0) measuredGaps.push(gap);
    }
    if (measuredGaps.length) drawerGap = Math.max(0, Math.min(...measuredGaps));
  }

  return {
    anchor: targetGroup,
    anchorParent: targetParent,
    x: (minX + maxX) / 2,
    y: minY,
    z: (minZ + maxZ) / 2,
    w: Math.max(args.minWidth ?? DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalWidthMinM, maxX - minX),
    d: Math.max(args.minDepth ?? DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalDepthMinM, maxZ - minZ),
    stackH: Math.max(0, maxY - minY),
    drawerH: Math.max(
      args.minHeight ?? DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinHeightM,
      drawerH || args.targetBox.height
    ),
    drawerGap,
  };
}

function readModuleKeyFromUserData(userData: UnknownRecord | null): string {
  return readCrossDrawerString(userData?.moduleIndex ?? userData?.__wpSketchModuleKey);
}

function readStandardExternalRegularDoorPrefix(partId: string): string {
  const match = partId.match(/^(d\d+)_draw_\d+$/);
  return match ? match[1] : '';
}

function isStandardExternalShoe(partId: string): boolean {
  return /^d\d+_draw_shoe$/.test(partId);
}

function samePossiblyEmptyKey(a: unknown, b: unknown): boolean {
  const left = readCrossDrawerString(a);
  const right = readCrossDrawerString(b);
  return !left || !right || left === right;
}

function shouldIncludeExternalDrawerInStack(
  family: CrossDrawerFamily,
  targetPartId: string,
  targetUserData: UnknownRecord | null,
  candidatePartId: string,
  candidateUserData: UnknownRecord | null
): boolean {
  if (family === 'sketch_external') {
    if (classifyCrossDrawerPart(candidatePartId, candidateUserData) !== 'sketch_external') return false;
    const targetDrawerId = readCrossDrawerString(targetUserData?.__wpSketchExtDrawerId);
    const candidateDrawerId = readCrossDrawerString(candidateUserData?.__wpSketchExtDrawerId);
    if (targetDrawerId && candidateDrawerId && targetDrawerId !== candidateDrawerId) return false;
    if (targetDrawerId && !candidateDrawerId) return false;

    const targetBoxId = readCrossDrawerString(targetUserData?.__wpSketchBoxId);
    const candidateBoxId = readCrossDrawerString(candidateUserData?.__wpSketchBoxId);
    if (targetBoxId && candidateBoxId && targetBoxId !== candidateBoxId) return false;
    if (targetBoxId && !candidateBoxId) return false;

    return samePossiblyEmptyKey(
      readModuleKeyFromUserData(targetUserData),
      readModuleKeyFromUserData(candidateUserData)
    );
  }

  if (family === 'standard_external') {
    if (classifyCrossDrawerPart(candidatePartId, candidateUserData) !== 'standard_external') return false;
    if (isStandardExternalShoe(targetPartId)) return candidatePartId === targetPartId;
    if (isStandardExternalShoe(candidatePartId)) return false;

    const targetPrefix = readStandardExternalRegularDoorPrefix(targetPartId);
    const candidatePrefix = readStandardExternalRegularDoorPrefix(candidatePartId);
    if (targetPrefix && candidatePrefix && targetPrefix !== candidatePrefix) return false;

    return samePossiblyEmptyKey(
      readModuleKeyFromUserData(targetUserData),
      readModuleKeyFromUserData(candidateUserData)
    );
  }

  return false;
}

function includeMeasuredExternalDrawerBox(args: {
  boxes: CrossDrawerPreviewBox[];
  App: AppContainer;
  entry: unknown;
  parent: unknown;
  targetGroup: unknown;
  targetBox: CrossDrawerPreviewBox;
  measureObjectLocalBox: CrossDrawerMeasureObjectLocalBoxFn;
}): void {
  const group = readCrossDrawerEntryGroup(args.entry);
  if (!group) return;
  let box = args.measureObjectLocalBox(args.App, group, args.parent) || null;
  if (!box && group === args.targetGroup) box = args.targetBox;
  if (!box || !(box.width > 0) || !(box.height > 0) || !(box.depth > 0)) return;
  args.boxes.push(box);
}

export function resolveExternalCrossDrawerStackPreview(args: {
  App: AppContainer;
  target: CrossDrawerHoverPreviewTarget;
  measureObjectLocalBox: CrossDrawerMeasureObjectLocalBoxFn;
  family?: CrossDrawerFamily;
  minWidth: number;
  minHeight: number;
  minDepth: number;
  visualThickness: number;
  frontZOffset: number;
}): CrossDrawerStackPreview | null {
  const targetDrawer = asCrossDrawerNode(args.target.drawer);
  const targetGroup = asCrossDrawerNode(targetDrawer?.group);
  const targetUserData = readCrossDrawerUserData(targetGroup);
  const targetPartId = readCrossDrawerString(targetUserData?.partId ?? targetDrawer?.id);
  const family =
    args.family && args.family !== 'other'
      ? args.family
      : classifyCrossDrawerPart(targetPartId, targetUserData);

  if (family !== 'standard_external' && family !== 'sketch_external') return null;
  if (!targetGroup || !targetPartId) return null;

  const boxes: CrossDrawerPreviewBox[] = [];
  const entries = getDrawersArray(args.App);
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const group = readCrossDrawerEntryGroup(entry);
    if (!group) continue;
    const userData = readCrossDrawerUserData(group);
    const partId = readCrossDrawerString(userData?.partId ?? asCrossDrawerNode(entry)?.id);
    if (!partId) continue;
    if (!shouldIncludeExternalDrawerInStack(family, targetPartId, targetUserData, partId, userData)) continue;
    includeMeasuredExternalDrawerBox({
      boxes,
      App: args.App,
      entry,
      parent: args.target.parent,
      targetGroup,
      targetBox: args.target.box,
      measureObjectLocalBox: args.measureObjectLocalBox,
    });
  }

  if (boxes.length === 0) boxes.push(args.target.box);
  boxes.sort((a, b) => a.centerY - b.centerY);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let maxFrontZ = -Infinity;
  let maxDepth = 0;
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    minX = Math.min(minX, box.centerX - box.width / 2);
    maxX = Math.max(maxX, box.centerX + box.width / 2);
    minY = Math.min(minY, box.centerY - box.height / 2);
    maxY = Math.max(maxY, box.centerY + box.height / 2);
    maxFrontZ = Math.max(maxFrontZ, box.centerZ + box.depth / 2);
    maxDepth = Math.max(maxDepth, box.depth);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return null;
  }

  const drawers = boxes.map(box => ({
    y: box.centerY,
    h: Math.max(args.minHeight, box.height),
  }));
  const stackH = Math.max(0, maxY - minY);
  const drawerH =
    drawers.length > 0 ? Math.max(...drawers.map(drawer => drawer.h)) : Math.max(args.minHeight, stackH);
  const visualThickness = args.visualThickness;

  return {
    anchor: targetGroup,
    anchorParent: args.target.parent,
    x: (minX + maxX) / 2,
    y: minY,
    z: maxFrontZ + visualThickness / 2 + args.frontZOffset,
    w: Math.max(args.minWidth, maxX - minX),
    d: Math.max(
      args.minDepth,
      visualThickness,
      maxDepth > 0 ? Math.min(maxDepth, visualThickness) : visualThickness
    ),
    stackH,
    drawerH,
    drawerCount: drawers.length,
    drawers,
  };
}
