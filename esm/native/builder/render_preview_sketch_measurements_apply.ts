import type { AppContainer } from '../../../types';
import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getDimLabelEntry } from './render_ops_extras_dimensions.js';
import type { PreviewGroupLike, SketchPlacementPreviewArgs } from './render_preview_ops_contracts.js';
import type { RenderPreviewSketchShared } from './render_preview_sketch_shared.js';
import {
  mapMeasurementPointToSurface,
  normalizeMeasurementSurfacePlane,
  readMeasurementNumber,
  readMeasurementEntries,
  resolveMeasurementLabelFaceSign,
} from './render_preview_sketch_measurements_input.js';
import {
  ensureMeasurementLabelMaterial,
  orientMeasurementLabelForFace,
  orientMeasurementLabelForSurface,
} from './render_preview_sketch_measurements_labels.js';
import {
  asMeasurementTHREE,
  ensureMeasurementGroup,
  ensureMeasurementLineMaterial,
  ensureMeasurementSlot,
  hideSketchPlacementMeasurements,
  setMeasurementObjectVisible,
} from './render_preview_sketch_measurements_state.js';

export function applySketchPlacementMeasurements(args: {
  App: AppContainer;
  input: SketchPlacementPreviewArgs;
  THREE: unknown;
  g: PreviewGroupLike;
  shared: RenderPreviewSketchShared;
}): void {
  const { App, input, g, shared } = args;
  const THREE = asMeasurementTHREE(args.THREE);
  const measurementEntries = readMeasurementEntries(input);
  if (!THREE || !measurementEntries.length) {
    hideSketchPlacementMeasurements(g, shared);
    return;
  }

  const { userData, measurementGroup } = ensureMeasurementGroup(g, THREE, shared);
  const slots = userData.__measurementSlots || [];
  measurementGroup.visible = true;

  let used = 0;
  for (let i = 0; i < measurementEntries.length; i += 1) {
    const entry = measurementEntries[i];
    const startX = readMeasurementNumber(entry.startX);
    const startY = readMeasurementNumber(entry.startY);
    const endX = readMeasurementNumber(entry.endX);
    const endY = readMeasurementNumber(entry.endY);
    const label = typeof entry.label === 'string' ? entry.label.trim() : '';
    if (startX == null || startY == null || endX == null || endY == null || !label) continue;

    const z = readMeasurementNumber(entry.z) ?? 0;
    const styleKey =
      entry.styleKey === 'cell'
        ? 'cell'
        : entry.styleKey === 'neighbor'
          ? 'neighbor'
          : entry.styleKey === 'center'
            ? 'center'
            : 'default';
    const lineMaterial = ensureMeasurementLineMaterial(userData, styleKey, THREE, shared);
    const slot = ensureMeasurementSlot({
      slots,
      index: used,
      measurementGroup,
      lineMaterial,
      THREE,
      shared,
    });
    used += 1;

    const surfacePlane = normalizeMeasurementSurfacePlane(entry.surfacePlane ?? input.surfacePlane);
    const startPoint = mapMeasurementPointToSurface({ plane: surfacePlane, x: startX, y: startY, z });
    const endPoint = mapMeasurementPointToSurface({ plane: surfacePlane, x: endX, y: endY, z });
    const points = [
      new THREE.Vector3(startPoint.x, startPoint.y, startPoint.z),
      new THREE.Vector3(endPoint.x, endPoint.y, endPoint.z),
    ];
    const geometry = slot.line.geometry as { setFromPoints?: (points: unknown[]) => unknown } | null;
    if (geometry && typeof geometry.setFromPoints === 'function') {
      const nextGeometry = geometry.setFromPoints(points);
      if (nextGeometry) slot.line.geometry = nextGeometry;
    } else {
      const replacement = new THREE.BufferGeometry();
      const nextGeometry = replacement.setFromPoints?.(points);
      slot.line.geometry = nextGeometry || replacement;
    }
    slot.line.material = lineMaterial;
    slot.line.visible = true;
    slot.line.renderOrder = 10031;

    const dimEntry = getDimLabelEntry(label, { App }, styleKey);
    slot.label.material = ensureMeasurementLabelMaterial(
      userData,
      `${styleKey}:${label}`,
      dimEntry.texture,
      THREE,
      shared
    );
    slot.label.visible = true;
    slot.label.renderOrder = 10032;
    const labelX = readMeasurementNumber(entry.labelX) ?? (startX + endX) / 2;
    const labelY = readMeasurementNumber(entry.labelY) ?? (startY + endY) / 2;
    const labelFaceSign = resolveMeasurementLabelFaceSign(entry, input, z);
    const labelZ =
      z +
      (labelFaceSign >= 0
        ? SKETCH_BOX_DIMENSIONS.preview.measurementLabelZOffsetM
        : -SKETCH_BOX_DIMENSIONS.preview.measurementLabelZOffsetM);
    const labelPoint = mapMeasurementPointToSurface({ plane: surfacePlane, x: labelX, y: labelY, z: labelZ });
    slot.label.position?.set?.(labelPoint.x, labelPoint.y, labelPoint.z);
    orientMeasurementLabelForFace(slot.label, labelFaceSign);
    if (surfacePlane !== 'xy') orientMeasurementLabelForSurface(slot.label, surfacePlane, labelFaceSign);

    const textScale = Math.max(
      SKETCH_BOX_DIMENSIONS.preview.measurementTextScaleMin,
      readMeasurementNumber(entry.textScale) ?? SKETCH_BOX_DIMENSIONS.preview.measurementTextScaleDefault
    );
    if (styleKey === 'cell' || styleKey === 'center') {
      slot.label.scale?.set?.(
        SKETCH_BOX_DIMENSIONS.preview.measurementScaleCellX * textScale,
        SKETCH_BOX_DIMENSIONS.preview.measurementScaleCellY * textScale,
        1
      );
    } else if (styleKey === 'neighbor') {
      slot.label.scale?.set?.(
        SKETCH_BOX_DIMENSIONS.preview.measurementScaleNeighborX * textScale,
        SKETCH_BOX_DIMENSIONS.preview.measurementScaleNeighborY * textScale,
        1
      );
    } else {
      slot.label.scale?.set?.(
        SKETCH_BOX_DIMENSIONS.preview.measurementScaleDefaultX * textScale,
        SKETCH_BOX_DIMENSIONS.preview.measurementScaleDefaultY * textScale,
        1
      );
    }
  }

  for (let i = used; i < slots.length; i += 1) {
    const slot = slots[i];
    if (!slot) continue;
    setMeasurementObjectVisible(slot.line, false);
    setMeasurementObjectVisible(slot.label, false);
  }

  if (!used) measurementGroup.visible = false;
}
