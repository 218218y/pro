import type { AppContainer, UnknownRecord } from '../../../types';

import { isDrawerBoxPartId, isShelfBoardPartId } from '../features/part_identity/api.js';
import { isSketchInternalDrawerCassettePartId } from '../features/sketch_internal_drawer_cassette.js';
import type { PaintPreviewGroupBox } from './canvas_picking_generic_paint_hover_shared.js';
import { collectPaintPreviewPartObjects } from './canvas_picking_generic_paint_hover_preview_objects.js';
import {
  resolveCornerCorniceFrontObjectLocalPreview,
  resolveCornerCorniceGroupObjectPreview,
} from './canvas_picking_generic_paint_hover_preview_corner.js';
import {
  resolvePaintPreviewGroupBoxFromAnchor,
  resolvePaintPreviewGroupBoxFromObjects,
  resolvePaintPreviewObjectBoxesFromAnchor,
} from './canvas_picking_generic_paint_hover_preview_bounds.js';

function unscopedPaintPreviewPartKey(partKey: string): string {
  return partKey.startsWith('lower_') ? partKey.slice('lower_'.length) : partKey;
}

function isCornerPentagonThinBoardPaintKey(partKey: string): boolean {
  const key = unscopedPaintPreviewPartKey(partKey);
  return key === 'corner_pent_floor' || key === 'corner_pent_ceil';
}

function isCornerWingFramePaintKey(partKey: string): boolean {
  const key = unscopedPaintPreviewPartKey(partKey);
  return (
    key === 'corner_ceil' ||
    key === 'corner_floor' ||
    key === 'corner_wing_side_left' ||
    key === 'corner_wing_side_right'
  );
}

function isUnifiedCornerWingMiddleFloorPaintKey(partKey: string): boolean {
  const key = unscopedPaintPreviewPartKey(partKey);
  return (
    key === 'corner_stack_mid_floor' ||
    key === 'corner_stack_mid_floor_blind' ||
    /^corner_stack_mid_floor_c\d+$/.test(key)
  );
}

function isCornerPlinthPaintKey(partKey: string): boolean {
  const key = unscopedPaintPreviewPartKey(partKey);
  return key === 'corner_plinth' || key === 'corner_pent_plinth';
}

function isBaseLegPlatformPaintKey(partKey: string): boolean {
  const key = unscopedPaintPreviewPartKey(partKey);
  return (
    key === 'base_leg_platform' ||
    key === 'base_leg_platform_bottom' ||
    key === 'base_leg_platform_top' ||
    key === 'chest_leg_platform_bottom' ||
    key === 'chest_leg_platform_top' ||
    key === 'corner_leg_platform_bottom' ||
    key === 'corner_leg_platform_top' ||
    key === 'corner_pent_leg_platform_bottom' ||
    key === 'corner_pent_leg_platform_top'
  );
}

function shouldUseObjectBoxesPaintPreview(partKeys: string[]): boolean {
  return partKeys.some(
    key =>
      key === 'stack_split_separator' ||
      key === 'body_stack_split_divider' ||
      key === 'plinth_color' ||
      key === 'lower_plinth_color' ||
      isBaseLegPlatformPaintKey(key) ||
      isDrawerBoxPartId(key) ||
      isSketchInternalDrawerCassettePartId(key) ||
      isShelfBoardPartId(key) ||
      isCornerPentagonThinBoardPaintKey(key) ||
      isCornerWingFramePaintKey(key) ||
      isUnifiedCornerWingMiddleFloorPaintKey(key) ||
      isCornerPlinthPaintKey(key)
  );
}

export function resolvePaintPreviewGroupBox(args: {
  App: AppContainer;
  wardrobeGroup: UnknownRecord;
  partKeys: string[];
  anchorObject: UnknownRecord;
  anchorParent: UnknownRecord | null;
}): PaintPreviewGroupBox | null {
  const { App, wardrobeGroup, partKeys, anchorObject, anchorParent } = args;
  const objects = collectPaintPreviewPartObjects({ App, wardrobeGroup, partKeys });

  const cornerCorniceObjectPreview = resolveCornerCorniceGroupObjectPreview({
    wardrobeGroup,
    partKeys,
    objects,
    anchorObject,
  });
  if (cornerCorniceObjectPreview) return cornerCorniceObjectPreview;

  const cornerCorniceFrontPreview = resolveCornerCorniceFrontObjectLocalPreview({
    App,
    wardrobeGroup,
    partKeys,
    objects,
    anchorObject,
  });
  if (cornerCorniceFrontPreview) return cornerCorniceFrontPreview;

  const useObjectBoxesPreview = shouldUseObjectBoxesPaintPreview(partKeys);

  if (!objects.length) {
    if (useObjectBoxesPreview) {
      const anchorObjectBoxesPreview = resolvePaintPreviewObjectBoxesFromAnchor({
        wardrobeGroup,
        anchorObject: anchorObject,
        anchorParent: anchorParent,
      });
      if (anchorObjectBoxesPreview) return anchorObjectBoxesPreview;
    }
    return resolvePaintPreviewGroupBoxFromAnchor({
      App,
      wardrobeGroup,
      anchorObject,
      anchorParent,
    });
  }

  const objectGroupPreview = resolvePaintPreviewGroupBoxFromObjects({
    App,
    wardrobeGroup,
    objects,
  });

  if (objectGroupPreview && useObjectBoxesPreview) {
    return {
      ...objectGroupPreview,
      kind: 'object_boxes',
      previewObjects: objects,
    };
  }

  return objectGroupPreview;
}
