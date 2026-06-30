import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { readPreviewNumber, readPreviewPositiveNumber } from './render_preview_number_contracts.js';
import type { SketchPlacementPreviewContext } from './render_preview_sketch_pipeline_shared.js';
import type { DoorTrimSurfacePlane } from '../features/door_authoring/api.js';

function readSurfacePlane(value: unknown): DoorTrimSurfacePlane {
  return value === 'yz' || value === 'xz' ? value : 'xy';
}

function applyRodPreview(ctx: SketchPlacementPreviewContext): boolean {
  if (ctx.kind !== 'rod') return false;

  let material = ctx.ud.__matRod || ctx.ud.__matShelf;
  let lineMaterial = ctx.ud.__lineRod || ctx.ud.__lineShelf;
  if (ctx.isRemove) {
    material = ctx.ud.__matRemove || material;
    lineMaterial = ctx.ud.__lineRemove || lineMaterial;
  }

  const h0 = ctx.h > 0 ? ctx.h : SKETCH_BOX_DIMENSIONS.preview.rodDefaultHeightM;
  const d0 = ctx.d > 0 ? ctx.d : SKETCH_BOX_DIMENSIONS.preview.rodDefaultDepthM;
  const showPrimaryBody = ctx.input.showPrimaryBody !== false;
  const showCenterXGuide = ctx.input.showCenterXGuide === true && !ctx.isRemove;
  const showCenterYGuide = ctx.input.showCenterYGuide === true && !ctx.isRemove;
  const guideWidth = readPreviewPositiveNumber(ctx.input.guideWidth);
  const guideHeight = readPreviewPositiveNumber(ctx.input.guideHeight);
  const guideVerticalX = readPreviewNumber(ctx.input.guideVerticalX);
  const guideVerticalY = readPreviewNumber(ctx.input.guideVerticalY);
  const guideHorizontalX = readPreviewNumber(ctx.input.guideHorizontalX);
  const guideHorizontalY = readPreviewNumber(ctx.input.guideHorizontalY);
  const guideDepth = Math.max(
    SKETCH_BOX_DIMENSIONS.preview.rodGuideDepthMinM,
    d0 + SKETCH_BOX_DIMENSIONS.preview.rodGuideDepthExtraM
  );
  const guideThicknessX = Math.max(
    SKETCH_BOX_DIMENSIONS.preview.rodGuideThicknessMinM,
    Math.min(
      SKETCH_BOX_DIMENSIONS.preview.rodGuideThicknessMaxM,
      Math.max(SKETCH_BOX_DIMENSIONS.preview.minScaleM, guideWidth ?? ctx.w) *
        SKETCH_BOX_DIMENSIONS.preview.rodGuideThicknessRatio
    )
  );
  const guideThicknessY = Math.max(
    SKETCH_BOX_DIMENSIONS.preview.rodGuideThicknessMinM,
    Math.min(
      SKETCH_BOX_DIMENSIONS.preview.rodGuideThicknessMaxM,
      Math.max(SKETCH_BOX_DIMENSIONS.preview.minScaleM, guideHeight ?? h0) *
        SKETCH_BOX_DIMENSIONS.preview.rodGuideThicknessRatio
    )
  );
  const guideMat = ctx.ud.__matBrace || ctx.ud.__matRod || ctx.ud.__matShelf;
  const guideLine = ctx.ud.__lineBrace || ctx.ud.__lineRod || ctx.ud.__lineShelf;

  if (ctx.shelfA) {
    if (showPrimaryBody) {
      const surfacePlane = readSurfacePlane(ctx.input.surfacePlane);
      const faceSign = (readPreviewNumber(ctx.input.surfaceFaceSign) ?? 1) < 0 ? -1 : 1;
      const faceOffset = d0 / 2 + SKETCH_BOX_DIMENSIONS.preview.rodGuideZOffsetM;
      const faceCoord = ctx.z + (surfacePlane === 'xy' ? 0 : faceSign * faceOffset);
      if (surfacePlane === 'yz') {
        ctx.placePreviewBoxMesh({
          mesh: ctx.shelfA,
          sx: d0,
          sy: h0,
          sz: ctx.w,
          px: faceCoord,
          py: ctx.y,
          pz: ctx.x,
          material,
          lineMaterial,
        });
      } else if (surfacePlane === 'xz') {
        ctx.placePreviewBoxMesh({
          mesh: ctx.shelfA,
          sx: ctx.w,
          sy: d0,
          sz: h0,
          px: ctx.x,
          py: faceCoord,
          pz: ctx.y,
          material,
          lineMaterial,
        });
      } else {
        ctx.placePreviewBoxMesh({
          mesh: ctx.shelfA,
          sx: ctx.w,
          sy: h0,
          sz: d0,
          px: ctx.x,
          py: ctx.y,
          pz: ctx.z,
          material,
          lineMaterial,
        });
      }
    } else {
      ctx.setVisible(ctx.shelfA, false);
    }
  }

  if (ctx.boxLeft) {
    if (showCenterXGuide) {
      ctx.placePreviewBoxMesh({
        mesh: ctx.boxLeft,
        sx: guideThicknessX,
        sy: guideHeight ?? h0,
        sz: guideDepth,
        px: guideVerticalX ?? 0,
        py: guideVerticalY ?? ctx.y,
        pz: ctx.z + SKETCH_BOX_DIMENSIONS.preview.rodGuideZOffsetM,
        material: guideMat,
        lineMaterial: guideLine,
        renderOrder: 10010,
        outlineRenderOrder: 10011,
      });
    } else {
      ctx.setVisible(ctx.boxLeft, false);
    }
  }

  if (ctx.boxTop) {
    if (showCenterYGuide) {
      ctx.placePreviewBoxMesh({
        mesh: ctx.boxTop,
        sx: guideWidth ?? ctx.w,
        sy: guideThicknessY,
        sz: guideDepth,
        px: guideHorizontalX ?? ctx.x,
        py: guideHorizontalY ?? 0,
        pz: ctx.z + SKETCH_BOX_DIMENSIONS.preview.rodGuideZOffsetM,
        material: guideMat,
        lineMaterial: guideLine,
        renderOrder: 10010,
        outlineRenderOrder: 10011,
      });
    } else {
      ctx.setVisible(ctx.boxTop, false);
    }
  }

  ctx.setVisible(ctx.boxBottom, false);
  ctx.setVisible(ctx.boxRight, false);
  ctx.setVisible(ctx.boxBack, false);
  return true;
}

