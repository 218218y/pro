import { MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  buildSketchBoxDividerMeasurementEntries,
  buildSketchBoxHorizontalDividerMeasurementEntries,
} from './canvas_picking_sketch_box_divider_measurements.js';
import type {
  FindNearestSketchBoxDividerArgs,
  FindNearestSketchBoxDividerResult,
  FindNearestSketchBoxHorizontalDividerArgs,
  FindNearestSketchBoxHorizontalDividerResult,
  PickSketchBoxSegmentArgs,
  PickSketchBoxVerticalSegmentArgs,
  ResolveSketchBoxSegmentsArgs,
  ResolveSketchBoxVerticalSegmentsArgs,
  SketchBoxDividerPlacementArgs,
  SketchBoxDividerPlacement,
  SketchBoxHorizontalDividerPlacementArgs,
  SketchBoxHorizontalDividerPlacement,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
  SketchBoxSegmentState,
  SketchBoxVerticalSegmentState,
} from './canvas_picking_sketch_box_dividers.js';
import type {
  SketchFreeBoxTarget,
  SketchFreeHoverHost,
  SketchFreeSurfacePreviewResult,
} from './canvas_picking_sketch_free_surface_preview_shared.js';

type DividerPreviewHelpers = {
  tool: string;
  host: SketchFreeHoverHost;
  target: SketchFreeBoxTarget;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  readSketchBoxHorizontalDividers: (box: unknown) => SketchBoxHorizontalDividerState[];
  resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
  pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentState | null;
  findNearestSketchBoxDivider: (
    args: FindNearestSketchBoxDividerArgs
  ) => FindNearestSketchBoxDividerResult | null;
  resolveSketchBoxDividerPlacement: (args: SketchBoxDividerPlacementArgs) => SketchBoxDividerPlacement;
  readSketchBoxDividerXNorm: (box: unknown) => number | null;
  resolveSketchBoxVerticalSegments: (
    args: ResolveSketchBoxVerticalSegmentsArgs
  ) => SketchBoxVerticalSegmentState[];
  pickSketchBoxVerticalSegment: (
    args: PickSketchBoxVerticalSegmentArgs
  ) => SketchBoxVerticalSegmentState | null;
  findNearestSketchBoxHorizontalDivider: (
    args: FindNearestSketchBoxHorizontalDividerArgs
  ) => FindNearestSketchBoxHorizontalDividerResult | null;
  resolveSketchBoxHorizontalDividerPlacement: (
    args: SketchBoxHorizontalDividerPlacementArgs
  ) => SketchBoxHorizontalDividerPlacement;
};

function resolveFrontPreviewDepth(target: SketchFreeBoxTarget): {
  depth: number;
  frontZ: number;
  centerZ: number;
} {
  const depth = Math.max(0.0001, target.targetGeo.innerD);
  const frontZ = target.targetGeo.innerBackZ + target.targetGeo.innerD;
  return { depth, frontZ, centerZ: frontZ - depth / 2 };
}

function resolveVerticalContext(args: DividerPreviewHelpers): {
  horizontalDividers: SketchBoxHorizontalDividerState[];
  activeVerticalSegment: SketchBoxVerticalSegmentState | null;
  dividerCenterY: number;
  dividerHeight: number;
  dividerYNorm: number | null;
} {
  const woodThick = MATERIAL_DIMENSIONS.wood.thicknessM;
  const horizontalDividers = args.readSketchBoxHorizontalDividers(args.target.targetBox);
  const hasHorizontalRows = horizontalDividers.length > 0;
  const verticalSegments = hasHorizontalRows
    ? args.resolveSketchBoxVerticalSegments({
        dividers: horizontalDividers,
        boxCenterY: args.target.targetCenterY,
        innerH: args.target.targetHeight,
        woodThick,
        verticalDividers: args.readSketchBoxDividers(args.target.targetBox),
        boxCenterX: args.target.targetGeo.centerX,
        innerW: args.target.targetGeo.innerW,
        cursorX: args.target.pointerX,
      })
    : [];
  const activeVerticalSegment = hasHorizontalRows
    ? args.pickSketchBoxVerticalSegment({
        segments: verticalSegments,
        boxCenterY: args.target.targetCenterY,
        innerH: args.target.targetHeight,
        cursorY: args.target.pointerY,
      })
    : null;
  if (activeVerticalSegment) {
    return {
      horizontalDividers,
      activeVerticalSegment,
      dividerCenterY: activeVerticalSegment.centerY,
      dividerHeight: Math.max(0.0001, activeVerticalSegment.height),
      dividerYNorm: activeVerticalSegment.yNorm,
    };
  }
  return {
    horizontalDividers,
    activeVerticalSegment: null,
    dividerCenterY: args.target.targetCenterY,
    dividerHeight: Math.max(0.0001, args.target.targetHeight - woodThick * 2),
    dividerYNorm: null,
  };
}

