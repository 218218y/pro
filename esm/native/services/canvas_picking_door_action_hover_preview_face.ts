import {
  __positionDoorMarker,
  __readDoorLeafRect,
  type DoorFaceHoverPreviewArgs,
} from './canvas_picking_door_action_hover_preview_shared.js';

export function tryHandleDoorFaceHoverPreview(args: DoorFaceHoverPreviewArgs): boolean {
  const {
    groupRec,
    userData,
    wardrobeGroup,
    doorMarker,
    markerUd,
    local,
    wq,
    zOff,
    width,
    regionH,
    isHandleHoverMode,
  } = args;
  const rect = __readDoorLeafRect(userData);
  const faceRect = rect || {
    minX: -width / 2,
    maxX: width / 2,
    minY: -Math.max(0.025, regionH / 2),
    maxY: Math.max(0.025, regionH / 2),
  };
  const previewCenterX = (faceRect.minX + faceRect.maxX) / 2;
  const previewCenterY = (faceRect.minY + faceRect.maxY) / 2;
  const previewWidth = Math.max(0.02, faceRect.maxX - faceRect.minX - 0.01);
  const previewHeight = Math.max(0.02, faceRect.maxY - faceRect.minY - 0.01);
  const previewMaterial = isHandleHoverMode
    ? markerUd.__matAdd || markerUd.__matGroove || doorMarker?.material
    : markerUd.__matGroove || markerUd.__matAdd || doorMarker?.material;

  __positionDoorMarker({
    groupRec,
    wardrobeGroup,
    doorMarker,
    local,
    wq,
    centerX: previewCenterX,
    centerY: previewCenterY,
    zOff,
  });
  if (doorMarker) doorMarker.visible = true;
  if (doorMarker) doorMarker.material = previewMaterial;
  doorMarker?.scale?.set?.(previewWidth, previewHeight, 1);
  return true;
}
