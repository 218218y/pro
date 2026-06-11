import type { SketchPlacementPreviewArgs } from './render_preview_ops_contracts.js';
import type { MeasurementEntryLike } from './render_preview_sketch_measurements_types.js';

export function readMeasurementEntries(input: SketchPlacementPreviewArgs): MeasurementEntryLike[] {
  const raw = input.clearanceMeasurements;
  if (!Array.isArray(raw)) return [];
  const out: MeasurementEntryLike[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const entry = raw[i];
    if (entry && typeof entry === 'object') out.push(entry as MeasurementEntryLike);
  }
  return out;
}

export function readFinite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeMeasurementFaceSign(value: unknown): number | null {
  const n = readFinite(value);
  if (n == null) return null;
  return n < 0 ? -1 : 1;
}

export function resolveMeasurementLabelFaceSign(
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
