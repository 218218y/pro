import {
  INTERIOR_FITTINGS_DIMENSIONS,
  SKETCH_BOX_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  createSketchModuleShelfPreviewGeometry,
  findNearestSketchModuleShelf,
} from './canvas_picking_sketch_module_vertical_content.js';
import { buildSketchModuleStackAwareMeasurementEntries } from './canvas_picking_sketch_neighbor_measurements.js';
import {
  asRecord,
  createShelfRemoveHoverRecord,
  readRecordNumber,
  readRecordValue,
  type SketchModuleShelfRemovePreviewArgs,
  type SketchModuleShelfRemovePreviewState,
} from './canvas_picking_sketch_module_surface_preview_shared.js';

export function resolveSketchModuleShelfRemovePreview(
  args: SketchModuleShelfRemovePreviewArgs
): SketchModuleShelfRemovePreviewState {
  const {
    host,
    hitModuleKey,
    intersects,
    info,
    cfgRef,
    bottomY,
    topY,
    spanH,
    pad,
    shelves,
    variant,
    shelfDepthOverrideM,
    innerW,
    internalDepth,
    internalCenterX,
    backZ,
    woodThick,
    regularDepth,
    isDrawers,
    isCornerKey,
    removeEpsShelf,
  } = args;
  let op: 'add' | 'remove' = 'add';
  let variantPreview = variant;
  let nextShelfDepthOverrideM = shelfDepthOverrideM;
  let shelfRemoveKind: 'sketch' | 'base' | '' = '';
  let shelfRemoveIdx: number | null = null;
  let baseShelfIndex: number | null = null;
  let nextYClamped = args.yClamped;
  try {
    const shelfBoardHit = intersects.find(h => {
      const o = h && h.object ? h.object : null;
      const ud = o ? asRecord(o.userData) : null;
      if (!ud) return false;
      if (ud.__kind === 'shelf_pin' || ud.__kind === 'brace_seam') return false;
      return ud.partId === 'all_shelves' || ud.partId === 'corner_shelves';
    });
    const boardY = typeof shelfBoardHit?.point?.y === 'number' ? shelfBoardHit.point.y : null;
    const hitFromBoard = typeof boardY === 'number';
    const isCornerMk = isCornerKey(hitModuleKey);
    const shelfHitY = hitFromBoard ? boardY : isCornerMk ? nextYClamped : null;
    if (typeof shelfHitY === 'number') {
      if (shelves.length) {
        const shelfMatch = findNearestSketchModuleShelf({
          shelves,
          bottomY,
          totalHeight: spanH,
          pointerY: shelfHitY,
        });
        if (shelfMatch && shelfMatch.dy <= removeEpsShelf) {
          op = 'remove';
          shelfRemoveKind = 'sketch';
          shelfRemoveIdx = shelfMatch.index;
          nextYClamped = Math.max(bottomY + pad, Math.min(topY - pad, shelfMatch.yAbs));
          if (shelfMatch.variant) variantPreview = shelfMatch.variant;
          if (shelfMatch.depthM != null) nextShelfDepthOverrideM = shelfMatch.depthM;
        }
      }
      if (op !== 'remove' && cfgRef && typeof cfgRef === 'object') {
        const divisions =
          readRecordNumber(info, 'gridDivisions') ??
          INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault;
        if (divisions > 1) {
          const step = spanH / divisions;
          const rel = shelfHitY - bottomY;
          let shelfIndex = Math.round(rel / step);
          if (shelfIndex < 1) shelfIndex = 1;
          if (shelfIndex > divisions - 1) shelfIndex = divisions - 1;
          const targetY = bottomY + shelfIndex * step;
          const epsNoBoard = Math.min(
            SKETCH_BOX_DIMENSIONS.preview.shelfRemoveNoBoardToleranceMaxM,
            Math.max(
              SKETCH_BOX_DIMENSIONS.preview.shelfRemoveNoBoardToleranceMinM,
              step * SKETCH_BOX_DIMENSIONS.preview.shelfRemoveNoBoardToleranceStepRatio
            )
          );
          const eps = hitFromBoard
            ? SKETCH_BOX_DIMENSIONS.preview.shelfRemoveBoardToleranceM
            : isCornerMk && isDrawers
              ? Math.min(
                  SKETCH_BOX_DIMENSIONS.preview.shelfRemoveNoBoardToleranceMaxM,
                  epsNoBoard + SKETCH_BOX_DIMENSIONS.preview.shelfRemoveCornerDrawerToleranceExtraM
                )
              : epsNoBoard;
          if (Math.abs(shelfHitY - targetY) <= eps) {
            let exists = false;
            const isCustom = !!readRecordValue(cfgRef, 'isCustom');
            if (isCustom) {
              const cd = asRecord(readRecordValue(cfgRef, 'customData')) ?? {};
              const shelvesArr = Array.isArray(cd.shelves) ? cd.shelves : [];
              exists = !!shelvesArr[shelfIndex - 1];
            } else {
              const lt = String(readRecordValue(cfgRef, 'layout') || 'shelves');
              switch (lt) {
                case 'shelves':
                case 'mixed':
                  exists = true;
                  break;
                case 'hanging':
                case 'hanging_top2':
                case 'storage':
                case 'storage_shelf':
                  exists = shelfIndex === 4 || shelfIndex === 5;
                  break;
                case 'hanging_split':
                  exists = shelfIndex === 1 || shelfIndex === 5;
                  break;
                default:
                  exists = false;
              }
            }
            if (exists) {
              op = 'remove';
              shelfRemoveKind = 'base';
              baseShelfIndex = shelfIndex;
              nextYClamped = Math.max(bottomY + pad, Math.min(topY - pad, targetY));
              const braceShelves = readRecordValue(cfgRef, 'braceShelves');
              const isBraceExisting = Array.isArray(braceShelves) && braceShelves.indexOf(shelfIndex) >= 0;
              variantPreview = isBraceExisting ? 'brace' : 'double';
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }

  if (op === 'remove' && shelfRemoveKind) {
    const shelfPreview = createSketchModuleShelfPreviewGeometry({
      innerW,
      internalDepth,
      backZ,
      woodThick,
      regularDepth,
      variant: variantPreview,
      shelfDepthOverrideM: nextShelfDepthOverrideM,
    });
    const clearanceMeasurements = buildSketchModuleStackAwareMeasurementEntries({
      bottomY,
      topY,
      totalHeight: spanH,
      pad,
      woodThick,
      cfgRef,
      info,
      shelves,
      drawers: args.drawers,
      extDrawers: args.extDrawers,
      targetCenterX: internalCenterX,
      targetCenterY: nextYClamped,
      targetWidth: shelfPreview.w,
      targetHeight: shelfPreview.h,
      z:
        shelfPreview.z +
        shelfPreview.d / 2 +
        Math.max(
          SKETCH_BOX_DIMENSIONS.preview.measurementZOffsetMinM,
          shelfPreview.d * SKETCH_BOX_DIMENSIONS.preview.measurementZOffsetDepthRatio
        ),
      styleKey: 'cell',
      textScale: SKETCH_BOX_DIMENSIONS.preview.measurementTextScale,
    });
    return {
      handled: true,
      yClamped: nextYClamped,
      variantPreview,
      shelfDepthOverrideM: nextShelfDepthOverrideM,
      result: {
        handled: true,
        hoverRecord: createShelfRemoveHoverRecord({
          host,
          removeKind: shelfRemoveKind,
          removeIdx: shelfRemoveIdx,
          shelfIndex: baseShelfIndex,
        }),
        preview: {
          kind: 'shelf',
          variant: shelfPreview.variant,
          x: internalCenterX,
          y: nextYClamped,
          z: shelfPreview.z,
          w: shelfPreview.w,
          h: shelfPreview.h,
          d: shelfPreview.d,
          woodThick,
          op: 'remove',
          clearanceMeasurements,
        },
      },
    };
  }

  return {
    handled: false,
    yClamped: nextYClamped,
    variantPreview,
    shelfDepthOverrideM: nextShelfDepthOverrideM,
  };
}
