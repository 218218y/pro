// Canvas picking handle-assign click handling.
//
// Extracted from canvas_picking_click_flow.ts to keep the click owner focused on
// routing while preserving the canonical handle-assignment behavior.

import type { AppContainer, ModeStateLike, UnknownRecord } from '../../../types';

import { asRecord } from '../runtime/record.js';
import {
  DEFAULT_HANDLE_FINISH_COLOR,
  handleColorPartKey,
  normalizeHandleFinishColor,
} from '../features/handle_finish_shared.js';
import {
  createManualHandlePositionFromLocalPoint,
  isManualHandlePositionMode,
  manualHandlePositionKey,
  serializeManualHandlePosition,
} from '../features/manual_handle_position.js';

import type { HitObjectLike } from './canvas_picking_engine.js';
import { getTools } from '../runtime/service_access.js';
import { getMode } from '../kernel/api.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { readMapOrEmpty, writeHandle, writeMapKey } from '../runtime/maps_access.js';
import { readDoorLeafRectFromUserData, resolveDoorHitOwnerByPartId } from './canvas_picking_door_shared.js';
import {
  __edgeHandleVariantPartKey,
  __normEdgeHandleVariant,
  __wp_str,
} from './canvas_picking_core_helpers.js';

export interface CanvasHandleAssignClickArgs {
  App: AppContainer;
  primaryHitObject: HitObjectLike | null;
  doorHitObject?: HitObjectLike | null;
  primaryHitPoint?: { x?: number; y?: number; z?: number } | null;
  doorHitPoint?: { x?: number; y?: number; z?: number } | null;
  foundDrawerId: string | null;
  effectiveDoorId: string | null;
  foundPartId: string | null;
  isHandleEditMode: boolean;
}

type PointLike = { x?: number; y?: number; z?: number } | null | undefined;

type DoorOwnerLike = UnknownRecord & {
  userData?: UnknownRecord | null;
  worldToLocal?: (target: { x: number; y: number; z: number }) => unknown;
};

function readParentHitObject(value: unknown): HitObjectLike | null {
  return asRecord<HitObjectLike>(value);
}

function readModeOpts(App: AppContainer): UnknownRecord | null {
  const mode: ModeStateLike | null = getMode(App) || null;
  return asRecord(mode?.opts);
}

function __readHitPartId(App: AppContainer, primaryHitObject: HitObjectLike | null): string | null {
  let cur = primaryHitObject;
  while (cur) {
    if (cur.userData && cur.userData.partId) return __wp_str(App, cur.userData.partId);
    cur = readParentHitObject(cur.parent);
  }
  return null;
}

function isDoorPartId(partId: string): boolean {
  return (
    partId.startsWith('d') ||
    partId.startsWith('sliding') ||
    partId.startsWith('corner_door') ||
    partId.startsWith('corner_pent_door') ||
    partId.startsWith('lower_d') ||
    partId.startsWith('lower_sliding') ||
    partId.startsWith('sketch_box_') ||
    partId.startsWith('sketch_box_free_')
  );
}

function isDrawerPartId(partId: string): boolean {
  return partId.includes('drawer') || partId.includes('draw') || partId.includes('chest');
}

function readClickPoint(args: CanvasHandleAssignClickArgs): PointLike {
  return args.doorHitPoint || args.primaryHitPoint || null;
}

function readManualHandleType(App: AppContainer): string {
  const tools = getTools(App);
  const raw = typeof tools.getHandlesType === 'function' ? String(tools.getHandlesType() || '') : '';
  return raw === 'edge' ? 'edge' : 'standard';
}

function clearManualHandlePositionIfPresent(App: AppContainer, partId: string): void {
  const key = manualHandlePositionKey(partId);
  const handlesMap = asRecord<UnknownRecord>(readMapOrEmpty(App, 'handlesMap'));
  if (!handlesMap || !Object.prototype.hasOwnProperty.call(handlesMap, key)) return;
  writeMapKey(App, 'handlesMap', key, null, {
    source: 'handles:clearManualPosition',
    immediate: true,
  });
}

function writeSelectedHandleConfig(args: {
  App: AppContainer;
  partId: string;
  handleType: string;
  modeOpts: UnknownRecord | null;
}): void {
  const { App, partId, handleType, modeOpts } = args;
  writeHandle(App, partId, handleType, {
    source: 'handles:assign',
    immediate: true,
  });

  if (handleType === 'edge') {
    const edgeVariant = __normEdgeHandleVariant(modeOpts ? modeOpts.edgeHandleVariant : undefined);
    writeMapKey(App, 'handlesMap', __edgeHandleVariantPartKey(partId), edgeVariant, {
      source: 'handles:assignEdgeVariant',
      immediate: true,
    });
  }

  writeMapKey(
    App,
    'handlesMap',
    handleColorPartKey(partId),
    normalizeHandleFinishColor(modeOpts ? modeOpts.handleColor : DEFAULT_HANDLE_FINISH_COLOR),
    {
      source: 'handles:assignColor',
      immediate: true,
    }
  );
}

