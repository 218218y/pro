import {
  __wp_readInteriorModuleConfigRef,
  __wp_resolveInteriorHoverTarget,
} from './canvas_picking_local_helpers.js';
import type { CanvasInteriorHoverFlowArgs } from './canvas_picking_interior_hover_shared.js';
import {
  hideLayoutPreview,
  hideSketchPreview,
  readLayoutType,
} from './canvas_picking_interior_hover_shared.js';
import {
  buildLayoutPreviewPayload,
  buildPresetLayoutPreviewPayload,
} from './canvas_picking_interior_hover_layout_family_shared.js';
import { tryHandlePresetLayoutFreeBoxHover } from './canvas_picking_manual_layout_free_box_content.js';
import { previewFullBoringSketchBox } from './canvas_picking_full_boring_box.js';
import { __wp_getViewportRoots } from './canvas_picking_local_helpers_runtime.js';
import { __wp_raycastReuse } from './canvas_picking_core_helpers.js';

export function tryHandleCanvasPresetLayoutHover(args: CanvasInteriorHoverFlowArgs): boolean {
  const {
    App,
    ndcX,
    ndcY,
    raycaster,
    mouse,
    hideLayoutPreview: hideLayoutPreviewFn,
    hideSketchPreview: hideSketchPreviewFn,
    setLayoutPreview,
  } = args;
  try {
    hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
    const layoutType = readLayoutType(App);
    if (
      layoutType !== 'full_boring' &&
      tryHandlePresetLayoutFreeBoxHover({
        App,
        layoutType,
        ndcX,
        ndcY,
        raycaster,
        mouse,
        setLayoutPreview,
        hideLayoutPreview: () => hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn }),
        hideSketchPreview: () => hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn }),
      })
    ) {
      return true;
    }
    if (layoutType === 'full_boring') {
      const { camera, wardrobeGroup } = __wp_getViewportRoots(App);
      if (camera && wardrobeGroup) {
        const intersects = __wp_raycastReuse({
          App,
          raycaster,
          mouse,
          camera,
          ndcX,
          ndcY,
          objects: [wardrobeGroup],
          recursive: true,
        });
        if (
          previewFullBoringSketchBox({
            App,
            intersects,
            wardrobeGroup,
            setLayoutPreview,
            hideLayoutPreview: () => hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn }),
          })
        )
          return true;
      }
    }
    const target = __wp_resolveInteriorHoverTarget(App, raycaster, mouse, ndcX, ndcY);
    if (!target || !setLayoutPreview) {
      hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });
      return false;
    }

    if (layoutType === 'full_boring') {
      const isRemoving =
        __wp_readInteriorModuleConfigRef(App, target.hitModuleKey, target.isBottom)?.fullShelfPinBoring ===
        true;
      setLayoutPreview({
        ...buildLayoutPreviewPayload({ App, target, shelfYs: [], rodYs: [], storageBarrier: null }),
        boringBounds: { bottomY: target.bottomY, topY: target.topY },
        op: isRemoving ? 'remove' : 'add',
      });
      return true;
    }

    setLayoutPreview(buildPresetLayoutPreviewPayload({ App, target, layoutType }));
    return true;
  } catch {
    return false;
  }
}
