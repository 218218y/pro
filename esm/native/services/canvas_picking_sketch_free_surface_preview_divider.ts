import { MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';
import type {
  SketchFreeBoxTarget,
  SketchFreeHoverHost,
  SketchFreeSurfacePreviewResult,
} from './canvas_picking_sketch_free_surface_preview_shared.js';

export function resolveSketchFreeSurfaceDividerPreview(args: {
  tool: string;
  host: SketchFreeHoverHost;
  target: SketchFreeBoxTarget;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  resolveSketchBoxSegments: (args: {
    dividers: SketchBoxDividerState[];
    boxCenterX: number;
    innerW: number;
    woodThick: number;
  }) => SketchBoxSegmentState[];
  pickSketchBoxSegment: (args: {
    segments: SketchBoxSegmentState[];
    boxCenterX: number;
    innerW: number;
    cursorX: number;
  }) => SketchBoxSegmentState | null;
  findNearestSketchBoxDivider: (args: {
    dividers: SketchBoxDividerState[];
    boxCenterX: number;
    innerW: number;
    woodThick: number;
    cursorX: number;
  }) => { dividerId: string; xNorm: number; centerX: number; centered: boolean } | null;
  resolveSketchBoxDividerPlacement: (args: {
    boxCenterX: number;
    innerW: number;
    woodThick: number;
    cursorX: number;
    dividerXNorm: number | null;
    enableCenterSnap: boolean;
  }) => { xNorm: number; centerX: number; centered: boolean };
  readSketchBoxDividerXNorm: (box: unknown) => number | null;
}): SketchFreeSurfacePreviewResult {
  const {
    tool,
    host,
    target,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
  } = args;
  const { boxId, targetBox, targetGeo, targetCenterY, targetHeight, pointerX } = target;
  const existingDividers = readSketchBoxDividers(targetBox);
  const segments = resolveSketchBoxSegments({
    dividers: existingDividers,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
  });
  const activeSegment = pickSketchBoxSegment({
    segments,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    cursorX: pointerX,
  });
  const hoveredDivider = findNearestSketchBoxDivider({
    dividers: existingDividers,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
    cursorX: pointerX,
  });
  const freePlacement = resolveSketchBoxDividerPlacement({
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
    cursorX: pointerX,
    dividerXNorm: readSketchBoxDividerXNorm(targetBox),
    enableCenterSnap: true,
  });
  const segmentSnapEps = activeSegment
    ? Math.min(0.035, Math.max(0.012, Number(activeSegment.width) * 0.07))
    : 0;
  const snapToSegment =
    !!activeSegment && Math.abs(pointerX - Number(activeSegment.centerX)) <= segmentSnapEps;
  const placement =
    snapToSegment && activeSegment
      ? {
          xNorm: activeSegment.xNorm,
          centerX: activeSegment.centerX,
          centered: Math.abs(activeSegment.centerX - targetGeo.centerX) <= 0.001,
        }
      : freePlacement;
  const op: 'add' | 'remove' = hoveredDivider ? 'remove' : 'add';
  const dividerId = hoveredDivider ? hoveredDivider.dividerId : null;
  const dividerXNorm = hoveredDivider ? hoveredDivider.xNorm : placement.xNorm;
  const dividerX = hoveredDivider ? hoveredDivider.centerX : placement.centerX;
  const snapToCenter = hoveredDivider ? hoveredDivider.centered : placement.centered || snapToSegment;
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
  return {
    hoverRecord: {
      ts: Date.now(),
      tool,
      moduleKey: host.moduleKey,
      isBottom: host.isBottom,
      hostModuleKey: host.moduleKey,
      hostIsBottom: host.isBottom,
      kind: 'box_content',
      contentKind: 'divider',
      boxId,
      freePlacement: true,
      op,
      dividerId,
      dividerXNorm,
      snapToCenter,
    },
    preview: {
      kind: 'drawer_divider',
      x: dividerX,
      highlightX: dividerHighlightX,
      y: targetCenterY,
      z: targetGeo.innerBackZ + targetGeo.innerD / 2,
      w: dividerPreviewW,
      h: Math.max(0.0001, targetHeight - 0.036),
      d: targetGeo.innerD,
      woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
      snapToCenter,
      op,
    },
  };
}
