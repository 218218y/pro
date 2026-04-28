import type { UnknownRecord } from '../../../types';

import { asRecord } from '../runtime/record.js';
import type { HitObjectLike } from './canvas_picking_engine.js';
import type { CanvasPickingClickHitState, ModuleKey } from './canvas_picking_click_contracts.js';
import { createCanvasPickingClickHitIdentity } from './canvas_picking_hit_identity.js';

export type CanvasPickingHitCandidate = { mi: ModuleKey; hitY: number | null };

export type HitObjectNode = UnknownRecord & { parent?: unknown; children?: unknown[]; userData?: unknown };

export type StackHintSource = 'none' | 'moduleSelector' | 'objectTag' | 'id' | 'y';

export type MutableCanvasPickingClickHitState = CanvasPickingClickHitState & {
  stackHintSource: StackHintSource;
  selectorHitTop: CanvasPickingHitCandidate | null;
  selectorHitBottom: CanvasPickingHitCandidate | null;
  foundPartUserData: UnknownRecord | null;
  doorHitUserData: UnknownRecord | null;
};

export function asHitObject(value: unknown): HitObjectNode | null {
  return asRecord(value);
}

export function readObjectChildren(value: unknown): unknown[] | null {
  const obj = asHitObject(value);
  return obj && Array.isArray(obj.children) ? obj.children : null;
}

export function readUiStackSplitEnabled(ui: unknown): boolean {
  const rec = asRecord(ui);
  return !!(rec && rec.stackSplitEnabled);
}

export function readFallbackPrimaryHitY(
  state: MutableCanvasPickingClickHitState,
  intersects: Array<{ point?: { y?: number } | null }>
): number | null {
  if (typeof state.primaryHitY === 'number') return state.primaryHitY;
  if (typeof state.moduleHitY === 'number') return state.moduleHitY;
  const y = intersects[0]?.point?.y;
  return typeof y === 'number' ? y : null;
}

export function createMutableCanvasPickingClickHitState(): MutableCanvasPickingClickHitState {
  return {
    intersects: [],
    foundPartId: null,
    foundModuleIndex: null,
    foundModuleStack: 'top',
    effectiveDoorId: null,
    foundDrawerId: null,
    primaryHitObject: null,
    doorHitObject: null,
    primaryHitPoint: null,
    doorHitPoint: null,
    moduleHitY: null,
    doorHitY: null,
    primaryHitY: null,
    stackHintSource: 'none',
    selectorHitTop: null,
    selectorHitBottom: null,
    foundPartUserData: null,
    doorHitUserData: null,
  };
}

export function finalizeCanvasPickingClickHitState(
  state: MutableCanvasPickingClickHitState,
  intersects: Array<{ object: HitObjectLike; point?: { x?: number; y?: number; z?: number } | null }>
): CanvasPickingClickHitState {
  return {
    intersects,
    foundPartId: state.foundPartId,
    foundModuleIndex: state.foundModuleIndex,
    foundModuleStack: state.foundModuleStack,
    effectiveDoorId: state.effectiveDoorId,
    foundDrawerId: state.foundDrawerId,
    primaryHitObject: state.primaryHitObject,
    doorHitObject: state.doorHitObject,
    primaryHitPoint: state.primaryHitPoint,
    doorHitPoint: state.doorHitPoint,
    moduleHitY: state.moduleHitY,
    doorHitY: state.doorHitY,
    primaryHitY: state.primaryHitY,
    hitIdentity: createCanvasPickingClickHitIdentity({
      partId: state.foundPartId,
      doorId: state.effectiveDoorId,
      drawerId: state.foundDrawerId,
      moduleIndex: state.foundModuleIndex,
      moduleStack: state.stackHintSource === 'none' ? null : state.foundModuleStack,
      hitObjectUserData:
        state.doorHitUserData || state.foundPartUserData || state.primaryHitObject?.userData || null,
    }),
  };
}
