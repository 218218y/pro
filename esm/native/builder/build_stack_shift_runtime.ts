import { getDoorsArray, getDrawersArray, getWardrobeGroup } from '../runtime/render_access.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import type { AppContainer, BuildContextLike } from '../../../types';
import { readRecord, readUnknownArray } from './build_flow_readers.js';

function isGlobalSketchFreePlacementObject(value: unknown): boolean {
  const rec = readRecord(value);
  const userData = readRecord(rec?.userData);
  const partId = typeof userData?.partId === 'string' ? userData.partId : '';
  return partId.startsWith('sketch_box_free_');
}

export function shiftWardrobeRange(args: {
  App: AppContainer;
  fromIdx: number;
  toIdx: number;
  dy: number;
  dz: number;
  adjustHandleAbsY: boolean;
}): void {
  const { App } = args;
  if (!App) return;
  if (!Number.isFinite(args.fromIdx) || !Number.isFinite(args.toIdx)) return;

  let dy = args.dy;
  let dz = args.dz;
  if (!Number.isFinite(dy)) dy = 0;
  if (!Number.isFinite(dz)) dz = 0;
  if (Math.abs(dy) < 1e-12 && Math.abs(dz) < 1e-12) return;

  const group = readRecord(getWardrobeGroup(App));
  const arr = readUnknownArray(group?.children);
  const from = Math.max(0, Math.min(arr.length, args.fromIdx | 0));
  const to = Math.max(from, Math.min(arr.length, args.toIdx | 0));

  const moved = new Set<unknown>();
  for (let i = from; i < to; i++) {
    const obj = arr[i];
    if (isGlobalSketchFreePlacementObject(obj)) continue;
    const entry = readRecord(obj);
    if (!entry) continue;
    const pos = readRecord(entry.position);
    if (!pos) continue;
    if (dy && typeof pos.y === 'number') pos.y += dy;
    if (dz && typeof pos.z === 'number') pos.z += dz;
    moved.add(obj);

    if (args.adjustHandleAbsY) {
      const userData = readRecord(entry.userData);
      if (userData && typeof userData.__handleAbsY === 'number' && Number.isFinite(userData.__handleAbsY)) {
        userData.__handleAbsY += dy;
      }
    }
  }

  const drawersArray = getDrawersArray(App);
  for (const drawer of drawersArray) {
    if (!drawer || !drawer.group || !moved.has(drawer.group)) continue;
    const closed = drawer.closed;
    const open = drawer.open;
    if (closed && typeof closed === 'object') {
      if (dy && Number.isFinite(closed.y)) closed.y += dy;
      if (dz && Number.isFinite(closed.z)) closed.z += dz;
    }
    if (open && typeof open === 'object') {
      if (dy && Number.isFinite(open.y)) open.y += dy;
      if (dz && Number.isFinite(open.z)) open.z += dz;
    }

    const userData = readRecord(readRecord(drawer.group)?.userData);
    if (userData) {
      if (dy && typeof userData.__wpFaceMinY === 'number' && Number.isFinite(userData.__wpFaceMinY)) {
        userData.__wpFaceMinY += dy;
      }
      if (dy && typeof userData.__wpFaceMaxY === 'number' && Number.isFinite(userData.__wpFaceMaxY)) {
        userData.__wpFaceMaxY += dy;
      }
      if (dz && typeof userData.__wpFrontZ === 'number' && Number.isFinite(userData.__wpFrontZ)) {
        userData.__wpFrontZ += dz;
      }
    }
  }

  const doorsArray = getDoorsArray(App);
  for (const door of doorsArray) {
    if (!door || door.type !== 'sliding' || !door.group || !moved.has(door.group)) continue;
    if (dz && typeof door.originalZ === 'number' && Number.isFinite(door.originalZ)) door.originalZ += dz;
    if (dz && typeof door.outerZ === 'number' && Number.isFinite(door.outerZ)) door.outerZ += dz;
    if (dz && typeof door.innerZ === 'number' && Number.isFinite(door.innerZ)) door.innerZ += dz;
  }
}

export function syncShiftedInternalGridMapY(App: AppContainer, dy: number): void {
  const grid = getInternalGridMap(App, false);
  for (const key of Object.keys(grid)) {
    const entry = readRecord(readRecord(grid)?.[key]);
    if (!entry) continue;
    if (typeof entry.effectiveBottomY === 'number') entry.effectiveBottomY += dy;
    if (typeof entry.effectiveTopY === 'number') entry.effectiveTopY += dy;
  }
}

export function syncShiftedBuildContextDims(
  ctx: BuildContextLike | null | undefined,
  dy: number,
  dz: number
): void {
  const dims = ctx && ctx.dims ? ctx.dims : null;
  if (!dims) return;
  dims.startY = Number(dims.startY || 0) + dy;
  dims.cabinetTopY = Number(dims.cabinetTopY || 0) + dy;
  dims.splitLineY = Number(dims.splitLineY || 0) + dy;
  dims.internalZ = Number(dims.internalZ || 0) + dz;
}
