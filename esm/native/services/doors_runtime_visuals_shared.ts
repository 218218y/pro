import { getTools } from '../runtime/service_access.js';
import { getDimsMFromPlatform } from '../runtime/platform_access.js';
import { getDoorsArray } from '../runtime/render_access.js';
import {
  type AppLike,
  isInvalidNumber,
  readNumber,
  readRecord,
  reportDoorsRuntimeNonFatal,
} from './doors_runtime_shared.js';

export const DOOR_OVERLAP = 0.03;

export function readDoorsTotalWidth(App: AppLike): number {
  return readNumber(readRecord(getDimsMFromPlatform(App)), 'w', 0);
}

export function readInteriorManualTool(App: AppLike): unknown {
  try {
    const tools = getTools(App);
    const getter =
      tools && typeof tools.getInteriorManualTool === 'function' ? tools.getInteriorManualTool : null;
    return getter ? getter.call(tools) : null;
  } catch {
    return null;
  }
}

export function resolveDoorPartId(group: ReturnType<typeof getDoorsArray>[number]['group'] | null): string {
  let cur = group;
  for (let i = 0; i < 6 && cur; i++) {
    const userData = cur && cur.userData ? cur.userData : null;
    if (userData && userData.partId != null) return String(userData.partId);
    cur = cur.parent;
  }
  return '';
}

export function resolveSlidingDoorClosedState(
  door: ReturnType<typeof getDoorsArray>[number],
  totalW: number
): { closedX: number; closedZ: number; doorW: number; outerZ: number } {
  let closedX = door.originalX;
  let closedZ = door.originalZ;
  let doorW = typeof door.width === 'number' && Number.isFinite(door.width) ? door.width : 0;

  if (closedX === undefined || closedX === null || isNaN(closedX)) {
    const doorsCount = typeof door.total === 'number' && Number.isFinite(door.total) ? door.total : 2;
    const idx = typeof door.index === 'number' && Number.isFinite(door.index) ? door.index : 0;
    doorW = (totalW + (doorsCount - 1) * DOOR_OVERLAP) / doorsCount;
    closedX = idx * (doorW - DOOR_OVERLAP) - totalW / 2 + doorW / 2;
    door.originalX = closedX;
    door.width = doorW;
  }

  if (closedZ === undefined || closedZ === null || isInvalidNumber(closedZ)) {
    try {
      closedZ = door.group && door.group.position ? door.group.position.z : 0;
    } catch (_e) {
      closedZ = 0;
    }
    door.originalZ = closedZ;
  }

  if (!(doorW > 0)) {
    const doorsCount = typeof door.total === 'number' && Number.isFinite(door.total) ? door.total : 2;
    doorW = (totalW + (doorsCount - 1) * DOOR_OVERLAP) / doorsCount;
  }

  const outerZ = typeof door.outerZ === 'number' && Number.isFinite(door.outerZ) ? door.outerZ : closedZ;
  return { closedX, closedZ, doorW, outerZ };
}

export function resolveSlidingDoorOpenPosition(
  door: ReturnType<typeof getDoorsArray>[number],
  totalW: number,
  doorW: number,
  outerZ: number
): { finalX: number; finalZ: number } {
  const doorsCount = (typeof door.total === 'number' && Number.isFinite(door.total) ? door.total : 2) || 2;
  const idx = typeof door.index === 'number' && Number.isFinite(door.index) ? door.index : 0;
  const leftCount = Math.floor(doorsCount / 2);
  const epsX = 0.002;
  const sideX = totalW / 2 + doorW / 2 + epsX;
  const onLeft = idx < leftCount;
  const stackPos = Number(onLeft ? idx : doorsCount - 1 - idx);
  const zStep =
    typeof door.stackZStep === 'number' && Number.isFinite(door.stackZStep) ? door.stackZStep : 0.055;
  return {
    finalX: onLeft ? -sideX : sideX,
    finalZ: outerZ - stackPos * zStep,
  };
}

export function reportSlidingDoorZFailure(err: unknown): void {
  reportDoorsRuntimeNonFatal('syncVisualsNow.sliding.z', err);
}
