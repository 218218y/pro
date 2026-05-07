import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { PreviewMeshLike } from './render_preview_ops_contracts.js';
import type { SketchPlacementPreviewContext } from './render_preview_sketch_pipeline_shared.js';

export function applyBoxVolumeSketchPlacementPreview(ctx: SketchPlacementPreviewContext): boolean {
  if (ctx.kind !== 'box') return false;

  const boxH = Number(ctx.input.boxH);
  const fillFront = ctx.input.fillFront === true;
  const fillBack = ctx.input.fillBack === true;
  const snapToCenter = ctx.input.snapToCenter === true;
  const overlayThroughScene = ctx.input.overlayThroughScene === true;
  const thickness = Math.max(SKETCH_BOX_DIMENSIONS.preview.minScaleM, ctx.woodThick);

  if (!(boxH > thickness * 2)) {
    ctx.g.visible = false;
    return true;
  }

  const sideH = Math.max(thickness, boxH - 2 * thickness);
  const halfH = boxH / 2;
  const yTop = ctx.y + halfH - thickness / 2;
  const yBot = ctx.y - halfH + thickness / 2;
  const xL = ctx.x - ctx.w / 2 + thickness / 2;
  const xR = ctx.x + ctx.w / 2 - thickness / 2;
  const frontOverlay = ctx.readFrontOverlay(
    ctx.x,
    ctx.y,
    ctx.w,
    boxH,
    Math.max(SKETCH_BOX_DIMENSIONS.preview.boxFillThicknessMinM, Math.min(ctx.d, thickness))
  );
  const frontFillT = frontOverlay
    ? frontOverlay.t
    : Math.max(SKETCH_BOX_DIMENSIONS.preview.boxFillThicknessMinM, Math.min(ctx.d, thickness));
  const frontZ = frontOverlay ? frontOverlay.z : ctx.z + ctx.d / 2 - frontFillT / 2;
  const frontX = frontOverlay ? frontOverlay.x : ctx.x;
  const frontY = frontOverlay ? frontOverlay.y : ctx.y;
  const frontW = frontOverlay ? frontOverlay.w : ctx.w;
  const frontH = frontOverlay ? frontOverlay.h : boxH;
  const backFillT = Math.max(SKETCH_BOX_DIMENSIONS.preview.boxFillThicknessMinM, Math.min(ctx.d, thickness));
  const backZ = ctx.z - ctx.d / 2 + backFillT / 2;
  const backW = Math.max(thickness, ctx.w - 2 * thickness);
  const backH = Math.max(thickness, boxH - 2 * thickness);

  const boxMat = overlayThroughScene
    ? ctx.isRemove
      ? ctx.ud.__matRemoveOverlay || ctx.ud.__matRemove
      : snapToCenter
        ? ctx.ud.__matBrace || ctx.ud.__matBoxOverlay || ctx.ud.__matBox
        : ctx.ud.__matBoxOverlay || ctx.ud.__matBox
    : ctx.isRemove
      ? ctx.ud.__matRemove
      : snapToCenter
        ? ctx.ud.__matBrace || ctx.ud.__matBox
        : ctx.ud.__matBox;
  const boxLine = overlayThroughScene
    ? ctx.isRemove
      ? ctx.ud.__lineRemoveOverlay || ctx.ud.__lineRemove
      : snapToCenter
        ? ctx.ud.__lineBrace || ctx.ud.__lineBoxOverlay || ctx.ud.__lineBox
        : ctx.ud.__lineBoxOverlay || ctx.ud.__lineBox
    : ctx.isRemove
      ? ctx.ud.__lineRemove
      : snapToCenter
        ? ctx.ud.__lineBrace || ctx.ud.__lineBox
        : ctx.ud.__lineBox;
  const centerMarkerMat = ctx.ud.__matBrace || boxMat;
  const centerMarkerLine = ctx.ud.__lineBrace || boxLine;

  const setBox = (
    mesh: PreviewMeshLike | null,
    sx: number,
    sy: number,
    sz: number,
    px: number,
    py: number,
    pz: number
  ) => {
    ctx.placePreviewBoxMesh({
      mesh,
      sx,
      sy,
      sz,
      px,
      py,
      pz,
      material: boxMat,
      lineMaterial: boxLine,
      renderOrder: overlayThroughScene ? 10020 : 9999,
      outlineRenderOrder: overlayThroughScene ? 10021 : 10000,
    });
  };

  const setCenterMarker = () => {
    if (!ctx.shelfA) return;
    const markerT = Math.max(
      SKETCH_BOX_DIMENSIONS.preview.boxCenterMarkerThicknessMinM,
      Math.min(thickness, SKETCH_BOX_DIMENSIONS.preview.boxCenterMarkerThicknessMaxM)
    );
    ctx.setVisible(ctx.shelfA, true);
    ctx.resetMeshOrientation(ctx.shelfA);
    ctx.applyPreviewStyle(
      ctx.shelfA,
      centerMarkerMat,
      centerMarkerLine,
      overlayThroughScene ? 10022 : 10001,
      overlayThroughScene ? 10023 : 10002
    );
    if (typeof ctx.shelfA.position?.set === 'function') ctx.shelfA.position.set(ctx.x, ctx.y, frontZ);
    if (typeof ctx.shelfA.scale?.set === 'function') {
      ctx.shelfA.scale.set(markerT, Math.max(SKETCH_BOX_DIMENSIONS.preview.minScaleM, boxH), markerT);
    }
  };

  if (fillFront || frontOverlay) setBox(ctx.shelfA, frontW, frontH, frontFillT, frontX, frontY, frontZ);
  else ctx.setVisible(ctx.shelfA, false);

  if (fillBack) setBox(ctx.boxBack, backW, backH, backFillT, ctx.x, ctx.y, backZ);
  else ctx.setVisible(ctx.boxBack, false);

  setBox(ctx.boxTop, ctx.w, thickness, ctx.d, ctx.x, yTop, ctx.z);
  setBox(ctx.boxBottom, ctx.w, thickness, ctx.d, ctx.x, yBot, ctx.z);
  setBox(ctx.boxLeft, thickness, sideH, ctx.d, xL, ctx.y, ctx.z);
  setBox(ctx.boxRight, thickness, sideH, ctx.d, xR, ctx.y, ctx.z);
  if (!fillFront && snapToCenter) setCenterMarker();
  return true;
}
