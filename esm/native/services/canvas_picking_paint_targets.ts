import {
  __wp_canonDoorPartKeyForMaps,
  __wp_scopeCornerPartKeyForStack,
  __wp_scopeCornerPartKeysForStack,
} from './canvas_picking_core_helpers.js';
import { resolveSketchInternalDrawerCassettePanelPaintTargetKeys } from '../features/sketch_internal_drawer_cassette.js';
import type { CanvasPaintTargetScope } from './canvas_picking_paint_target_scope.js';

export const MAIN_BODY_PARTS = ['body_left', 'body_right', 'body_ceil', 'body_floor'];
export const LOWER_MAIN_BODY_PARTS = [
  'lower_body_left',
  'lower_body_right',
  'lower_body_ceil',
  'lower_body_floor',
];
export const CHEST_BODY_PARTS = ['chest_left', 'chest_right', 'chest_ceil', 'chest_floor', 'chest_back'];
export const CORNER_BODY_PARTS = ['corner_body', 'corner_floor', 'corner_ceil', 'corner_side_far'];
export const CORNER_WING_FRAME_PARTS = [
  'corner_ceil',
  'corner_wing_side_left',
  'corner_wing_side_right',
  'corner_floor',
];
export const CORNER_STACK_UNIFIED_WING_FRAME_PARTS = [
  'corner_ceil',
  'corner_wing_side_left',
  'corner_wing_side_right',
  'corner_floor',
];
export const CORNER_STACK_UNIFIED_WING_FRAME_PREVIEW_PARTS = [
  'corner_ceil',
  'corner_wing_side_left',
  'corner_wing_side_right',
  'lower_corner_wing_side_left',
  'lower_corner_wing_side_right',
  'lower_corner_floor',
];
export const CORNER_PENTAGON_FRAME_PARTS = [
  'corner_pent_ceil',
  'corner_pent_floor',
  'corner_pent_attach_main',
  'corner_pent_attach_wing',
];
export const CORNER_STACK_UNIFIED_PENTAGON_FRAME_PARTS = [
  'corner_pent_ceil',
  'corner_pent_attach_main',
  'corner_pent_attach_wing',
  'corner_pent_floor',
];
export const CORNER_STACK_UNIFIED_PENTAGON_FRAME_PREVIEW_PARTS = [
  'corner_pent_ceil',
  'corner_pent_attach_main',
  'corner_pent_attach_wing',
  'lower_corner_pent_attach_main',
  'lower_corner_pent_attach_wing',
  'lower_corner_pent_floor',
];
export const CORNICE_PARTS = [
  'cornice_color',
  'cornice_wave_front',
  'cornice_wave_side_left',
  'cornice_wave_side_right',
];
export const CORNICE_WAVE_PARTS = ['cornice_wave_front', 'cornice_wave_side_left', 'cornice_wave_side_right'];
export const CORNER_CORNICE_PARTS = [
  'corner_cornice',
  'corner_cornice_front',
  'corner_cornice_side_left',
  'corner_cornice_side_right',
];

export function __isCornicePart(partId: string): boolean {
  return CORNICE_PARTS.includes(partId);
}

export function __isCorniceWavePart(partId: string): boolean {
  return CORNICE_WAVE_PARTS.includes(partId);
}

export function __isCornerCornicePart(partId: string): boolean {
  return CORNER_CORNICE_PARTS.includes(partId);
}

export function __isAnyCornicePart(partId: string): boolean {
  return __isCornicePart(partId) || __isCornerCornicePart(partId);
}

function unscopedLowerPartId(partId: string): { partId: string; stack: 'top' | 'bottom' | null } {
  if (partId.startsWith('lower_')) return { partId: partId.slice('lower_'.length), stack: 'bottom' };
  return { partId, stack: null };
}

function resolveHitStack(partId: string, activeStack: 'top' | 'bottom'): 'top' | 'bottom' {
  const normalized = unscopedLowerPartId(partId);
  return normalized.stack || activeStack;
}

function isCornerWingFrameHitPart(partId: string): boolean {
  return (
    CORNER_WING_FRAME_PARTS.includes(partId) ||
    partId === 'corner_wing_ceil' ||
    partId.startsWith('corner_cell_top_') ||
    partId === 'corner_floor_blind' ||
    partId.startsWith('corner_floor_c')
  );
}

