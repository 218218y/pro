import { MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  asNumberOrNull,
  asSketchFreePlacementBox,
  findSketchFreeBoxLocalHit,
  getSketchFreeBoxPartPrefix,
  isWithinSketchFreeBoxRemoveZone,
  resolveSketchFreeBoxGeometry,
  type ResolveSketchFreeBoxHoverPlacementArgs,
} from './canvas_picking_sketch_free_box_shared.js';
import { resolveSketchFreeBoxHoverAttachPlacement } from './canvas_picking_sketch_free_box_placement.js';
import type { SketchFreeBoxHoverContext } from './canvas_picking_sketch_free_box_hover_context.js';

export type SketchFreeBoxHoverRemovePlacement = {
  previewX: number;
  previewY: number;
  previewW: number;
  previewD: number;
  previewH: number;
  removeId: string | null;
  score: number;
};

export type SketchFreeBoxHoverAttachPlacement = {
  previewX: number;
  previewY: number;
  score: number;
  fixedAxis: 'x' | 'y';
  direction: -1 | 1;
  snappedToCenter: boolean;
};

export function scanSketchFreeBoxHoverPlacements(args: {
  context: SketchFreeBoxHoverContext;
  hoverArgs: ResolveSketchFreeBoxHoverPlacementArgs;
}): {
  removePlacement: SketchFreeBoxHoverRemovePlacement | null;
  attachPlacement: SketchFreeBoxHoverAttachPlacement | null;
} {
  const { context, hoverArgs } = args;
  let removePlacement: SketchFreeBoxHoverRemovePlacement | null = null;
  let attachPlacement: SketchFreeBoxHoverAttachPlacement | null = null;

  for (let i = 0; i < context.freeBoxes.length; i++) {
    const it = asSketchFreePlacementBox(context.freeBoxes[i]);
    if (!it) continue;
    const cx = asNumberOrNull(it.absX);
    const cy = asNumberOrNull(it.absY);
    const hM = asNumberOrNull(it.heightM);
    const wM = asNumberOrNull(it.widthM);
    const dM = asNumberOrNull(it.depthM);
    if (cx == null || cy == null || hM == null || !(hM > 0)) continue;

    const hitGeo = resolveSketchFreeBoxGeometry({
      wardrobeWidth: Number(context.wardrobeBox.width) || 0,
      wardrobeDepth: Number(context.wardrobeBox.depth) || 0,
      backZ: context.wardrobeBackZ,
      centerX: cx,
      woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
      widthM: wM != null && wM > 0 ? wM : null,
      depthM: dM != null && dM > 0 ? dM : null,
    });

    let surfaceHitX: number | null = null;
    let surfaceHitY: number | null = null;
    if (hoverArgs.hostModuleKey != null && Array.isArray(hoverArgs.intersects) && hoverArgs.localParent) {
      const localHit = findSketchFreeBoxLocalHit({
        App: hoverArgs.App,
        intersects: hoverArgs.intersects,
        localParent: hoverArgs.localParent,
        partPrefix: getSketchFreeBoxPartPrefix(hoverArgs.hostModuleKey, it.id ?? i),
        projectWorldPointToLocal: hoverArgs.projectWorldPointToLocal,
      });
      if (localHit && Number.isFinite(localHit.x) && Number.isFinite(localHit.y)) {
        surfaceHitX = Number(localHit.x);
        surfaceHitY = Number(localHit.y);
      }
    }

    const hoverDx = Math.min(
      Math.abs(context.planeX - cx),
      surfaceHitX != null ? Math.abs(surfaceHitX - cx) : Infinity
    );
    const hoverDy = Math.min(
      Math.abs(context.planeY - cy),
      surfaceHitY != null ? Math.abs(surfaceHitY - cy) : Infinity
    );
    const hoverPadX = Math.max(0.03, Math.min(0.14, Math.max(hitGeo.outerW, context.previewW) * 0.18));
    const hoverPadY = Math.max(0.03, Math.min(0.14, Math.max(hM, context.previewH) * 0.18));
    if (
      hoverDx > hitGeo.outerW / 2 + context.previewW / 2 + hoverPadX ||
      hoverDy > hM / 2 + context.previewH / 2 + hoverPadY
    ) {
      continue;
    }

    const planeRemoveHit = isWithinSketchFreeBoxRemoveZone({
      pointX: context.planeX,
      pointY: context.planeY,
      boxCenterX: cx,
      boxCenterY: cy,
      boxW: hitGeo.outerW,
      boxH: hM,
    });
    if (planeRemoveHit) {
      const removeScore = Math.abs(context.planeX - cx) + Math.abs(context.planeY - cy);
      if (!removePlacement || removeScore < removePlacement.score) {
        const idRaw = it.id;
        removePlacement = {
          previewX: cx,
          previewY: cy,
          previewW: hitGeo.outerW,
          previewD: hitGeo.outerD,
          previewH: hM,
          removeId: idRaw != null ? String(idRaw) : String(i),
          score: removeScore,
        };
      }
      continue;
    }

    const attachedPlacement = resolveSketchFreeBoxHoverAttachPlacement({
      pointX: context.planeX,
      pointY: context.planeY,
      targetCenterX: cx,
      targetCenterY: cy,
      targetW: hitGeo.outerW,
      targetH: hM,
      previewW: context.previewW,
      previewH: context.previewH,
      gap: context.gap,
      freeBoxes: context.freeBoxes,
      ignoreBoxId: it.id ?? i,
      wardrobeWidth: Number(context.wardrobeBox.width) || 0,
      wardrobeDepth: Number(context.wardrobeBox.depth) || 0,
      backZ: context.wardrobeBackZ,
      woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
    });
    if (attachedPlacement && (!attachPlacement || attachedPlacement.score < attachPlacement.score)) {
      attachPlacement = {
        previewX: attachedPlacement.centerX,
        previewY: attachedPlacement.centerY,
        score: attachedPlacement.score,
        fixedAxis: attachedPlacement.fixedAxis,
        direction: attachedPlacement.direction,
        snappedToCenter: attachedPlacement.snappedToCenter,
      };
    }
  }

  return { removePlacement, attachPlacement };
}
