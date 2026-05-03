import type {
  PreviewGroupLike,
  PreviewMaterialLike,
  PreviewObject3DLike,
} from './render_preview_ops_contracts.js';
import type { RenderPreviewSketchShared } from './render_preview_sketch_shared.js';
import type {
  MeasurementSlot,
  MeasurementTHREESurface,
  MeasurementUserData,
} from './render_preview_sketch_measurements_types.js';

export function asMeasurementTHREE(value: unknown): MeasurementTHREESurface | null {
  const rec = value as MeasurementTHREESurface | null;
  if (!rec || typeof rec !== 'object') return null;
  return typeof rec.BufferGeometry === 'function' &&
    typeof rec.Group === 'function' &&
    typeof rec.Line === 'function' &&
    typeof rec.LineBasicMaterial === 'function' &&
    typeof rec.Mesh === 'function' &&
    typeof rec.MeshBasicMaterial === 'function' &&
    typeof rec.PlaneGeometry === 'function' &&
    typeof rec.Vector3 === 'function'
    ? rec
    : null;
}

export function ensureMeasurementUserData(
  g: PreviewGroupLike,
  shared: RenderPreviewSketchShared
): MeasurementUserData {
  const next = (shared.readUserData(g.userData) as MeasurementUserData | null) || ({} as MeasurementUserData);
  g.userData = next;
  return next;
}

export function setMeasurementObjectVisible(
  obj: PreviewObject3DLike | null | undefined,
  visible: boolean
): void {
  if (!obj) return;
  obj.visible = visible;
}

export function hideMeasurementSlots(slots: MeasurementSlot[] | undefined): void {
  if (!Array.isArray(slots)) return;
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    if (!slot) continue;
    setMeasurementObjectVisible(slot.line, false);
    setMeasurementObjectVisible(slot.label, false);
  }
}

export function hideSketchPlacementMeasurements(
  g: PreviewGroupLike | null,
  shared: RenderPreviewSketchShared
): void {
  if (!g) return;
  const userData = ensureMeasurementUserData(g, shared);
  const measurementGroup = shared.asPreviewGroup(userData.__measurementGroup);
  if (measurementGroup) measurementGroup.visible = false;
  hideMeasurementSlots(userData.__measurementSlots);
}

export function ensureMeasurementGroup(
  g: PreviewGroupLike,
  THREE: MeasurementTHREESurface,
  shared: RenderPreviewSketchShared
): { userData: MeasurementUserData; measurementGroup: PreviewGroupLike } {
  const userData = ensureMeasurementUserData(g, shared);
  let measurementGroup = shared.asPreviewGroup(userData.__measurementGroup);
  if (!measurementGroup) {
    measurementGroup = new THREE.Group();
    measurementGroup.visible = false;
    measurementGroup.renderOrder = 10030;
    measurementGroup.userData = shared.readUserData(measurementGroup.userData);
    measurementGroup.userData.__keepMaterialSubtree = true;
    shared.markIgnoreRaycast(measurementGroup);
    measurementGroup.raycast = function () {};
    g.add?.(measurementGroup);
    userData.__measurementGroup = measurementGroup;
  } else if (measurementGroup.parent !== g) {
    g.add?.(measurementGroup);
  }
  if (!Array.isArray(userData.__measurementSlots)) userData.__measurementSlots = [];
  return { userData, measurementGroup };
}

export function ensureMeasurementLineMaterial(
  userData: MeasurementUserData,
  THREE: MeasurementTHREESurface,
  shared: RenderPreviewSketchShared
): PreviewMaterialLike {
  const existing = userData.__measurementLineMat;
  if (existing) return existing;
  const material = new THREE.LineBasicMaterial({
    color: 0x2b7dbb,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    depthTest: false,
  });
  shared.markKeepMaterial(material);
  userData.__measurementLineMat = material;
  return material;
}

export function ensureMeasurementSlot(args: {
  slots: MeasurementSlot[];
  index: number;
  measurementGroup: PreviewGroupLike;
  lineMaterial: PreviewMaterialLike;
  THREE: MeasurementTHREESurface;
  shared: RenderPreviewSketchShared;
}): MeasurementSlot {
  const { slots, index, measurementGroup, lineMaterial, THREE, shared } = args;
  const existing = slots[index];
  if (existing) return existing;

  const geometry = new THREE.BufferGeometry();
  const line = new THREE.Line(geometry, lineMaterial);
  line.visible = false;
  line.renderOrder = 10031;
  shared.markIgnoreRaycast(line);
  line.raycast = function () {};

  const labelGeometry = new THREE.PlaneGeometry(1, 1);
  const labelMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
  shared.markKeepMaterial(labelMaterial);

  const label = new THREE.Mesh(labelGeometry, labelMaterial);
  label.visible = false;
  label.renderOrder = 10032;
  label.userData = shared.readUserData(label.userData);
  label.userData.__keepMaterial = true;
  shared.markIgnoreRaycast(label);
  label.raycast = function () {};

  measurementGroup.add?.(line);
  measurementGroup.add?.(label);
  const slot = { line, label };
  slots[index] = slot;
  return slot;
}