function isCornerWingCeilingHitPart(partId: string): boolean {
  return partId === 'corner_ceil' || partId === 'corner_wing_ceil' || partId.startsWith('corner_cell_top_');
}

function isCornerWingFloorHitPart(partId: string): boolean {
  return partId === 'corner_floor' || partId === 'corner_floor_blind' || partId.startsWith('corner_floor_c');
}

function isCornerWingSideHitPart(partId: string): boolean {
  return partId === 'corner_wing_side_left' || partId === 'corner_wing_side_right';
}

function resolveUnifiedCornerWingMiddleFloorKey(
  partIdRaw: string,
  activeStack: 'top' | 'bottom',
  targetScope?: CanvasPaintTargetScope | null
): string[] | null {
  if (!targetScope?.stackSplitUnifiedFrame || activeStack !== 'top') return null;
  const normalized = unscopedLowerPartId(partIdRaw);
  const partId = normalized.partId;
  if (partId === 'corner_stack_mid_floor') return [partIdRaw];
  if (partId === 'corner_stack_mid_floor_blind') return [partIdRaw];
  if (/^corner_stack_mid_floor_c\d+$/.test(partId)) return [partIdRaw];
  if (partId === 'corner_floor') return ['corner_stack_mid_floor'];
  if (partId === 'corner_floor_blind') return ['corner_stack_mid_floor_blind'];
  const cellMatch = /^corner_floor_c(\d+)$/.exec(partId);
  return cellMatch?.[1] ? [`corner_stack_mid_floor_c${cellMatch[1]}`] : null;
}

function resolveUnifiedCornerWingFrameKeys(
  partIdRaw: string,
  activeStack: 'top' | 'bottom',
  targetScope?: CanvasPaintTargetScope | null,
  preview = false
): string[] | null {
  if (!targetScope?.stackSplitUnifiedFrame) return null;
  const normalized = unscopedLowerPartId(partIdRaw);
  const partId = normalized.partId;
  if (!isCornerWingFrameHitPart(partId)) return null;

  const hitStack = resolveHitStack(partIdRaw, activeStack);
  const isOuterFrameBoard =
    isCornerWingSideHitPart(partId) ||
    (hitStack === 'top' && isCornerWingCeilingHitPart(partId)) ||
    (hitStack === 'bottom' && isCornerWingFloorHitPart(partId));

  if (!isOuterFrameBoard) return [];
  return preview
    ? [...CORNER_STACK_UNIFIED_WING_FRAME_PREVIEW_PARTS]
    : [...CORNER_STACK_UNIFIED_WING_FRAME_PARTS];
}

function isCornerPentagonAttachHitPart(partId: string): boolean {
  return partId === 'corner_pent_attach_main' || partId === 'corner_pent_attach_wing';
}

function resolveUnifiedCornerPentagonFrameKeys(
  partIdRaw: string,
  activeStack: 'top' | 'bottom',
  targetScope?: CanvasPaintTargetScope | null,
  preview = false
): string[] | null {
  if (!targetScope?.stackSplitUnifiedFrame) return null;
  const normalized = unscopedLowerPartId(partIdRaw);
  const partId = normalized.partId;
  if (!CORNER_PENTAGON_FRAME_PARTS.includes(partId)) return null;

  const hitStack = resolveHitStack(partIdRaw, activeStack);
  const isOuterFrameBoard =
    isCornerPentagonAttachHitPart(partId) ||
    (hitStack === 'top' && partId === 'corner_pent_ceil') ||
    (hitStack === 'bottom' && partId === 'corner_pent_floor');

  if (!isOuterFrameBoard) return [];
  return preview
    ? [...CORNER_STACK_UNIFIED_PENTAGON_FRAME_PREVIEW_PARTS]
    : [...CORNER_STACK_UNIFIED_PENTAGON_FRAME_PARTS];
}

export function resolveUnifiedCornerFramePaintTargetKeys(
  foundPartId: string | null | undefined,
  activeStack: 'top' | 'bottom',
  targetScope?: CanvasPaintTargetScope | null
): string[] | null {
  const partId = typeof foundPartId === 'string' ? String(foundPartId) : '';
  if (!partId) return null;
  const cassetteKeys = resolveSketchInternalDrawerCassettePanelPaintTargetKeys(partId);
  if (cassetteKeys !== null) return cassetteKeys;
  const middleFloorKeys = resolveUnifiedCornerWingMiddleFloorKey(partId, activeStack, targetScope);
  if (middleFloorKeys !== null) return middleFloorKeys;
  const wingKeys = resolveUnifiedCornerWingFrameKeys(partId, activeStack, targetScope, false);
  if (wingKeys !== null) return wingKeys;
  const pentagonKeys = resolveUnifiedCornerPentagonFrameKeys(partId, activeStack, targetScope, false);
  if (pentagonKeys !== null) return pentagonKeys;
  return null;
}

