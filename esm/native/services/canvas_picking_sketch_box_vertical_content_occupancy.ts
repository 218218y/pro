import {
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
  SKETCH_BOX_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { createManualLayoutSketchBoxContentHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import {
  buildSketchBoxVerticalContentBlockers,
  type SketchBoxVerticalContentBlocker,
  type SketchBoxVerticalContentKind,
} from './canvas_picking_sketch_box_vertical_content_blockers.js';
import type {
  ResolveSketchBoxVerticalContentPreviewArgs,
  ResolveSketchBoxVerticalContentPreviewResult,
  SketchBoxSegmentLike,
} from './canvas_picking_sketch_box_vertical_content_preview_contracts.js';
import { readFiniteSegmentNumber } from './canvas_picking_sketch_box_vertical_content_preview_records.js';
import type { SketchBoxVerticalPreviewState } from './canvas_picking_sketch_box_vertical_content_preview_state.js';

const TOUCH_EPSILON_M = 1e-9;

function asContentKindSet(kinds: readonly SketchBoxVerticalContentKind[]): Set<string> {
  return new Set(kinds.map(kind => String(kind)));
}

function rangeDistanceFromY(range: SketchBoxVerticalContentBlocker, y: number): number {
  if (y >= range.minY && y <= range.maxY) return 0;
  return Math.min(Math.abs(y - range.minY), Math.abs(y - range.maxY));
}

function removalToleranceForKind(kind: SketchBoxVerticalContentKind, requestedToleranceM: number): number {
  if (kind === 'storage') {
    return Math.max(requestedToleranceM, SKETCH_BOX_DIMENSIONS.preview.removeEpsBoxM);
  }
  return Math.max(requestedToleranceM, SKETCH_BOX_DIMENSIONS.preview.removeEpsShelfM);
}

function rangesOverlap(args: {
  centerY: number;
  heightM: number;
  blocker: SketchBoxVerticalContentBlocker;
}): boolean {
  const half = args.heightM / 2;
  const minY = args.centerY - half;
  const maxY = args.centerY + half;
  return maxY > args.blocker.minY + TOUCH_EPSILON_M && minY < args.blocker.maxY - TOUCH_EPSILON_M;
}

export function buildSketchBoxVerticalPreviewBlockers(
  args: ResolveSketchBoxVerticalContentPreviewArgs,
  state: SketchBoxVerticalPreviewState
): SketchBoxVerticalContentBlocker[] {
  return buildSketchBoxVerticalContentBlockers({
    targetBox: args.targetBox,
    targetGeo: args.targetGeo,
    targetCenterY: args.targetCenterY,
    targetHeight: args.targetHeight,
    woodThick: args.woodThick,
    boxSegments: state.boxSegments,
    activeSegment: state.activeSegment,
    verticalSegments: state.verticalSegments,
    activeVerticalSegment: state.activeVerticalSegment,
    pickSketchBoxSegment: args.pickSketchBoxSegment,
    pickSketchBoxVerticalSegment: args.pickSketchBoxVerticalSegment,
  });
}

export function findSketchBoxVerticalRemovalBlocker(args: {
  blockers: readonly SketchBoxVerticalContentBlocker[];
  pointerY: number;
  allowedKinds: readonly SketchBoxVerticalContentKind[];
  toleranceM?: number | null;
}): SketchBoxVerticalContentBlocker | null {
  const allowed = asContentKindSet(args.allowedKinds);
  let best: SketchBoxVerticalContentBlocker | null = null;
  let bestDistance = Infinity;
  for (const blocker of args.blockers) {
    if (!allowed.has(blocker.kind)) continue;
    const distance = rangeDistanceFromY(blocker, args.pointerY);
    const tolerance = removalToleranceForKind(
      blocker.kind,
      typeof args.toleranceM === 'number' && Number.isFinite(args.toleranceM) ? args.toleranceM : 0
    );
    if (distance > tolerance) continue;
    if (
      distance < bestDistance ||
      (distance === bestDistance &&
        Math.abs(args.pointerY - Number(blocker.centerY ?? (blocker.minY + blocker.maxY) / 2)) <
          Math.abs(args.pointerY - Number(best?.centerY ?? 0)))
    ) {
      best = blocker;
      bestDistance = distance;
    }
  }
  return best;
}

export function doesSketchBoxVerticalCandidateCollide(args: {
  blockers: readonly SketchBoxVerticalContentBlocker[];
  centerY: number;
  heightM: number;
  blockerKinds: readonly SketchBoxVerticalContentKind[];
}): boolean {
  const blockerKinds = asContentKindSet(args.blockerKinds);
  return args.blockers.some(
    blocker =>
      blockerKinds.has(blocker.kind) &&
      rangesOverlap({ centerY: args.centerY, heightM: args.heightM, blocker })
  );
}

function segmentForBlocker(args: {
  blocker: SketchBoxVerticalContentBlocker;
  state: SketchBoxVerticalPreviewState;
  previewSegment: SketchBoxSegmentLike | null;
  resolveSegment: ResolveSketchBoxVerticalContentPreviewArgs['pickSketchBoxSegment'];
}): SketchBoxSegmentLike | null {
  if (args.blocker.xNorm != null && args.state.boxSegments.length) {
    return args.resolveSegment({
      segments: args.state.boxSegments,
      boxCenterX: args.state.targetGeo.centerX,
      innerW: args.state.targetGeo.innerW,
      xNorm: args.blocker.xNorm,
    });
  }
  return args.previewSegment || args.state.activeSegment;
}

export function resolveSketchBoxVerticalRemovalPreview(args: {
  previewArgs: ResolveSketchBoxVerticalContentPreviewArgs;
  state: SketchBoxVerticalPreviewState;
  blocker: SketchBoxVerticalContentBlocker;
  previewSegment?: SketchBoxSegmentLike | null;
}): ResolveSketchBoxVerticalContentPreviewResult {
  const { previewArgs, state, blocker } = args;
  const segment = segmentForBlocker({
    blocker,
    state,
    previewSegment: args.previewSegment ?? null,
    resolveSegment: previewArgs.pickSketchBoxSegment,
  });
  const centerY = Number(blocker.centerY ?? (blocker.minY + blocker.maxY) / 2);
  const contentXNorm = readFiniteSegmentNumber(segment, 'xNorm') ?? blocker.xNorm ?? 0.5;
  const removeId = blocker.id != null ? String(blocker.id) : null;
  const removeIdx =
    typeof blocker.index === 'number' && Number.isFinite(blocker.index) ? blocker.index : null;
  const hoverRecord = createManualLayoutSketchBoxContentHoverRecord({
    host: previewArgs.host,
    contentKind: blocker.kind,
    boxId: previewArgs.boxId,
    freePlacement: previewArgs.freePlacement,
    op: 'remove',
    boxYNorm: state.boxYNormFromCenter(centerY),
    contentXNorm,
    removeId,
    removeIdx,
    heightM: blocker.heightM,
  });
  const previewDims = SKETCH_BOX_DIMENSIONS.preview;
  const centerX = readFiniteSegmentNumber(segment, 'centerX') ?? state.targetGeo.centerX;
  const width = readFiniteSegmentNumber(segment, 'width') ?? state.targetGeo.innerW;

  if (blocker.kind === 'rod') {
    return {
      hoverRecord,
      preview: {
        kind: 'rod',
        x: centerX,
        y: centerY,
        z: state.targetGeo.innerBackZ + state.targetGeo.innerD / 2,
        w: Math.max(previewDims.rodMinLengthM, width - previewDims.rodWidthClearanceM),
        h: previewDims.rodPreviewHeightM,
        d: previewDims.rodPreviewDepthM,
        woodThick: previewArgs.woodThick,
        op: 'remove',
      },
    };
  }

  if (blocker.kind === 'storage') {
    const storageDims = INTERIOR_FITTINGS_DIMENSIONS.storage;
    const barrierHeight = blocker.heightM ?? Math.max(0, blocker.maxY - blocker.minY);
    const barrierZ = Math.max(
      state.targetGeo.innerBackZ + previewDims.storageBarrierBackInsetM,
      state.targetGeo.innerBackZ +
        state.targetGeo.innerD -
        Math.min(
          previewDims.storageBarrierDepthClearanceMaxM,
          Math.max(
            previewDims.storageBarrierDepthClearanceMinM,
            state.targetGeo.innerD * previewDims.storageBarrierDepthClearanceRatio
          )
        )
    );
    return {
      hoverRecord,
      preview: {
        kind: 'storage',
        x: centerX,
        y: centerY,
        z: barrierZ,
        w: Math.max(previewDims.shelfMinWidthM, width - storageDims.barrierWidthClearanceM),
        h: barrierHeight,
        d: Math.max(storageDims.previewThicknessMinM, previewArgs.woodThick),
        woodThick: previewArgs.woodThick,
        op: 'remove',
      },
    };
  }

  const variant = typeof blocker.variant === 'string' && blocker.variant ? blocker.variant : 'regular';
  const isBrace = variant === 'brace';
  const shelfDepth =
    blocker.depthM != null && Number.isFinite(blocker.depthM) && blocker.depthM > 0
      ? Math.min(state.targetGeo.innerD, Math.max(previewArgs.woodThick, blocker.depthM))
      : isBrace
        ? state.targetGeo.innerD
        : Math.min(state.targetGeo.innerD, INTERIOR_FITTINGS_DIMENSIONS.shelves.regularDepthM);
  const shelfHeight =
    blocker.heightM ??
    (variant === 'glass'
      ? MATERIAL_DIMENSIONS.glassShelf.thicknessM
      : variant === 'double'
        ? Math.max(previewArgs.woodThick, previewArgs.woodThick * 2)
        : previewArgs.woodThick);
  return {
    hoverRecord,
    preview: {
      kind: 'shelf',
      variant,
      x: centerX,
      y: centerY,
      z: state.targetGeo.innerBackZ + shelfDepth / 2,
      w: Math.max(
        previewDims.shelfMinWidthM,
        width - (isBrace ? previewDims.shelfBraceClearanceM : previewDims.shelfRegularClearanceM)
      ),
      h: shelfHeight,
      d: shelfDepth,
      woodThick: previewArgs.woodThick,
      op: 'remove',
    },
  };
}
