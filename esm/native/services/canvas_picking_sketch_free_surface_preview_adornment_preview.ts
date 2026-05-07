import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';
import { readBaseLegOptions } from '../features/base_leg_support.js';
import { MATERIAL_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { resolveSketchBoxVisibleFrontOverlay } from './canvas_picking_manual_layout_sketch_front_overlay.js';
import {
  getSketchBoxAdornmentBaseHeight,
  normalizeSketchBoxBaseType,
  normalizeSketchBoxCorniceType,
  parseSketchBoxBaseTool,
  parseSketchBoxBaseToolSpec,
  parseSketchBoxCorniceTool,
  readRecordValue,
  type SelectorLocalBox,
  type SketchFreeBoxTarget,
  type SketchFreeHoverHost,
  type SketchFreeSurfacePreviewResult,
} from './canvas_picking_sketch_free_surface_preview_shared.js';

export function resolveSketchFreeSurfaceAdornmentPreview(args: {
  tool: string;
  contentKind: 'cornice' | 'base';
  host: SketchFreeHoverHost;
  target: SketchFreeBoxTarget;
  wardrobeBox: SelectorLocalBox;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  resolveSketchBoxSegments: (args: {
    dividers: SketchBoxDividerState[];
    boxCenterX: number;
    innerW: number;
    woodThick: number;
  }) => SketchBoxSegmentState[];
}): SketchFreeSurfacePreviewResult {
  const { tool, contentKind, host, target, wardrobeBox, readSketchBoxDividers, resolveSketchBoxSegments } =
    args;
  const { boxId, targetBox, targetGeo, targetCenterY, targetHeight } = target;

  if (contentKind === 'cornice') {
    const selectedCornice = parseSketchBoxCorniceTool(tool) || 'classic';
    const currentCorniceEnabled = readRecordValue(targetBox, 'hasCornice') === true;
    const currentCorniceType = normalizeSketchBoxCorniceType(readRecordValue(targetBox, 'corniceType'));
    const op: 'add' | 'remove' =
      currentCorniceEnabled && currentCorniceType === selectedCornice ? 'remove' : 'add';
    return {
      hoverRecord: {
        ts: Date.now(),
        tool,
        moduleKey: host.moduleKey,
        isBottom: host.isBottom,
        hostModuleKey: host.moduleKey,
        hostIsBottom: host.isBottom,
        kind: 'box_content',
        contentKind: 'cornice',
        boxId,
        freePlacement: true,
        op,
        corniceType: selectedCornice,
      },
      preview: {
        kind: 'storage',
        x: targetGeo.centerX,
        y: targetCenterY + targetHeight / 2 + SKETCH_BOX_DIMENSIONS.preview.adornmentCorniceYOffsetM,
        z: targetGeo.centerZ + targetGeo.outerD / 2 - SKETCH_BOX_DIMENSIONS.preview.adornmentCorniceZInsetM,
        w: Math.max(
          SKETCH_BOX_DIMENSIONS.preview.doorMinDimensionM,
          targetGeo.outerW + SKETCH_BOX_DIMENSIONS.preview.adornmentCorniceWidthExtraM
        ),
        h: SKETCH_BOX_DIMENSIONS.preview.adornmentCorniceHeightM,
        d: SKETCH_BOX_DIMENSIONS.preview.adornmentCorniceDepthM,
        woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
        op,
      },
    };
  }

  const selectedBaseSpec = parseSketchBoxBaseToolSpec(tool);
  const selectedBase = selectedBaseSpec?.baseType || parseSketchBoxBaseTool(tool) || 'plinth';
  const selectedLegOptions = readBaseLegOptions({
    baseLegStyle: selectedBaseSpec?.baseLegStyle,
    baseLegColor: selectedBaseSpec?.baseLegColor,
    baseLegHeightCm: selectedBaseSpec?.baseLegHeightCm,
    baseLegWidthCm: selectedBaseSpec?.baseLegWidthCm,
  });
  const currentLegOptions = readBaseLegOptions(targetBox);
  const currentBase = normalizeSketchBoxBaseType(readRecordValue(targetBox, 'baseType'));
  const hasVisibleBase = currentBase !== 'none';
  const sameLegOptions =
    currentLegOptions.style === selectedLegOptions.style &&
    currentLegOptions.color === selectedLegOptions.color &&
    currentLegOptions.heightCm === selectedLegOptions.heightCm &&
    currentLegOptions.widthCm === selectedLegOptions.widthCm;
  const op: 'add' | 'remove' =
    selectedBase === 'none'
      ? hasVisibleBase
        ? 'remove'
        : 'add'
      : hasVisibleBase && currentBase === selectedBase && (selectedBase !== 'legs' || sameLegOptions)
        ? 'remove'
        : 'add';
  const wardrobeFloorY = Number(wardrobeBox.centerY) - Number(wardrobeBox.height) / 2;
  const previewH =
    selectedBase === 'none'
      ? getSketchBoxAdornmentBaseHeight(currentBase, readRecordValue(targetBox, 'baseLegHeightCm')) ||
        SKETCH_BOX_DIMENSIONS.preview.adornmentBaseDefaultHeightM
      : getSketchBoxAdornmentBaseHeight(selectedBase, selectedLegOptions.heightCm);
  const actualCenterY = targetCenterY - targetHeight / 2 - previewH / 2;
  const visibleCenterY =
    actualCenterY < wardrobeFloorY + previewH / 2
      ? targetCenterY - targetHeight / 2 + previewH / 2
      : actualCenterY;
  const segments = resolveSketchBoxSegments({
    dividers: readSketchBoxDividers(targetBox),
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
  });
  const frontOverlay = resolveSketchBoxVisibleFrontOverlay({
    box: targetBox,
    boxCenterY: targetCenterY,
    boxHeight: targetHeight,
    woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
    geo: targetGeo,
    segments,
    fullWidth: true,
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
      contentKind: 'base',
      boxId,
      freePlacement: true,
      op,
      baseType: selectedBase,
      baseLegStyle: selectedLegOptions.style,
      baseLegColor: selectedLegOptions.color,
      baseLegHeightCm: selectedLegOptions.heightCm,
      baseLegWidthCm: selectedLegOptions.widthCm,
    },
    preview: {
      kind: 'storage',
      x: targetGeo.centerX,
      y: visibleCenterY,
      z:
        targetGeo.centerZ +
        Math.min(
          SKETCH_BOX_DIMENSIONS.preview.adornmentBaseZInsetMaxM,
          targetGeo.outerD * SKETCH_BOX_DIMENSIONS.preview.adornmentBaseZInsetDepthRatio
        ),
      w: Math.max(
        SKETCH_BOX_DIMENSIONS.preview.doorMinDimensionM,
        selectedBase === 'legs'
          ? targetGeo.outerW - SKETCH_BOX_DIMENSIONS.preview.adornmentBaseLegWidthClearanceM
          : targetGeo.outerW - SKETCH_BOX_DIMENSIONS.preview.adornmentBaseWidthClearanceM
      ),
      h: previewH,
      d: Math.max(
        SKETCH_BOX_DIMENSIONS.preview.adornmentBaseDepthMinM,
        selectedBase === 'legs'
          ? SKETCH_BOX_DIMENSIONS.preview.adornmentBaseLegDepthM
          : targetGeo.outerD - SKETCH_BOX_DIMENSIONS.preview.adornmentBaseDepthClearanceM
      ),
      woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
      op,
      frontOverlayX: frontOverlay ? frontOverlay.x : undefined,
      frontOverlayY: frontOverlay ? frontOverlay.y : undefined,
      frontOverlayZ: frontOverlay ? frontOverlay.z : undefined,
      frontOverlayW: frontOverlay ? frontOverlay.w : undefined,
      frontOverlayH: frontOverlay ? frontOverlay.h : undefined,
      frontOverlayThickness: frontOverlay ? frontOverlay.d : undefined,
    },
  };
}
