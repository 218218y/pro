import {
  __wp_canonDoorPartKeyForMaps,
  __wp_scopeCornerPartKeyForStack,
  __wp_scopeCornerPartKeysForStack,
} from './canvas_picking_core_helpers.js';

export const MAIN_BODY_PARTS = ['body_left', 'body_right', 'body_ceil', 'body_floor'];
export const CHEST_BODY_PARTS = ['chest_left', 'chest_right', 'chest_ceil', 'chest_floor'];
export const CORNER_BODY_PARTS = ['corner_body', 'corner_floor', 'corner_ceil', 'corner_side_far'];
export const CORNICE_PARTS = [
  'cornice_color',
  'cornice_wave_front',
  'cornice_wave_side_left',
  'cornice_wave_side_right',
];
export const CORNER_CORNICE_PARTS = [
  'corner_cornice',
  'corner_cornice_front',
  'corner_cornice_side_left',
  'corner_cornice_side_right',
];

export function __isCornicePart(partId: string): boolean {
  return CORNICE_PARTS.includes(partId);
}

export function __isCornerCornicePart(partId: string): boolean {
  return CORNER_CORNICE_PARTS.includes(partId);
}

export function __isAnyCornicePart(partId: string): boolean {
  return __isCornicePart(partId) || __isCornerCornicePart(partId);
}

export function resolvePaintTargetKeys(
  foundPartId: string | null | undefined,
  activeStack: 'top' | 'bottom'
): string[] {
  const partId = typeof foundPartId === 'string' ? String(foundPartId) : '';
  if (!partId) return [];
  if (MAIN_BODY_PARTS.includes(partId)) return [...MAIN_BODY_PARTS];
  if (CHEST_BODY_PARTS.includes(partId)) return [...CHEST_BODY_PARTS];
  if (__isCornicePart(partId)) return [...CORNICE_PARTS];
  if (__isCornerCornicePart(partId))
    return __wp_scopeCornerPartKeysForStack(CORNER_CORNICE_PARTS, activeStack);
  if (CORNER_BODY_PARTS.includes(partId))
    return __wp_scopeCornerPartKeysForStack(CORNER_BODY_PARTS, activeStack);
  if (partId === 'corner_wing_ceil' || partId.startsWith('corner_cell_top_')) {
    return __wp_scopeCornerPartKeysForStack(
      ['corner_ceil', 'corner_wing_side_left', 'corner_wing_side_right', 'corner_floor'],
      activeStack
    );
  }
  if (partId === 'corner_pent_ceil')
    return [__wp_scopeCornerPartKeyForStack('corner_pent_ceil', activeStack)];
  if (partId.startsWith('corner_floor_'))
    return [__wp_scopeCornerPartKeyForStack('corner_floor', activeStack)];
  if (partId.startsWith('corner_plinth_'))
    return [__wp_scopeCornerPartKeyForStack('corner_plinth', activeStack)];
  if (partId === 'corner_pent_plinth')
    return [__wp_scopeCornerPartKeyForStack('corner_pent_plinth', activeStack)];
  return [__wp_canonDoorPartKeyForMaps(__wp_scopeCornerPartKeyForStack(partId, activeStack))];
}