function tryHandleManualHandlePositionClick(
  args: CanvasHandleAssignClickArgs,
  modeOpts: UnknownRecord | null
): boolean {
  if (!isManualHandlePositionMode(modeOpts?.handlePlacement)) return false;

  const { App, primaryHitObject, doorHitObject, effectiveDoorId, foundPartId } = args;
  const __hitPartId = __readHitPartId(App, primaryHitObject);
  const pickedId = __hitPartId || effectiveDoorId || foundPartId;
  if (!pickedId) return true;

  const partId = __wp_str(App, pickedId);
  if (!partId || !isDoorPartId(partId)) return true;

  const owner = asRecord<DoorOwnerLike>(
    resolveDoorHitOwnerByPartId(
      asRecord<UnknownRecord>(doorHitObject) || asRecord<UnknownRecord>(primaryHitObject),
      partId
    )
  );
  const ownerUserData = asRecord<UnknownRecord>(owner?.userData);
  const rect = readDoorLeafRectFromUserData(ownerUserData);
  const point = readClickPoint(args);
  const px = typeof point?.x === 'number' ? Number(point.x) : NaN;
  const py = typeof point?.y === 'number' ? Number(point.y) : NaN;
  const pz = typeof point?.z === 'number' ? Number(point.z) : NaN;
  if (!owner || !rect || !Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) return true;

  const THREE = getThreeMaybe(App) as {
    Vector3?: new (x?: number, y?: number, z?: number) => { x: number; y: number; z: number };
  } | null;
  if (!THREE || typeof THREE.Vector3 !== 'function') return true;

  const localPoint = new THREE.Vector3(px, py, pz);
  try {
    owner.worldToLocal?.(localPoint);
  } catch {
    return true;
  }

  const position = createManualHandlePositionFromLocalPoint({
    rect,
    localX: localPoint.x,
    localY: localPoint.y,
  });
  if (!position) return true;

  const handleType = readManualHandleType(App);
  writeSelectedHandleConfig({ App, partId, handleType, modeOpts });
  writeMapKey(App, 'handlesMap', manualHandlePositionKey(partId), serializeManualHandlePosition(position), {
    source: 'handles:assignManualPosition',
    immediate: true,
  });
  return true;
}

export function tryHandleCanvasHandleAssignClick(args: CanvasHandleAssignClickArgs): boolean {
  const {
    App,
    primaryHitObject,
    foundDrawerId,
    effectiveDoorId,
    foundPartId,
    isHandleEditMode: __isHandleEditMode,
  } = args;

  if (!__isHandleEditMode) return false;

  const __modeOpts = readModeOpts(App);
  if (tryHandleManualHandlePositionClick(args, __modeOpts)) return true;

  const __hitPartId = __readHitPartId(App, primaryHitObject);
  const pickedId = foundDrawerId || __hitPartId || effectiveDoorId || foundPartId;
  if (pickedId) {
    const partId = __wp_str(App, pickedId);
    const isDoor = isDoorPartId(partId);
    const isDrawer = isDrawerPartId(partId);
    if (isDoor || isDrawer) {
      if (isDoor) clearManualHandlePositionIfPresent(App, partId);

      const __tools_h = getTools(App);
      const __ht = typeof __tools_h.getHandlesType === 'function' ? __tools_h.getHandlesType() : 'standard';

      writeHandle(App, partId, __ht, {
        source: 'handles:assign',
        immediate: true,
      });

      if (__ht === 'edge') {
        const __edgeVariant = __normEdgeHandleVariant(__modeOpts ? __modeOpts.edgeHandleVariant : undefined);

        writeMapKey(App, 'handlesMap', __edgeHandleVariantPartKey(partId), __edgeVariant, {
          source: 'handles:assignEdgeVariant',
          immediate: true,
        });
      }

      if (__ht !== 'none') {
        writeMapKey(
          App,
          'handlesMap',
          handleColorPartKey(partId),
          normalizeHandleFinishColor(__modeOpts ? __modeOpts.handleColor : undefined),
          {
            source: 'handles:assignColor',
            immediate: true,
          }
        );
      }
    }
  }

  return true;
}
