import type { AppContainer, UnknownRecord } from '../../../types';

import type { PaintPreviewGroupBox } from './canvas_picking_generic_paint_hover_shared.js';
import { collectPaintPreviewPartObjects } from './canvas_picking_generic_paint_hover_preview_objects.js';
import {
  resolveCornerCorniceFrontObjectLocalPreview,
  resolveCornerCorniceGroupObjectPreview,
} from './canvas_picking_generic_paint_hover_preview_corner.js';
import {
  resolvePaintPreviewGroupBoxFromFallback,
  resolvePaintPreviewGroupBoxFromObjects,
} from './canvas_picking_generic_paint_hover_preview_bounds.js';

function isStackSplitDecorativeSeparatorPreview(partKeys: string[]): boolean {
  return partKeys.some(key => key === 'stack_split_separator');
}

export function resolvePaintPreviewGroupBox(args: {
  App: AppContainer;
  wardrobeGroup: UnknownRecord;
  partKeys: string[];
  fallbackObject: UnknownRecord;
  fallbackParent: UnknownRecord | null;
}): PaintPreviewGroupBox | null {
  const { App, wardrobeGroup, partKeys, fallbackObject, fallbackParent } = args;
  const objects = collectPaintPreviewPartObjects({ App, wardrobeGroup, partKeys });

  const cornerCorniceObjectPreview = resolveCornerCorniceGroupObjectPreview({
    wardrobeGroup,
    partKeys,
    objects,
    fallbackObject,
  });
  if (cornerCorniceObjectPreview) return cornerCorniceObjectPreview;

  const cornerCorniceFrontPreview = resolveCornerCorniceFrontObjectLocalPreview({
    App,
    wardrobeGroup,
    partKeys,
    objects,
    fallbackObject,
  });
  if (cornerCorniceFrontPreview) return cornerCorniceFrontPreview;

  if (!objects.length) {
    return resolvePaintPreviewGroupBoxFromFallback({
      App,
      wardrobeGroup,
      fallbackObject,
      fallbackParent,
    });
  }

  const objectGroupPreview = resolvePaintPreviewGroupBoxFromObjects({
    App,
    wardrobeGroup,
    objects,
  });

  if (objectGroupPreview && isStackSplitDecorativeSeparatorPreview(partKeys)) {
    return {
      ...objectGroupPreview,
      kind: 'object_boxes',
      previewObjects: objects,
    };
  }

  return objectGroupPreview;
}