function applyDefaultShelfPreview(ctx: SketchPlacementPreviewContext): void {
  const isGlass = ctx.variant === 'glass';
  const isBrace = ctx.variant === 'brace';
  let material = isGlass ? ctx.ud.__matGlass : isBrace ? ctx.ud.__matBrace : ctx.ud.__matShelf;
  let lineMaterial = isGlass ? ctx.ud.__lineGlass : isBrace ? ctx.ud.__lineBrace : ctx.ud.__lineShelf;
  if (ctx.isRemove) {
    material = ctx.ud.__matRemove || material;
    lineMaterial = ctx.ud.__lineRemove || lineMaterial;
  }
  const h0 = ctx.h > 0 ? ctx.h : ctx.woodThick;
  const hReal = Math.max(SKETCH_BOX_DIMENSIONS.preview.minScaleM, h0);

  ctx.placePreviewBoxMesh({
    mesh: ctx.shelfA,
    sx: ctx.w,
    sy: hReal,
    sz: ctx.d,
    px: ctx.x,
    py: ctx.y,
    pz: ctx.z,
    material,
    lineMaterial,
  });
}

export function applyLinearSketchPlacementPreview(ctx: SketchPlacementPreviewContext): boolean {
  if (applyRodPreview(ctx)) return true;
  applyDefaultShelfPreview(ctx);
  return true;
}
