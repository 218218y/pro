import { isHexCellDiagonalPanelPartId } from '../features/hex_cell/index.js';

/**
 * Paint selections such as mirror/glass are structural door-front visuals, not
 * plain color swatches. Keep this predicate shared by click + hover so every
 * drawer/door family that can render those visuals gets the same behavior.
 */
export function isCanvasPickingSpecialPaintTargetPartId(partId: string): boolean {
  if (!partId) return false;
  if (isHexCellDiagonalPanelPartId(partId)) return true;
  if (/^d\d+_/.test(partId)) return true;
  if (partId.startsWith('lower_d') && partId.indexOf('_') !== -1) return true;
  if (partId.startsWith('sliding') || partId.startsWith('slide')) return true;
  if (partId.startsWith('lower_sliding') || partId.startsWith('lower_slide')) return true;
  if (partId.startsWith('corner_door') || partId.startsWith('corner_pent_door')) return true;
  if (partId.startsWith('lower_corner_door') || partId.startsWith('lower_corner_pent_door')) {
    return true;
  }
  if (/^(?:lower_)?corner_c\d+_draw_(?:shoe|\d+)$/.test(partId)) return true;
  if (/^chest_drawer_\d+$/.test(partId)) return true;
  if (/^sketch_box(?:_free)?_.+_door(?:_|$)/.test(partId)) return true;
  if (partId.startsWith('sketch_ext_drawers_')) return true;
  if (/^sketch_box(?:_free)?_.+_ext_drawers_/.test(partId)) return true;
  return false;
}