function resolveHorizontalDividerPreview(args: DividerPreviewHelpers): SketchFreeSurfacePreviewResult {
  const { tool, host, target } = args;
  const woodThick = MATERIAL_DIMENSIONS.wood.thicknessM;
  const existingDividers = args.readSketchBoxDividers(target.targetBox);
  const existingHorizontalDividers = args.readSketchBoxHorizontalDividers(target.targetBox);
  const columnSegments = args.resolveSketchBoxSegments({
    dividers: existingDividers,
    horizontalDividers: existingHorizontalDividers,
    boxCenterX: target.targetGeo.centerX,
    innerW: target.targetGeo.innerW,
    boxCenterY: target.targetCenterY,
    innerH: target.targetHeight,
    cursorX: target.pointerX,
    cursorY: target.pointerY,
    woodThick,
  });
  const activeColumnSegment = args.pickSketchBoxSegment({
    segments: columnSegments,
    boxCenterX: target.targetGeo.centerX,
    innerW: target.targetGeo.innerW,
    cursorX: target.pointerX,
  });
  const hoveredDivider = args.findNearestSketchBoxHorizontalDivider({
    dividers: existingHorizontalDividers,
    boxCenterY: target.targetCenterY,
    innerH: target.targetHeight,
    woodThick,
    cursorY: target.pointerY,
    verticalDividers: existingDividers,
    boxCenterX: target.targetGeo.centerX,
    innerW: target.targetGeo.innerW,
    cursorX: target.pointerX,
  });
  const placement = args.resolveSketchBoxHorizontalDividerPlacement({
    boxCenterY: target.targetCenterY,
    innerH: target.targetHeight,
    woodThick,
    cursorY: target.pointerY,
    dividerYNorm: null,
    enableCenterSnap: true,
  });
  const op: 'add' | 'remove' = hoveredDivider ? 'remove' : 'add';
  const dividerId = hoveredDivider ? hoveredDivider.dividerId : null;
  const dividerYNorm = hoveredDivider ? hoveredDivider.yNorm : placement.yNorm;
  const dividerXNorm =
    hoveredDivider?.xNorm ??
    (existingDividers.length && activeColumnSegment ? activeColumnSegment.xNorm : null);
  const dividerY = hoveredDivider ? hoveredDivider.centerY : placement.centerY;
  const snapToCenter = hoveredDivider ? hoveredDivider.centered : placement.centered;
  const dividerCenterX =
    dividerXNorm != null && activeColumnSegment ? activeColumnSegment.centerX : target.targetGeo.centerX;
  const dividerWidth =
    dividerXNorm != null && activeColumnSegment ? activeColumnSegment.width : target.targetGeo.innerW;
  const z = resolveFrontPreviewDepth(target);
  const clearanceMeasurements = buildSketchBoxHorizontalDividerMeasurementEntries({
    dividers: existingHorizontalDividers,
    boxCenterY: target.targetCenterY,
    innerH: target.targetHeight,
    woodThick,
    dividerCenterX,
    dividerWidth,
    dividerCenterY: dividerY,
    dividerCenterZ: z.centerZ,
    dividerDepth: z.depth,
    resolveSketchBoxHorizontalDividerPlacement: args.resolveSketchBoxHorizontalDividerPlacement,
  });

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
      boxId: target.boxId,
      freePlacement: true,
      op,
      dividerId,
      dividerYNorm,
      dividerXNorm,
      dividerAxis: 'horizontal',
      dividerFrontZ: z.frontZ,
      snapToCenter,
    },
    preview: {
      kind: 'drawer_divider',
      dividerAxis: 'horizontal',
      x: dividerCenterX,
      y: dividerY,
      highlightY: hoveredDivider ? target.targetCenterY : dividerY,
      z: z.centerZ,
      w: dividerWidth,
      h: woodThick,
      d: z.depth,
      woodThick,
      snapToCenter,
      op,
      clearanceMeasurements,
    },
  };
}