export function resolveUnifiedCornerFramePaintPreviewKeys(
  foundPartId: string | null | undefined,
  activeStack: 'top' | 'bottom',
  targetScope?: CanvasPaintTargetScope | null
): string[] | null {
  const partId = typeof foundPartId === 'string' ? String(foundPartId) : '';
  if (!partId) return null;
  const middleFloorKeys = resolveUnifiedCornerWingMiddleFloorKey(partId, activeStack, targetScope);
  if (middleFloorKeys !== null) return middleFloorKeys;
  const wingKeys = resolveUnifiedCornerWingFrameKeys(partId, activeStack, targetScope, true);
  if (wingKeys !== null) return wingKeys;
  const pentagonKeys = resolveUnifiedCornerPentagonFrameKeys(partId, activeStack, targetScope, true);
  if (pentagonKeys !== null) return pentagonKeys;
  return null;
}

export function resolvePaintPreviewKeysForTarget(
  foundPartId: string | null | undefined,
  activeStack: 'top' | 'bottom',
  targetKeys: string[],
  targetScope?: CanvasPaintTargetScope | null
): string[] {
  const unifiedCornerFramePreviewKeys = resolveUnifiedCornerFramePaintPreviewKeys(
    foundPartId,
    activeStack,
    targetScope
  );
  return unifiedCornerFramePreviewKeys !== null ? unifiedCornerFramePreviewKeys : targetKeys;
}

export function resolvePaintTargetKeys(
  foundPartId: string | null | undefined,
  activeStack: 'top' | 'bottom',
  targetScope?: CanvasPaintTargetScope | null
): string[] {
  const partId = typeof foundPartId === 'string' ? String(foundPartId) : '';
  if (!partId) return [];
  const cassetteKeys = resolveSketchInternalDrawerCassettePanelPaintTargetKeys(partId);
  if (cassetteKeys !== null) return cassetteKeys;
  const unifiedCornerFrameKeys = resolveUnifiedCornerFramePaintTargetKeys(partId, activeStack, targetScope);
  if (unifiedCornerFrameKeys !== null) return unifiedCornerFrameKeys;
  if (MAIN_BODY_PARTS.includes(partId)) return [...MAIN_BODY_PARTS];
  if (LOWER_MAIN_BODY_PARTS.includes(partId)) return [...LOWER_MAIN_BODY_PARTS];
  if (CHEST_BODY_PARTS.includes(partId)) return [...CHEST_BODY_PARTS];
  if (__isCorniceWavePart(partId)) return [partId];
  if (__isCornicePart(partId)) return ['cornice_color'];
  if (__isCornerCornicePart(partId))
    return __wp_scopeCornerPartKeysForStack(CORNER_CORNICE_PARTS, activeStack);
  if (isCornerWingFrameHitPart(partId)) {
    return __wp_scopeCornerPartKeysForStack(CORNER_WING_FRAME_PARTS, activeStack);
  }
  if (CORNER_BODY_PARTS.includes(partId))
    return __wp_scopeCornerPartKeysForStack(CORNER_BODY_PARTS, activeStack);
  if (CORNER_PENTAGON_FRAME_PARTS.includes(partId))
    return __wp_scopeCornerPartKeysForStack(CORNER_PENTAGON_FRAME_PARTS, activeStack);
  if (partId.startsWith('corner_floor_'))
    return [__wp_scopeCornerPartKeyForStack('corner_floor', activeStack)];
  if (partId.startsWith('corner_plinth_'))
    return [__wp_scopeCornerPartKeyForStack('corner_plinth', activeStack)];
  if (partId === 'corner_pent_plinth')
    return [__wp_scopeCornerPartKeyForStack('corner_pent_plinth', activeStack)];
  return [__wp_canonDoorPartKeyForMaps(__wp_scopeCornerPartKeyForStack(partId, activeStack))];
}
