import { getThreeMaybe } from '../runtime/three_access.js';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  __callMaybe,
  __getSketchPlacementPreviewFns,
  __readNumber,
  __readRecord,
  __readString,
  __withAppThree,
  type ExtDrawersHoverPreviewArgs,
} from './canvas_picking_hover_preview_modes_shared.js';

export function tryHandleExtDrawersHoverPreview(args: ExtDrawersHoverPreviewArgs): boolean {
  if (!args.isExtDrawerEditMode) return false;
  try {
    const {
      App,
      ndcX,
      ndcY,
      raycaster,
      mouse,
      hideLayoutPreview,
      resolveInteriorHoverTarget,
      measureObjectLocalBox,
      readInteriorModuleConfigRef,
      readUi,
    } = args;
    const THREE = getThreeMaybe(App);
    __callMaybe(hideLayoutPreview, __withAppThree(App, THREE));
    const { hidePreview, setPreview } = __getSketchPlacementPreviewFns(App);
    const target = resolveInteriorHoverTarget(App, raycaster, mouse, ndcX, ndcY);
    if (!target || !setPreview) {
      __callMaybe(hidePreview, __withAppThree(App, THREE));
      return false;
    }

    const selectorBox = measureObjectLocalBox(App, target.hitSelectorObj);
    const cfgRef = readInteriorModuleConfigRef(App, target.hitModuleKey, !!target.isBottom);
    const ui = __readRecord(readUi(App));
    const drawerType = __readString(ui, 'currentExtDrawerType', 'regular');
    const countRaw = __readNumber(ui, 'currentExtDrawerCount', DRAWER_DIMENSIONS.sketch.externalCountMin);
    const drawerCount =
      countRaw >= DRAWER_DIMENSIONS.sketch.externalCountMin &&
      countRaw <= DRAWER_DIMENSIONS.sketch.externalCountMax
        ? Math.floor(countRaw)
        : DRAWER_DIMENSIONS.sketch.externalCountMin;
    const currentCount = __readNumber(cfgRef, 'extDrawersCount', 0);
    const hasShoe = !!cfgRef?.hasShoeDrawer;
    const op =
      drawerType === 'shoe' ? (hasShoe ? 'remove' : 'add') : currentCount === drawerCount ? 'remove' : 'add';

    const outerW =
      selectorBox && selectorBox.width > 0
        ? selectorBox.width
        : Math.max(
            DRAWER_DIMENSIONS.sketch.externalPreviewMinWidthM,
            Number(target.innerW) + Number(target.woodThick) * 2
          );
    const outerD =
      selectorBox && selectorBox.depth > 0
        ? selectorBox.depth
        : Math.max(
            DRAWER_DIMENSIONS.sketch.externalPreviewMinDepthM,
            Number(target.internalDepth) + DRAWER_DIMENSIONS.sketch.externalPreviewDepthClearanceM
          );
    const centerX = selectorBox ? selectorBox.centerX : target.internalCenterX;
    const centerZ = selectorBox
      ? selectorBox.centerZ
      : Number(target.internalZ) + DRAWER_DIMENSIONS.sketch.externalPreviewCenterZInsetM;
    const baseY = selectorBox
      ? selectorBox.centerY - selectorBox.height / 2
      : Number(target.bottomY) - Number(target.woodThick);
    const visualW = Math.max(
      DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinWidthM,
      Number(outerW) - DRAWER_DIMENSIONS.external.visualWidthClearanceM
    );
    const visualT = DRAWER_DIMENSIONS.external.visualThicknessM;
    const frontPlaneZ = centerZ + outerD / 2;
    const frontZ = frontPlaneZ + visualT / 2 + DRAWER_DIMENSIONS.sketch.externalPreviewFrontZOffsetM;
    const drawers = [];
    const shoeH = DRAWER_DIMENSIONS.external.shoeHeightM;
    const regH = DRAWER_DIMENSIONS.external.regularHeightM;
    const baseStackOffset = drawerType === 'shoe' ? 0 : hasShoe ? shoeH : 0;
    if (drawerType === 'shoe') {
      drawers.push({
        y: baseY + Number(target.woodThick) + shoeH / 2,
        h: Math.max(
          DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinHeightM,
          shoeH - DRAWER_DIMENSIONS.external.visualHeightClearanceM
        ),
      });
    } else {
      for (let i = 0; i < drawerCount; i++) {
        drawers.push({
          y: baseY + Number(target.woodThick) + baseStackOffset + i * regH + regH / 2,
          h: Math.max(
            DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinHeightM,
            regH - DRAWER_DIMENSIONS.external.visualHeightClearanceM
          ),
        });
      }
    }

    setPreview({
      App,
      THREE,
      anchor: target.hitSelectorObj,
      kind: 'ext_drawers',
      x: centerX,
      y: baseY,
      z: frontZ,
      w: visualW,
      d: visualT,
      woodThick: target.woodThick,
      drawers,
      op,
    });
    return true;
  } catch {
    return false;
  }
}