function resolveVerticalDividerPreview(args: DividerPreviewHelpers): SketchFreeSurfacePreviewResult {
  const { tool, host, target } = args;
  const woodThick = MATERIAL_DIMENSIONS.wood.thicknessM;
  const existingDividers = args.readSketchBoxDividers(target.targetBox);
  const row = resolveVerticalContext(args);
  const segments = args.resolveSketchBoxSegments({
    dividers: existingDividers,
    horizontalDividers: row.horizontalDividers,
    boxCenterX: target.targetGeo.centerX,
    innerW: target.targetGeo.innerW,
    boxCenterY: target.targetCenterY,
    innerH: target.targetHeight,
    cursorY: target.pointerY,
    cursorX: target.pointerX,
    woodThick,
  });
  const activeSegment = args.pickSketchBoxSegment({
    segments,
    boxCenterX: target.targetGeo.centerX,
    innerW: target.targetGeo.innerW,
    cursorX: target.pointerX,
  });
  const hoveredDivider = args.findNearestSketchBoxDivider({
    dividers: existingDividers,
    horizontalDividers: row.horizontalDividers,
    boxCenterX: target.targetGeo.centerX,
    innerW: target.targetGeo.innerW,
    boxCenterY: target.targetCenterY,
    innerH: target.targetHeight,
    cursorY: target.pointerY,
    woodThick,
    cursorX: target.pointerX,
  });
  const freePlacement = args.resolveSketchBoxDividerPlacement({
    boxCenterX: target.targetGeo.centerX,
    innerW: target.targetGeo.innerW,
    woodThick,
    cursorX: target.pointerX,
    dividerXNorm: args.readSketchBoxDividerXNorm(target.targetBox),
    enableCenterSnap: true,
  });
  const segmentSnapEps = activeSegment
    ? Math.min(0.035, Math.max(0.012, Number(activeSegment.width) * 0.07))
    : 0;
  const snapToSegment =
    !!activeSegment && Math.abs(target.pointerX - Number(activeSegment.centerX)) <= segmentSnapEps;
  const placement =
    snapToSegment && activeSegment
      ? {
          xNorm: activeSegment.xNorm,
          centerX: activeSegment.centerX,
          centered: Math.abs(activeSegment.centerX - target.targetGeo.centerX) <= 0.001,
        }
      : freePlacement;
  const op: 'add' | 'remove' = hoveredDivider ? 'remove' : 'add';
  const dividerId = hoveredDivider ? hoveredDivider.dividerId : null;
  const dividerXNorm = hoveredDivider ? hoveredDivider.xNorm : placement.xNorm;
  const dividerYNorm = hoveredDivider?.yNorm ?? row.dividerYNorm;
  const dividerX = hoveredDivider ? hoveredDivider.centerX : placement.centerX;
  const snapToCenter = hoveredDivider ? hoveredDivider.centered : placement.centered || snapToSegment;
  const dividerHighlightX = hoveredDivider
    ? target.targetGeo.centerX
    : snapToSegment && activeSegment
      ? activeSegment.centerX
      : target.targetGeo.centerX;
  const dividerPreviewW = hoveredDivider
    ? target.targetGeo.innerW
    : snapToSegment && activeSegment
      ? activeSegment.width
      : target.targetGeo.innerW;
  const z = resolveFrontPreviewDepth(target);
  const clearanceMeasurements = buildSketchBoxDividerMeasurementEntries({
    dividers: existingDividers,
    boxCenterX: target.targetGeo.centerX,
    innerW: target.targetGeo.innerW,
    woodThick,
    dividerCenterX: dividerX,
    dividerCenterY: row.dividerCenterY,
    dividerHeight: row.dividerHeight,
    dividerCenterZ: z.centerZ,
    dividerDepth: z.depth,
    resolveSketchBoxDividerPlacement: args.resolveSketchBoxDividerPlacement,
  });

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
      boxId: target.boxId,
      freePlacement: true,
      op,
      dividerId,
      dividerXNorm,
      dividerYNorm,
      dividerAxis: 'vertical',
      dividerFrontZ: z.frontZ,
      snapToCenter,
    },
    preview: {
      kind: 'drawer_divider',
      dividerAxis: 'vertical',
      x: dividerX,
      highlightX: dividerHighlightX,
      y: row.dividerCenterY,
      z: z.centerZ,
      w: dividerPreviewW,
      h: row.dividerHeight,
      d: z.depth,
      woodThick,
      snapToCenter,
      op,
      clearanceMeasurements,
    },
  };
}

export function resolveSketchFreeSurfaceDividerPreview(
  args: DividerPreviewHelpers
): SketchFreeSurfacePreviewResult {
  if (args.tool === 'sketch_box_divider_horizontal') return resolveHorizontalDividerPreview(args);
  return resolveVerticalDividerPreview(args);
}
