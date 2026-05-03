import type { AppContainer } from '../../../types';
import { getDimLabelEntry } from './render_ops_extras_dimensions.js';
import type { PreviewGroupLike, SketchPlacementPreviewArgs } from './render_preview_ops_contracts.js';
import type { RenderPreviewSketchShared } from './render_preview_sketch_shared.js';
import {
  readFinite,
  readMeasurementEntries,
  resolveMeasurementLabelFaceSign,
} from './render_preview_sketch_measurements_input.js';
import {
  ensureMeasurementLabelMaterial,
  orientMeasurementLabelForFace,
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
  const lineMaterial = ensureMeasurementLineMaterial(userData, THREE, shared);
  const slots = userData.__measurementSlots || [];
  measurementGroup.visible = true;

  let used = 0;
  for (let i = 0; i < measurementEntries.length; i += 1) {
    const entry = measurementEntries[i];
    const startX = readFinite(entry.startX);
    const startY = readFinite(entry.startY);
    const endX = readFinite(entry.endX);
    const endY = readFinite(entry.endY);
    const label = typeof entry.label === 'string' ? entry.label.trim() : '';
    if (startX == null || startY == null || endX == null || endY == null || !label) continue;

    const z = readFinite(entry.z) ?? 0;
    const slot = ensureMeasurementSlot({
      slots,
      index: used,
      measurementGroup,
      lineMaterial,
      THREE,
      shared,
    });
    used += 1;

    const points = [new THREE.Vector3(startX, startY, z), new THREE.Vector3(endX, endY, z)];
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

    const styleKey = entry.styleKey === 'cell' ? 'cell' : 'default';
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
    const labelX = readFinite(entry.labelX) ?? (startX + endX) / 2;
    const labelY = readFinite(entry.labelY) ?? (startY + endY) / 2;
    const labelFaceSign = resolveMeasurementLabelFaceSign(entry, input, z);
    const labelZ = z + (labelFaceSign >= 0 ? 0.0035 : -0.0035);
    slot.label.position?.set?.(labelX, labelY, labelZ);
    orientMeasurementLabelForFace(slot.label, labelFaceSign);

    const textScale = Math.max(0.55, readFinite(entry.textScale) ?? 0.9);
    if (styleKey === 'cell') slot.label.scale?.set?.(0.48 * textScale, 0.24 * textScale, 1);
    else slot.label.scale?.set?.(0.6 * textScale, 0.3 * textScale, 1);
  }

  for (let i = used; i < slots.length; i += 1) {
    const slot = slots[i];
    if (!slot) continue;
    setMeasurementObjectVisible(slot.line, false);
    setMeasurementObjectVisible(slot.label, false);
  }

  if (!used) measurementGroup.visible = false;
}
