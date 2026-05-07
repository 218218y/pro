import type { PreviewDrawerEntry, PreviewMaterialLike } from './render_preview_ops_contracts.js';
import type { SketchPlacementPreviewContext } from './render_preview_sketch_pipeline_shared.js';
import { DRAWER_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

function resolvePreviewBodyMaterials(ctx: SketchPlacementPreviewContext) {
  return {
    material: ctx.isRemove ? ctx.ud.__matRemove : ctx.ud.__matShelf || ctx.ud.__matBox,
    lineMaterial: ctx.isRemove ? ctx.ud.__lineRemove : ctx.ud.__lineShelf || ctx.ud.__lineBox,
  };
}

function placeFrontOverlay(
  ctx: SketchPlacementPreviewContext,
  args: {
    material: PreviewMaterialLike | null | undefined;
    lineMaterial: PreviewMaterialLike | null | undefined;
    frontOverlay: ReturnType<SketchPlacementPreviewContext['readFrontOverlay']>;
    mesh: typeof ctx.shelfA | typeof ctx.boxBack;
  }
) {
  const { material, lineMaterial, frontOverlay, mesh } = args;
  if (frontOverlay) {
    ctx.placePreviewBoxMesh({
      mesh,
      sx: frontOverlay.w,
      sy: frontOverlay.h,
      sz: frontOverlay.t,
      px: frontOverlay.x,
      py: frontOverlay.y,
      pz: frontOverlay.z,
      material,
      lineMaterial,
    });
  } else {
    ctx.setVisible(mesh, false);
  }
}

function applyDrawersPreview(ctx: SketchPlacementPreviewContext): boolean {
  if (ctx.kind !== 'drawers') return false;

  const drawerH = Number(ctx.input.drawerH);
  const gap = Number(ctx.input.drawerGap || DRAWER_DIMENSIONS.sketch.internalGapM);
  if (!(drawerH > 0)) {
    ctx.g.visible = false;
    return true;
  }

  const { material, lineMaterial } = resolvePreviewBodyMaterials(ctx);
  const y0 = ctx.y + drawerH / 2 + DRAWER_DIMENSIONS.sketch.previewDrawerBottomLiftM;
  const y1 = ctx.y + drawerH + gap + drawerH / 2;
  const frontOverlay = ctx.readFrontOverlay(
    ctx.x,
    ctx.y + drawerH + gap / 2 + drawerH / 2,
    ctx.w,
    Math.max(
      drawerH * DRAWER_DIMENSIONS.sketch.internalStackCount +
        gap +
        DRAWER_DIMENSIONS.sketch.previewStackExtraHeightM,
      Number(ctx.input.frontOverlayH) || 0
    ),
    Math.max(
      DRAWER_DIMENSIONS.sketch.previewOverlayThicknessMinM,
      Math.min(ctx.d, DRAWER_DIMENSIONS.sketch.previewOverlayThicknessMaxM)
    )
  );

  const setDrawer = (mesh: typeof ctx.boxTop, py: number) => {
    ctx.placePreviewBoxMesh({
      mesh,
      sx: ctx.w,
      sy: drawerH,
      sz: ctx.d,
      px: ctx.x,
      py,
      pz: ctx.z,
      material,
      lineMaterial,
    });
  };

  placeFrontOverlay(ctx, { mesh: ctx.shelfA, material, lineMaterial, frontOverlay });
  ctx.setVisible(ctx.boxLeft, false);
  ctx.setVisible(ctx.boxRight, false);
  ctx.setVisible(ctx.boxBack, false);
  setDrawer(ctx.boxTop, y1);
  setDrawer(ctx.boxBottom, y0);
  return true;
}

function applyExternalDrawersPreview(ctx: SketchPlacementPreviewContext): boolean {
  if (ctx.kind !== 'ext_drawers') return false;

  const drawerList = ctx.readPreviewDrawerList(ctx.input.drawers);
  const drawerMeshes = [ctx.boxTop, ctx.boxBottom, ctx.boxLeft, ctx.boxRight, ctx.boxBack];
  const { material, lineMaterial } = resolvePreviewBodyMaterials(ctx);
  const drawerHeights = drawerList
    .map(entry => Number(ctx.asObject<PreviewDrawerEntry>(entry)?.h))
    .filter(entryH => Number.isFinite(entryH) && entryH > 0);
  const overlayH = drawerHeights.length
    ? drawerHeights.reduce((sum, entryH) => sum + entryH, 0) +
      DRAWER_DIMENSIONS.sketch.previewStackExtraHeightM
    : DRAWER_DIMENSIONS.sketch.previewExternalFallbackHeightM;
  const frontOverlay = ctx.readFrontOverlay(
    ctx.x,
    ctx.y + overlayH / 2,
    ctx.w,
    overlayH,
    Math.max(
      DRAWER_DIMENSIONS.sketch.previewOverlayThicknessMinM,
      Math.min(ctx.d, DRAWER_DIMENSIONS.sketch.previewOverlayThicknessMaxM)
    )
  );

  placeFrontOverlay(ctx, { mesh: ctx.shelfA, material, lineMaterial, frontOverlay });

  for (let i = 0; i < drawerMeshes.length; i += 1) {
    const mesh = drawerMeshes[i];
    const drawer = i < drawerList.length ? ctx.asObject<PreviewDrawerEntry>(drawerList[i]) : null;
    if (!mesh || !drawer) {
      ctx.setVisible(mesh, false);
      continue;
    }
    const py = Number(drawer.y);
    const ph = Number(drawer.h);
    if (!Number.isFinite(py) || !(ph > 0)) {
      ctx.setVisible(mesh, false);
      continue;
    }
    ctx.placePreviewBoxMesh({
      mesh,
      sx: ctx.w,
      sy: ph,
      sz: ctx.d,
      px: ctx.x,
      py,
      pz: ctx.z,
      material,
      lineMaterial,
    });
  }

  return true;
}

function applyDrawerDividerPreview(ctx: SketchPlacementPreviewContext): boolean {
  if (ctx.kind !== 'drawer_divider') return false;

  const highlightX = Number(ctx.input.highlightX);
  const snapToCenter = ctx.input.snapToCenter === true;
  const boxX = Number.isFinite(highlightX) ? highlightX : ctx.x;
  const highlightMat = ctx.ud.__matShelf || ctx.ud.__matBox;
  const highlightLine = ctx.ud.__lineShelf || ctx.ud.__lineBox;
  const dividerMat = ctx.isRemove
    ? ctx.ud.__matRemove
    : snapToCenter
      ? ctx.ud.__matBrace || ctx.ud.__matBox || ctx.ud.__matShelf
      : ctx.ud.__matBox || ctx.ud.__matShelf;
  const dividerLine = ctx.isRemove
    ? ctx.ud.__lineRemove
    : snapToCenter
      ? ctx.ud.__lineBrace || ctx.ud.__lineBox || ctx.ud.__lineShelf
      : ctx.ud.__lineBox || ctx.ud.__lineShelf;
  const dividerT = Math.max(
    DRAWER_DIMENSIONS.sketch.previewDividerMinM,
    Math.min(
      Math.max(
        SKETCH_BOX_DIMENSIONS.preview.doorMinDepthM,
        ctx.w * DRAWER_DIMENSIONS.sketch.previewDividerWidthRatio
      ),
      DRAWER_DIMENSIONS.sketch.previewDividerMaxM
    )
  );

  ctx.placePreviewBoxMesh({
    mesh: ctx.boxTop,
    sx: ctx.w,
    sy: ctx.h,
    sz: ctx.d,
    px: boxX,
    py: ctx.y,
    pz: ctx.z,
    material: highlightMat,
    lineMaterial: highlightLine,
  });
  ctx.placePreviewBoxMesh({
    mesh: ctx.shelfA,
    sx: dividerT,
    sy: ctx.h,
    sz: ctx.d + DRAWER_DIMENSIONS.sketch.previewDividerDepthExtraM,
    px: ctx.x,
    py: ctx.y,
    pz: ctx.z,
    material: dividerMat,
    lineMaterial: dividerLine,
  });

  ctx.setVisible(ctx.boxBottom, false);
  ctx.setVisible(ctx.boxLeft, false);
  ctx.setVisible(ctx.boxRight, false);
  return true;
}

function applyStoragePreview(ctx: SketchPlacementPreviewContext): boolean {
  if (ctx.kind !== 'storage') return false;

  const { material, lineMaterial } = resolvePreviewBodyMaterials(ctx);
  const frontOverlay = ctx.readFrontOverlay(
    ctx.x,
    ctx.y,
    ctx.w,
    ctx.h,
    Math.max(
      DRAWER_DIMENSIONS.sketch.previewOverlayThicknessMinM,
      Math.min(
        ctx.d,
        ctx.woodThick > 0 ? ctx.woodThick : DRAWER_DIMENSIONS.sketch.previewOverlayThicknessMaxM
      )
    )
  );

  ctx.placePreviewBoxMesh({
    mesh: ctx.shelfA,
    sx: ctx.w,
    sy: ctx.h,
    sz: ctx.d,
    px: ctx.x,
    py: ctx.y,
    pz: ctx.z,
    material,
    lineMaterial,
  });

  placeFrontOverlay(ctx, { mesh: ctx.boxBack, material, lineMaterial, frontOverlay });
  ctx.setVisible(ctx.boxTop, false);
  ctx.setVisible(ctx.boxBottom, false);
  ctx.setVisible(ctx.boxLeft, false);
  ctx.setVisible(ctx.boxRight, false);
  return true;
}

export function applyStackedBoxContentSketchPlacementPreview(ctx: SketchPlacementPreviewContext): boolean {
  return (
    applyDrawersPreview(ctx) ||
    applyExternalDrawersPreview(ctx) ||
    applyDrawerDividerPreview(ctx) ||
    applyStoragePreview(ctx)
  );
}
