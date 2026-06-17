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
import {
  buildSketchBoxDividerMeasurementEntries,
  buildSketchBoxHorizontalDividerMeasurementEntries,
} from './canvas_picking_sketch_box_divider_measurements.js';

const __SKETCH_BOX_HORIZONTAL_DIVIDER_TOOL = 'sketch_box_divider_horizontal';

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
    __wp_readSketchBoxHorizontalDividers = () => [],
    __wp_resolveSketchBoxSegments,
    __wp_pickSketchBoxSegment,
    __wp_resolveSketchBoxVerticalSegments = () => [],
    __wp_pickSketchBoxVerticalSegment = () => null,
    __wp_findNearestSketchBoxDivider,
    __wp_findNearestSketchBoxHorizontalDivider = () => null,
    __wp_resolveSketchBoxDividerPlacement,
    __wp_resolveSketchBoxHorizontalDividerPlacement = args => {
      const boxCenterY = Number(args.boxCenterY);
      const innerH = Number(args.innerH);
      const cursorY = Number(args.cursorY);
      const defaultNorm = Number(args.dividerYNorm);
      const minY = boxCenterY - innerH / 2;
      const centerY = Number.isFinite(cursorY)
        ? cursorY
        : minY + (Number.isFinite(defaultNorm) ? defaultNorm : 0.5) * innerH;
      const yNorm = innerH > 0 ? Math.max(0, Math.min(1, (centerY - minY) / innerH)) : 0.5;
      return {
        yNorm,
        centerY: Number.isFinite(centerY) ? centerY : boxCenterY,
        centered: Math.abs(yNorm - 0.5) <= 0.001,
      };
    },
    __wp_readSketchBoxDividerXNorm,
  } = ctx;
  if (tool !== __SKETCH_BOX_DIVIDER_TOOL && tool !== __SKETCH_BOX_HORIZONTAL_DIVIDER_TOOL) return false;
  if (!boxes.length || !setPreview) return false;

  let targetBox: any = null;
  let targetGeo: any = null;
  let targetCenterY: number | null = null;
  let targetHeight: number | null = null;
  let bestDist = Infinity;
  const cursorX = readFiniteNumber(hitLocalX) ?? internalCenterX;
  for (let i = 0; i < boxes.length; i++) {
    const box = readSketchDividerTargetBox(boxes[i]);
    if (!box || box.freePlacement === true) continue;
    const yNorm = typeof box.yNorm === 'number' ? box.yNorm : Number(box.yNorm);
    let hM = typeof box.heightM === 'number' ? box.heightM : Number(box.heightM);
    if (!Number.isFinite(yNorm) || !Number.isFinite(hM) || !(hM > 0)) continue;
    hM = Math.max(woodThick * 2 + 0.02, Math.min(spanH, hM));
    const cy = bottomY + Math.max(0, Math.min(1, yNorm)) * spanH;
    const wM = typeof box.widthM === 'number' ? box.widthM : box.widthM != null ? Number(box.widthM) : NaN;
    const dM = typeof box.depthM === 'number' ? box.depthM : box.depthM != null ? Number(box.depthM) : NaN;
    const xNorm = typeof box.xNorm === 'number' ? box.xNorm : box.xNorm != null ? Number(box.xNorm) : NaN;
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
    if (
      dx > geo.outerW / 2 + Math.max(0.02, Math.min(0.06, geo.outerW * 0.18)) ||
      dy > hM / 2 + Math.max(0.02, Math.min(0.06, hM * 0.18))
    )
      continue;
    const dist = dx + dy;
    if (dist < bestDist) {
      bestDist = dist;
      targetBox = box;
      targetGeo = geo;
      targetCenterY = cy;
      targetHeight = hM;
    }
  }
  if (!targetBox || !targetGeo || targetCenterY == null || targetHeight == null) return false;
  const boxId = targetBox.id != null ? String(targetBox.id) : '';
  const targetInnerH = Math.max(0.0001, targetHeight - woodThick * 2);
  const dividerPreviewD = Math.max(0.0001, targetGeo.innerD);
  const dividerPreviewZ = targetGeo.innerBackZ + targetGeo.innerD / 2;
  const existingDividers = __wp_readSketchBoxDividers(targetBox);
  const existingHorizontalDividers = __wp_readSketchBoxHorizontalDividers(targetBox);

  if (tool === __SKETCH_BOX_HORIZONTAL_DIVIDER_TOOL) {
    const columnSegments = __wp_resolveSketchBoxSegments({
      dividers: existingDividers,
      horizontalDividers: existingHorizontalDividers,
      boxCenterX: targetGeo.centerX,
      innerW: targetGeo.innerW,
      boxCenterY: targetCenterY,
      innerH: targetInnerH,
      cursorX,
      cursorY: yClamped,
      woodThick,
    });
    const activeColumnSegment = __wp_pickSketchBoxSegment({
      segments: columnSegments,
      boxCenterX: targetGeo.centerX,
      innerW: targetGeo.innerW,
      cursorX,
    });
    const hoveredDivider = __wp_findNearestSketchBoxHorizontalDivider({
      dividers: existingHorizontalDividers,
      boxCenterY: targetCenterY,
      innerH: targetInnerH,
      woodThick,
      cursorY: yClamped,
      verticalDividers: existingDividers,
      boxCenterX: targetGeo.centerX,
      innerW: targetGeo.innerW,
      cursorX,
    });
    const placement = __wp_resolveSketchBoxHorizontalDividerPlacement({
      boxCenterY: targetCenterY,
      innerH: targetInnerH,
      woodThick,
      cursorY: yClamped,
      dividerYNorm: null,
      enableCenterSnap: true,
    });
    const op: 'add' | 'remove' = hoveredDivider ? 'remove' : 'add';
    const dividerId = hoveredDivider ? hoveredDivider.dividerId : null;
    const dividerYNorm = hoveredDivider ? hoveredDivider.yNorm : placement.yNorm;
    const dividerXNorm =
      hoveredDivider?.xNorm ??
      (existingDividers.length && activeColumnSegment ? activeColumnSegment.xNorm : null);
    const dividerCenterY = hoveredDivider ? hoveredDivider.centerY : placement.centerY;
    const snapToCenter = hoveredDivider ? hoveredDivider.centered : placement.centered;
    const dividerCenterX =
      dividerXNorm != null && activeColumnSegment ? activeColumnSegment.centerX : targetGeo.centerX;
    const dividerWidth =
      dividerXNorm != null && activeColumnSegment ? activeColumnSegment.width : targetGeo.innerW;
    const clearanceMeasurements = buildSketchBoxHorizontalDividerMeasurementEntries({
      dividers: existingHorizontalDividers,
      boxCenterY: targetCenterY,
      innerH: targetInnerH,
      woodThick,
      dividerCenterX,
      dividerWidth,
      dividerCenterY,
      dividerCenterZ: dividerPreviewZ,
      dividerDepth: dividerPreviewD,
      resolveSketchBoxHorizontalDividerPlacement: __wp_resolveSketchBoxHorizontalDividerPlacement,
    });
    return writeManualLayoutSketchHoverPreview(ctx, {
      hoverRecord: createManualLayoutSketchBoxContentHoverRecord({
        host: createManualLayoutSketchHoverHost(ctx),
        contentKind: 'divider',
        boxId,
        freePlacement: false,
        op,
        dividerId,
        dividerYNorm,
        dividerXNorm,
        dividerAxis: 'horizontal',
        snapToCenter,
      }),
      preview: {
        kind: 'drawer_divider',
        dividerAxis: 'horizontal',
        x: dividerCenterX,
        y: dividerCenterY,
        highlightY: targetCenterY,
        z: dividerPreviewZ,
        w: Math.max(0.0001, dividerWidth),
        h: targetInnerH,
        d: dividerPreviewD,
        woodThick,
        snapToCenter,
        op,
        clearanceMeasurements,
      },
    });
  }

  const verticalSegments = existingHorizontalDividers.length
    ? __wp_resolveSketchBoxVerticalSegments({
        dividers: existingHorizontalDividers,
        boxCenterY: targetCenterY,
        innerH: targetInnerH,
        woodThick,
        verticalDividers: existingDividers,
        boxCenterX: targetGeo.centerX,
        innerW: targetGeo.innerW,
        cursorX,
      })
    : [];
  const activeVerticalSegment = verticalSegments.length
    ? __wp_pickSketchBoxVerticalSegment({
        segments: verticalSegments,
        boxCenterY: targetCenterY,
        innerH: targetInnerH,
        cursorY: yClamped,
      })
    : null;
  const activeYNorm = activeVerticalSegment ? activeVerticalSegment.yNorm : null;
  const boxSegments = __wp_resolveSketchBoxSegments({
    dividers: existingDividers,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    woodThick,
    horizontalDividers: existingHorizontalDividers,
    boxCenterY: targetCenterY,
    innerH: targetInnerH,
    cursorY: yClamped,
    cursorX,
    yNorm: activeYNorm,
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
    horizontalDividers: existingHorizontalDividers,
    boxCenterY: targetCenterY,
    innerH: targetInnerH,
    cursorY: yClamped,
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
  const op: 'add' | 'remove' = hoveredDivider ? 'remove' : 'add';
  const dividerId = hoveredDivider ? hoveredDivider.dividerId : null;
  const dividerXNorm = hoveredDivider ? hoveredDivider.xNorm : dividerPlacement.xNorm;
  const dividerCenterX = hoveredDivider ? hoveredDivider.centerX : dividerPlacement.centerX;
  const dividerCentered = hoveredDivider
    ? Math.abs(hoveredDivider.centerX - targetGeo.centerX) <= 0.001
    : dividerPlacement.centered || snapToSegment;
  const dividerYNorm = hoveredDivider?.yNorm ?? (existingHorizontalDividers.length ? activeYNorm : null);
  const dividerRow =
    dividerYNorm != null && verticalSegments.length
      ? __wp_pickSketchBoxVerticalSegment({
          segments: verticalSegments,
          boxCenterY: targetCenterY,
          innerH: targetInnerH,
          yNorm: dividerYNorm,
        })
      : activeVerticalSegment;
  const dividerCenterY = dividerRow ? dividerRow.centerY : targetCenterY;
  const dividerPreviewH = Math.max(0.0001, dividerRow ? dividerRow.height : targetInnerH);
  const dividerPreviewW = hoveredDivider
    ? targetGeo.innerW
    : snapToSegment && activeSegment
      ? activeSegment.width
      : targetGeo.innerW;
  const clearanceMeasurements = buildSketchBoxDividerMeasurementEntries({
    dividers: existingDividers,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    woodThick,
    dividerCenterX,
    dividerCenterY,
    dividerHeight: dividerPreviewH,
    dividerCenterZ: dividerPreviewZ,
    dividerDepth: dividerPreviewD,
    resolveSketchBoxDividerPlacement: __wp_resolveSketchBoxDividerPlacement,
  });
  return writeManualLayoutSketchHoverPreview(ctx, {
    hoverRecord: createManualLayoutSketchBoxContentHoverRecord({
      host: createManualLayoutSketchHoverHost(ctx),
      contentKind: 'divider',
      boxId,
      freePlacement: false,
      op,
      dividerId,
      dividerXNorm,
      dividerYNorm,
      dividerAxis: 'vertical',
      snapToCenter: dividerCentered,
    }),
    preview: {
      kind: 'drawer_divider',
      dividerAxis: 'vertical',
      x: dividerCenterX,
      highlightX: hoveredDivider
        ? targetGeo.centerX
        : snapToSegment && activeSegment
          ? activeSegment.centerX
          : targetGeo.centerX,
      y: dividerCenterY,
      z: dividerPreviewZ,
      w: Math.max(0.0001, dividerPreviewW),
      h: dividerPreviewH,
      d: dividerPreviewD,
      woodThick,
      snapToCenter: dividerCentered,
      op,
      clearanceMeasurements,
    },
  });
}
