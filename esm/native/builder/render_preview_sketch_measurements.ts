import type { AppContainer } from '../../../types';
import { getDimLabelEntry } from './render_ops_extras_dimensions.js';
import type {
  PreviewGroupLike,
  PreviewLineLike,
  PreviewMaterialLike,
  PreviewMeshLike,
  PreviewObject3DLike,
  PreviewTHREESurface,
  PreviewValueRecord,
  SketchPlacementPreviewArgs,
} from './render_preview_ops_contracts.js';
import type { RenderPreviewSketchShared } from './render_preview_sketch_shared.js';

type MeasurementEntryLike = {
  startX?: unknown;
  startY?: unknown;
  endX?: unknown;
  endY?: unknown;
  z?: unknown;
  label?: unknown;
  labelX?: unknown;
  labelY?: unknown;
  styleKey?: unknown;
  textScale?: unknown;
  faceSign?: unknown;
  viewFaceSign?: unknown;
  labelFaceSign?: unknown;
};

type RotatablePreviewMeshLike = PreviewMeshLike & {
  rotation?: {
    set?: (x: number, y: number, z: number) => unknown;
  };
  quaternion?: {
    identity?: () => unknown;
    set?: (x: number, y: number, z: number, w: number) => unknown;
  };
};

type MeasurementUserData = PreviewValueRecord & {
  __measurementGroup?: PreviewGroupLike;
  __measurementLineMat?: PreviewMaterialLike;
  __measurementLabelMatCache?: Map<string, PreviewMaterialLike>;
  __measurementSlots?: MeasurementSlot[];
};

type MeasurementSlot = {
  line: PreviewLineLike;
  label: PreviewMeshLike;
};

type MeasurementTHREESurface = PreviewTHREESurface & {
  BufferGeometry: new () => { setFromPoints?: (points: unknown[]) => unknown };
  Group: new () => PreviewGroupLike;
  Line: new (geometry: unknown, material: unknown) => PreviewLineLike;
  LineBasicMaterial: new (params: PreviewValueRecord) => PreviewMaterialLike;
  Mesh: new (geometry: unknown, material: unknown) => PreviewMeshLike;
  MeshBasicMaterial: new (params: PreviewValueRecord) => PreviewMaterialLike;
  PlaneGeometry: new (width?: number, height?: number) => unknown;
  Vector3: new (x?: number, y?: number, z?: number) => { x: number; y: number; z: number };
  DoubleSide?: unknown;
};

function asMeasurementTHREE(value: unknown): MeasurementTHREESurface | null {
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

function ensureMeasurementUserData(
  g: PreviewGroupLike,
  shared: RenderPreviewSketchShared
): MeasurementUserData {
  const next = (shared.readUserData(g.userData) as MeasurementUserData | null) || ({} as MeasurementUserData);
  g.userData = next;
  return next;
}

function readMeasurementEntries(input: SketchPlacementPreviewArgs): MeasurementEntryLike[] {
  const raw = input.clearanceMeasurements;
  if (!Array.isArray(raw)) return [];
  const out: MeasurementEntryLike[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const entry = raw[i];
    if (entry && typeof entry === 'object') out.push(entry as MeasurementEntryLike);
  }
  return out;
}

function setObjectVisible(obj: PreviewObject3DLike | null | undefined, visible: boolean): void {
  if (!obj) return;
  obj.visible = visible;
}

function hideMeasurementSlots(slots: MeasurementSlot[] | undefined): void {
  if (!Array.isArray(slots)) return;
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    if (!slot) continue;
    setObjectVisible(slot.line, false);
    setObjectVisible(slot.label, false);
  }
}

function ensureMeasurementGroup(
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

function ensureMeasurementLineMaterial(
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

function ensureMeasurementSlot(args: {
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

function ensureMeasurementLabelMaterial(
  userData: MeasurementUserData,
  key: string,
  texture: unknown,
  THREE: MeasurementTHREESurface,
  shared: RenderPreviewSketchShared
): PreviewMaterialLike {
  if (!(userData.__measurementLabelMatCache instanceof Map)) {
    userData.__measurementLabelMatCache = new Map<string, PreviewMaterialLike>();
  }
  const cached = userData.__measurementLabelMatCache.get(key);
  if (cached) return cached;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
  shared.markKeepMaterial(material);
  userData.__measurementLabelMatCache.set(key, material);
  return material;
}

function readFinite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeMeasurementFaceSign(value: unknown): number | null {
  const n = readFinite(value);
  if (n == null) return null;
  return n < 0 ? -1 : 1;
}

function resolveMeasurementLabelFaceSign(
  entry: MeasurementEntryLike,
  input: SketchPlacementPreviewArgs,
  z: number
): number {
  return (
    normalizeMeasurementFaceSign(entry.labelFaceSign) ??
    normalizeMeasurementFaceSign(entry.viewFaceSign) ??
    normalizeMeasurementFaceSign(entry.faceSign) ??
    normalizeMeasurementFaceSign(input.labelFaceSign) ??
    normalizeMeasurementFaceSign(input.viewFaceSign) ??
    normalizeMeasurementFaceSign(input.faceSign) ??
    (z < 0 ? -1 : 1)
  );
}

function orientMeasurementLabelForFace(label: PreviewMeshLike, faceSign: number): void {
  const rotatable = label as RotatablePreviewMeshLike;
  const yRotation = faceSign < 0 ? Math.PI : 0;

  if (typeof rotatable.rotation?.set === 'function') {
    rotatable.rotation.set(0, yRotation, 0);
    return;
  }

  if (typeof rotatable.quaternion?.set === 'function') {
    if (faceSign < 0) rotatable.quaternion.set(0, 1, 0, 0);
    else rotatable.quaternion.set(0, 0, 0, 1);
    return;
  }

  if (faceSign >= 0 && typeof rotatable.quaternion?.identity === 'function') {
    rotatable.quaternion.identity();
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
    setObjectVisible(slot.line, false);
    setObjectVisible(slot.label, false);
  }

  if (!used) measurementGroup.visible = false;
}
