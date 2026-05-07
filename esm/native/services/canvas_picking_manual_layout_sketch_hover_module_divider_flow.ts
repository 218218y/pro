import type { ManualLayoutSketchHoverModuleContext } from './canvas_picking_manual_layout_sketch_hover_module_contracts.js';
import { SKETCH_BOX_DIVIDER_TOOL as __SKETCH_BOX_DIVIDER_TOOL } from './canvas_picking_manual_layout_sketch_hover_module_contracts.js';
import {
  readFiniteNumber,
  readSketchDividerTargetBox,
} from './canvas_picking_manual_layout_sketch_hover_module_shared.js';
import { createManualLayoutSketchBoxContentHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import {
  createManualLayoutSketchHoverHost,
  writeManualLayoutSketchHoverPreview,
} from './canvas_picking_manual_layout_sketch_hover_module_preview_shared.js';

export function tryHandleManualLayoutSketchHoverModuleDividerFlow(
  ctx: ManualLayoutSketchHoverModuleContext
): boolean {
  const {
    tool,
    boxes,
    setPreview,
    hitLocalX,
    internalCenterX,
    woodThick,
    innerW,
    internalDepth,
    internalZ,
    bottomY,
    spanH,
    yClamped,
    __wp_resolveSketchBoxGeometry,
    __wp_readSketchBoxDividers,
    __wp_resolveSketchBoxSegments,
    __wp_pickSketchBoxSegment,
    __wp_findNearestSketchBoxDivider,
    __wp_resolveSketchBoxDividerPlacement,
    __wp_readSketchBoxDividerXNorm,
  } = ctx;
  if (tool === __SKETCH_BOX_DIVIDER_TOOL && boxes.length && setPreview) {
    let targetBox = null;
    let targetGeo: {
      outerW: number;
      innerW: number;
      centerX: number;
      outerD: number;
      innerD: number;
      centerZ: number;
      innerBackZ: number;
    } | null = null;
    let targetCenterY: number | null = null;
    let targetHeight: number | null = null;
    let bestDist = Infinity;
    const cursorX = readFiniteNumber(hitLocalX) ?? internalCenterX;
    for (let i = 0; i < boxes.length; i++) {
      const it = boxes[i];
      const box = readSketchDividerTargetBox(it);
      if (!box || box.freePlacement === true) continue;
      const yNorm = typeof box.yNorm === 'number' ? box.yNorm : Number(box.yNorm);
      let hM = typeof box.heightM === 'number' ? box.heightM : Number(box.heightM);
      if (!Number.isFinite(yNorm) || !Number.isFinite(hM) || !(hM > 0)) continue;
      hM = Math.max(woodThick * 2 + 0.02, Math.min(spanH, hM));
      const cy = bottomY + Math.max(0, Math.min(1, yNorm)) * spanH;
      const wRaw = box.widthM;
      const dRaw = box.depthM;
      const xNormRaw = box.xNorm;
      const wM = typeof wRaw === 'number' ? wRaw : wRaw != null ? Number(wRaw) : NaN;
      const dM = typeof dRaw === 'number' ? dRaw : dRaw != null ? Number(dRaw) : NaN;
      const xNorm = typeof xNormRaw === 'number' ? xNormRaw : xNormRaw != null ? Number(xNormRaw) : NaN;
      const geo = __wp_resolveSketchBoxGeometry({
        innerW,
        internalCenterX,
        internalDepth,
        internalZ,
        woodThick,
        widthM: Number.isFinite(wM) && wM > 0 ? wM : null,
        depthM: Number.isFinite(dM) && dM > 0 ? dM : null,
        xNorm: Number.isFinite(xNorm) ? xNorm : null,
      });
      const dx = Math.abs(cursorX - geo.centerX);
      const dy = Math.abs(yClamped - cy);
      const tolX = Math.max(0.02, Math.min(0.06, geo.outerW * 0.18));
      const tolY = Math.max(0.02, Math.min(0.06, hM * 0.18));
      if (dx > geo.outerW / 2 + tolX || dy > hM / 2 + tolY) continue;
      const dist = dx + dy;
      if (dist < bestDist) {
        bestDist = dist;
        targetBox = box;
        targetGeo = geo;
        targetCenterY = cy;
        targetHeight = hM;
      }
    }

    if (targetBox && targetGeo && targetCenterY != null && targetHeight != null) {
      const boxIdRaw = targetBox.id;
      const boxId = boxIdRaw != null ? String(boxIdRaw) : '';
      const existingDividers = __wp_readSketchBoxDividers(targetBox);
      const boxSegments = __wp_resolveSketchBoxSegments({
        dividers: existingDividers,
        boxCenterX: targetGeo.centerX,
        innerW: targetGeo.innerW,
        woodThick,
      });
      const activeSegment = __wp_pickSketchBoxSegment({
        segments: boxSegments,
        boxCenterX: targetGeo.centerX,
        innerW: targetGeo.innerW,
        cursorX,
      });
      const hoveredDivider = __wp_findNearestSketchBoxDivider({
        dividers: existingDividers,
        boxCenterX: targetGeo.centerX,
        innerW: targetGeo.innerW,
        woodThick,
        cursorX,
      });
      const freePlacement = __wp_resolveSketchBoxDividerPlacement({
        boxCenterX: targetGeo.centerX,
        innerW: targetGeo.innerW,
        woodThick,
        cursorX,
        dividerXNorm: __wp_readSketchBoxDividerXNorm(targetBox),
        enableCenterSnap: true,
      });
      const segmentSnapEps = activeSegment
        ? Math.min(0.035, Math.max(0.012, Number(activeSegment.width) * 0.07))
        : 0;
      const snapToSegment =
        !!activeSegment && Math.abs(cursorX - Number(activeSegment.centerX)) <= segmentSnapEps;
      const dividerPlacement =
        snapToSegment && activeSegment
          ? {
              xNorm: activeSegment.xNorm,
              centerX: activeSegment.centerX,
              centered: Math.abs(activeSegment.centerX - targetGeo.centerX) <= 0.001,
            }
          : freePlacement;
      let op: 'add' | 'remove' = 'add';
      let dividerXNorm = dividerPlacement.xNorm;
      let dividerCenterX = dividerPlacement.centerX;
      let dividerCentered = dividerPlacement.centered || snapToSegment;
      let dividerId: string | null = null;
      if (hoveredDivider) {
        op = 'remove';
        dividerXNorm = hoveredDivider.xNorm;
        dividerCenterX = hoveredDivider.centerX;
        dividerCentered = Math.abs(hoveredDivider.centerX - targetGeo.centerX) <= 0.001;
        dividerId = hoveredDivider.dividerId;
      }
      const dividerHighlightX = hoveredDivider
        ? targetGeo.centerX
        : snapToSegment && activeSegment
          ? activeSegment.centerX
          : targetGeo.centerX;
      const dividerPreviewW = hoveredDivider
        ? targetGeo.innerW
        : snapToSegment && activeSegment
          ? activeSegment.width
          : targetGeo.innerW;

      return writeManualLayoutSketchHoverPreview(ctx, {
        hoverRecord: createManualLayoutSketchBoxContentHoverRecord({
          host: createManualLayoutSketchHoverHost(ctx),
          contentKind: 'divider',
          boxId,
          freePlacement: false,
          op,
          dividerId,
          dividerXNorm,
          snapToCenter: dividerCentered,
        }),
        preview: {
          kind: 'drawer_divider',
          x: dividerCenterX,
          highlightX: dividerHighlightX,
          y: targetCenterY,
          z: targetGeo.innerBackZ + targetGeo.innerD / 2,
          w: Math.max(0.0001, dividerPreviewW),
          h: Math.max(0.0001, targetHeight - woodThick * 2),
          d: Math.max(0.0001, targetGeo.innerD),
          woodThick,
          snapToCenter: dividerCentered,
          op,
        },
      });
    }
  }
  return false;
}
