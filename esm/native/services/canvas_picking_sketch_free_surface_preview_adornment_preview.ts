import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';
import { readBaseLegOptions } from '../features/base_leg_support.js';
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
        y: targetCenterY + targetHeight / 2 + 0.035,
        z: targetGeo.centerZ + targetGeo.outerD / 2 - 0.012,
        w: Math.max(0.05, targetGeo.outerW + 0.02),
        h: 0.07,
        d: 0.03,
        woodThick: 0.018,
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
      ? getSketchBoxAdornmentBaseHeight(currentBase, readRecordValue(targetBox, 'baseLegHeightCm')) || 0.08
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
    woodThick: 0.018,
  });
  const frontOverlay = resolveSketchBoxVisibleFrontOverlay({
    box: targetBox,
    boxCenterY: targetCenterY,
    boxHeight: targetHeight,
    woodThick: 0.018,
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
      z: targetGeo.centerZ + Math.min(0.02, targetGeo.outerD * 0.15),
      w: Math.max(0.05, selectedBase === 'legs' ? targetGeo.outerW - 0.08 : targetGeo.outerW - 0.04),
      h: previewH,
      d: Math.max(0.018, selectedBase === 'legs' ? 0.04 : targetGeo.outerD - 0.05),
      woodThick: 0.018,
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
