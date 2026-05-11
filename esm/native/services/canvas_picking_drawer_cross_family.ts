import type { AppContainer, ModuleConfigLike, UnknownRecord } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import { getDrawersArray } from '../runtime/render_access.js';
import {
  __wp_isViewportRoot,
  __wp_measureObjectLocalBox,
  __wp_projectWorldPointToLocal,
} from './canvas_picking_local_helpers_runtime.js';

export type CrossDrawerFamily =
  | 'standard_external'
  | 'sketch_external'
  | 'standard_internal'
  | 'sketch_internal'
  | 'other';

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

export type CrossDrawerHit = {
  object: Record<string, unknown>;
  partId: string;
  family: CrossDrawerFamily;
  moduleIndex: string;
  sketchExtDrawerId: string;
  sketchBoxId: string;
};

type ObjectNode = Record<string, unknown> & {
  parent?: ObjectNode | null;
  userData?: UnknownRecord | null;
};

function asNode(value: unknown): ObjectNode | null {
  return value && typeof value === 'object' ? (value as ObjectNode) : null;
}

function readUserData(value: unknown): UnknownRecord | null {
  const node = asNode(value);
  const userData = node?.userData;
  return userData && typeof userData === 'object' && !Array.isArray(userData) ? userData : null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function classifyCrossDrawerPart(partId: unknown, userData?: UnknownRecord | null): CrossDrawerFamily {
  const pid = readString(partId);
  const ud = userData || null;
  if (!pid) return 'other';

  if (
    ud?.__wpSketchExtDrawer === true ||
    pid.startsWith('sketch_ext_drawers_') ||
    /^sketch_box(?:_free)?_.+_ext_drawers_/.test(pid)
  ) {
    return 'sketch_external';
  }

  if (pid.startsWith('div_int_sketch_')) return 'sketch_internal';
  if (/^d\d+_draw_(?:shoe|\d+)$/.test(pid)) return 'standard_external';
  if (pid.startsWith('div_int_')) return 'standard_internal';
  return 'other';
}

function findCrossDrawerHitOnObject(
  App: AppContainer,
  object: unknown,
  allowed: CrossDrawerFamily[]
): CrossDrawerHit | null {
  let node = asNode(object);
  while (node && !__wp_isViewportRoot(App, node)) {
    const ud = readUserData(node);
    const pid = readString(ud?.partId);
    const detected = classifyCrossDrawerPart(pid, ud);
    if (pid && allowed.includes(detected)) {
      return {
        object: node,
        partId: pid,
        family: detected,
        moduleIndex: readString(ud?.moduleIndex ?? ud?.__wpSketchModuleKey),
        sketchExtDrawerId: readString(ud?.__wpSketchExtDrawerId),
        sketchBoxId: readString(ud?.__wpSketchBoxId),
      };
    }
    node = asNode(node.parent);
  }
  return null;
}

export function findCrossDrawerHitInIntersects(
  App: AppContainer,
  intersects: RaycastHitLike[],
  family: CrossDrawerFamily | CrossDrawerFamily[]
): CrossDrawerHit | null {
  const allowed = Array.isArray(family) ? family : [family];
  for (let i = 0; i < intersects.length; i++) {
    const hit = findCrossDrawerHitOnObject(App, intersects[i]?.object, allowed);
    if (hit) return hit;
  }
  return null;
}

function isRenderableDirectHitObject(object: unknown): boolean {
  const node = asNode(object);
  if (!node) return false;
  const type = readString(node.type);
  return type !== 'LineSegments' && type !== 'Line' && type !== 'Sprite';
}

function resolveHitDrawerGroup(App: AppContainer, hit: CrossDrawerHit): ObjectNode | null {
  let node: ObjectNode | null = asNode(hit.object);
  while (node && !__wp_isViewportRoot(App, node)) {
    const ud = readUserData(node);
    const pid = readString(ud?.partId);
    if (pid === hit.partId) return node;
    node = asNode(node.parent);
  }

  const drawers = getDrawersArray(App);
  for (let i = 0; i < drawers.length; i++) {
    const group = readEntryGroup(drawers[i]);
    if (!group) continue;
    const ud = readUserData(group);
    const pid = readString(ud?.partId ?? asNode(drawers[i])?.id);
    if (pid === hit.partId) return group;
  }
  return asNode(hit.object);
}

function isPointInsideDirectDrawerHit(App: AppContainer, hit: CrossDrawerHit, point: unknown): boolean {
  const group = resolveHitDrawerGroup(App, hit);
  if (!group) return false;
  const parent = asNode(group.parent);
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
  const withinDepth =
    Math.abs(Number(localPoint.z) - Number(box.centerZ)) <= halfDepth + Math.max(0.02, halfDepth);
  return withinDepth;
}

export function findDirectCrossDrawerHitInIntersects(
  App: AppContainer,
  intersects: RaycastHitLike[],
  family: CrossDrawerFamily | CrossDrawerFamily[]
): CrossDrawerHit | null {
  const allowed = Array.isArray(family) ? family : [family];
  for (let i = 0; i < intersects.length; i++) {
    const hitObj = intersects[i]?.object;
    if (!isRenderableDirectHitObject(hitObj)) continue;
    const hit = findCrossDrawerHitOnObject(App, hitObj, allowed);
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

function readSketchExtras(cfg: UnknownRecord): UnknownRecord | null {
  const current = cfg.sketchExtras;
  return current && typeof current === 'object' && !Array.isArray(current)
    ? (current as UnknownRecord)
    : null;
}

function readArray(record: UnknownRecord | null, key: string): UnknownRecord[] {
  const current = record ? record[key] : null;
  return Array.isArray(current) ? (current as UnknownRecord[]) : [];
}

function removeListItemById(list: UnknownRecord[], id: string): boolean {
  if (!id) return false;
  const idx = list.findIndex(item => readString(item && typeof item === 'object' ? item.id : '') === id);
  if (idx < 0) return false;
  list.splice(idx, 1);
  return true;
}

function removeSketchDrawerByPartSuffix(
  cfg: UnknownRecord,
  listKey: 'drawers' | 'extDrawers',
  partId: string
): boolean {
  const extra = readSketchExtras(cfg);
  const list = readArray(extra, listKey);
  for (let i = list.length - 1; i >= 0; i--) {
    const item = list[i];
    const id = readString(item && typeof item === 'object' ? item.id : '');
    if (id && partId.endsWith(`_${id}`)) {
      list.splice(i, 1);
      return true;
    }
  }
  return false;
}

export function removeSketchInternalDrawerFromConfig(
  cfg: ModuleConfigLike | UnknownRecord,
  partId: string
): boolean {
  return removeSketchDrawerByPartSuffix(cfg as UnknownRecord, 'drawers', partId);
}

export function removeSketchExternalDrawerFromConfig(
  cfg: ModuleConfigLike | UnknownRecord,
  drawerId: string,
  boxId?: string,
  partId?: string
): boolean {
  const extra = readSketchExtras(cfg as UnknownRecord);
  const topLevel = readArray(extra, 'extDrawers');
  if (removeListItemById(topLevel, drawerId)) return true;
  if (partId && removeSketchDrawerByPartSuffix(cfg as UnknownRecord, 'extDrawers', partId)) return true;

  const boxes = readArray(extra, 'boxes');
  const candidateBoxes = boxId ? boxes.filter(box => readString(box?.id) === boxId) : boxes;
  for (let i = 0; i < candidateBoxes.length; i++) {
    const box = candidateBoxes[i];
    if (!box || typeof box !== 'object') continue;
    const list = readArray(box, 'extDrawers');
    if (removeListItemById(list, drawerId)) return true;
    if (partId) {
      for (let j = list.length - 1; j >= 0; j--) {
        const id = readString(list[j]?.id);
        if (id && partId.endsWith(`_${id}`)) {
          list.splice(j, 1);
          return true;
        }
      }
    }
  }
  return false;
}

export function removeStandardInternalDrawerFromConfig(
  cfg: ModuleConfigLike | UnknownRecord,
  partId: string,
  slotHint?: number | null
): boolean {
  const match = partId.match(/_slot_(\d+)/);
  const slot = match ? Number(match[1]) : Number(slotHint);
  if (!Number.isFinite(slot)) return false;
  let changed = false;
  const rec = cfg as UnknownRecord;
  const list = Array.isArray(rec.intDrawersList) ? rec.intDrawersList : null;
  if (list) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (Number(list[i]) === slot) {
        list.splice(i, 1);
        changed = true;
      }
    }
  }
  if (Number(rec.intDrawersSlot) === slot) {
    try {
      delete rec.intDrawersSlot;
    } catch {
      rec.intDrawersSlot = null;
    }
    changed = true;
  }
  return changed;
}

export function removeStandardExternalDrawerFromConfig(
  cfg: ModuleConfigLike | UnknownRecord,
  partId: string
): boolean {
  const rec = cfg as UnknownRecord;
  if (/^d\d+_draw_shoe$/.test(partId)) {
    if (rec.hasShoeDrawer) {
      rec.hasShoeDrawer = false;
      return true;
    }
    return false;
  }
  if (/^d\d+_draw_\d+$/.test(partId)) {
    if (Number(rec.extDrawersCount) !== 0) {
      rec.extDrawersCount = 0;
      return true;
    }
    return false;
  }
  return false;
}

export function sameModuleKey(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function readModuleKeyFromUserData(ud: UnknownRecord | null): string {
  return readString(ud?.moduleIndex ?? ud?.__wpSketchModuleKey);
}

function readEntryGroup(entry: unknown): ObjectNode | null {
  return asNode(readUserData(entry)?.group ?? (asNode(entry)?.group as unknown));
}

function readStandardExternalRegularDoorPrefix(partId: string): string {
  const match = partId.match(/^(d\d+)_draw_\d+$/);
  return match ? match[1] : '';
}

function isStandardExternalShoe(partId: string): boolean {
  return /^d\d+_draw_shoe$/.test(partId);
}

function samePossiblyEmptyKey(a: unknown, b: unknown): boolean {
  const aa = readString(a);
  const bb = readString(b);
  return !aa || !bb || aa === bb;
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
    const targetDrawerId = readString(targetUserData?.__wpSketchExtDrawerId);
    const candidateDrawerId = readString(candidateUserData?.__wpSketchExtDrawerId);
    if (targetDrawerId && candidateDrawerId && targetDrawerId !== candidateDrawerId) return false;
    if (targetDrawerId && !candidateDrawerId) return false;

    const targetBoxId = readString(targetUserData?.__wpSketchBoxId);
    const candidateBoxId = readString(candidateUserData?.__wpSketchBoxId);
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
  const group = readEntryGroup(args.entry);
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
  const targetDrawer = asNode(args.target.drawer);
  const targetGroup = asNode(targetDrawer?.group);
  const targetUserData = readUserData(targetGroup);
  const targetPartId = readString(targetUserData?.partId ?? targetDrawer?.id);
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
    const group = readEntryGroup(entry);
    if (!group) continue;
    const ud = readUserData(group);
    const partId = readString(ud?.partId ?? asNode(entry)?.id);
    if (!partId) continue;
    if (!shouldIncludeExternalDrawerInStack(family, targetPartId, targetUserData, partId, ud)) continue;
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
  const visualT = args.visualThickness;

  return {
    anchor: targetGroup,
    anchorParent: args.target.parent,
    x: (minX + maxX) / 2,
    y: minY,
    z: maxFrontZ + visualT / 2 + args.frontZOffset,
    w: Math.max(args.minWidth, maxX - minX),
    d: Math.max(args.minDepth, visualT, maxDepth > 0 ? Math.min(maxDepth, visualT) : visualT),
    stackH,
    drawerH,
    drawerCount: drawers.length,
    drawers,
  };
}
