import type { ManualLayoutSketchHoverModuleContext } from './canvas_picking_manual_layout_sketch_hover_module_contracts.js';
import { resolveSketchBoxVerticalContentPreview } from './canvas_picking_sketch_box_vertical_content_preview.js';
import { resolveSketchBoxDoorPreview } from './canvas_picking_sketch_box_door_preview.js';
import {
  createManualLayoutSketchHoverHost,
  hideManualLayoutSketchHoverPreview,
  REMOVE_EPS_BOX,
  REMOVE_EPS_SHELF,
  resolveManualLayoutSketchHoverPointerX,
  writeManualLayoutSketchHoverPreview,
} from './canvas_picking_manual_layout_sketch_hover_module_preview_shared.js';

export function tryHandleManualLayoutSketchHoverModuleBoxPreview(
  ctx: ManualLayoutSketchHoverModuleContext
): boolean {
  const {
    tool,
    activeModuleBox,
    setPreview,
    yClamped,
    woodThick,
    variant,
    shelfDepthOverrideM,
    storageH,
    __wp_readSketchBoxDividers,
    __wp_resolveSketchBoxSegments,
    __wp_pickSketchBoxSegment,
    isShelf,
    isRod,
    isStorage,
  } = ctx;

  if ((isShelf || isRod || isStorage) && activeModuleBox && setPreview) {
    const hoverPreview = resolveSketchBoxVerticalContentPreview({
      host: createManualLayoutSketchHoverHost(ctx),
      contentKind: isShelf ? 'shelf' : isRod ? 'rod' : 'storage',
      boxId: activeModuleBox.boxId,
      freePlacement: false,
      targetBox: activeModuleBox.box,
      targetGeo: activeModuleBox.geo,
      targetCenterY: activeModuleBox.centerY,
      targetHeight: activeModuleBox.height,
      pointerX: resolveManualLayoutSketchHoverPointerX(ctx.hitLocalX, activeModuleBox.geo.centerX),
      pointerY: yClamped,
      woodThick,
      shelfVariant: isShelf ? variant || 'regular' : null,
      shelfDepthOverrideM: isShelf ? shelfDepthOverrideM : null,
      storageHeight: isStorage ? storageH : null,
      removeEpsShelf: REMOVE_EPS_SHELF,
      removeEpsBox: REMOVE_EPS_BOX,
      readSketchBoxDividers: __wp_readSketchBoxDividers,
      resolveSketchBoxSegments: __wp_resolveSketchBoxSegments,
      pickSketchBoxSegment: __wp_pickSketchBoxSegment,
    });
    return hoverPreview
      ? writeManualLayoutSketchHoverPreview(ctx, hoverPreview)
      : hideManualLayoutSketchHoverPreview(ctx);
  }

  const isBoxDoor = tool === 'sketch_box_door';
  const isBoxDoubleDoor = tool === 'sketch_box_double_door';
  const isBoxDoorHinge = tool === 'sketch_box_door_hinge';
  if ((isBoxDoor || isBoxDoubleDoor || isBoxDoorHinge) && activeModuleBox && setPreview) {
    const doorPreview = resolveSketchBoxDoorPreview({
      host: createManualLayoutSketchHoverHost(ctx),
      contentKind: isBoxDoubleDoor ? 'double_door' : isBoxDoor ? 'door' : 'door_hinge',
      boxId: activeModuleBox.boxId,
      freePlacement: false,
      targetBox: activeModuleBox.box,
      targetGeo: activeModuleBox.geo,
      targetCenterY: activeModuleBox.centerY,
      targetHeight: activeModuleBox.height,
      pointerX: resolveManualLayoutSketchHoverPointerX(ctx.hitLocalX, activeModuleBox.geo.centerX),
      woodThick,
      readSketchBoxDividers: __wp_readSketchBoxDividers,
      resolveSketchBoxSegments: __wp_resolveSketchBoxSegments,
      pickSketchBoxSegment: __wp_pickSketchBoxSegment,
    });
    return doorPreview
      ? writeManualLayoutSketchHoverPreview(ctx, doorPreview)
      : hideManualLayoutSketchHoverPreview(ctx);
  }

  return false;
}
