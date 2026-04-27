// Canvas picking handle-assign click handling.
//
// Extracted from canvas_picking_click_flow.ts to keep the click owner focused on
// routing while preserving the canonical handle-assignment behavior.

import type { AppContainer, ModeStateLike, UnknownRecord } from '../../../types';

import { asRecord } from '../runtime/record.js';
import { handleColorPartKey, normalizeHandleFinishColor } from '../features/handle_finish_shared.js';

import type { HitObjectLike } from './canvas_picking_engine.js';
import { getTools } from '../runtime/service_access.js';
import { getMode } from '../kernel/api.js';
import { writeHandle, writeMapKey } from '../runtime/maps_access.js';
import {
  __edgeHandleVariantPartKey,
  __normEdgeHandleVariant,
  __wp_str,
} from './canvas_picking_core_helpers.js';

export interface CanvasHandleAssignClickArgs {
  App: AppContainer;
  primaryHitObject: HitObjectLike | null;
  foundDrawerId: string | null;
  effectiveDoorId: string | null;
  foundPartId: string | null;
  isHandleEditMode: boolean;
}

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

  const __hitPartId = __readHitPartId(App, primaryHitObject);
  const pickedId = foundDrawerId || __hitPartId || effectiveDoorId || foundPartId;
  if (pickedId) {
    const partId = __wp_str(App, pickedId);
    const isDoor =
      partId.startsWith('d') ||
      partId.startsWith('sliding') ||
      partId.startsWith('corner_door') ||
      partId.startsWith('corner_pent_door') ||
      partId.startsWith('lower_d') ||
      partId.startsWith('lower_sliding') ||
      partId.startsWith('sketch_box_') ||
      partId.startsWith('sketch_box_free_');
    const isDrawer = partId.includes('drawer') || partId.includes('draw') || partId.includes('chest');
    if (isDoor || isDrawer) {
      const __tools_h = getTools(App);
      const __ht = typeof __tools_h.getHandlesType === 'function' ? __tools_h.getHandlesType() : 'standard';

      writeHandle(App, partId, __ht, {
        source: 'handles:assign',
        immediate: true,
      });

      const __modeOpts = readModeOpts(App);

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
