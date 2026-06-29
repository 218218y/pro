import { readPreviewNumber } from './render_preview_number_contracts.js';
import type { SketchPlacementPreviewArgs } from './render_preview_ops_contracts.js';
import type {
  MeasurementEntryLike,
  MeasurementSurfacePlane,
} from './render_preview_sketch_measurements_types.js';

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

export function readMeasurementNumber(value: unknown): number | null {
  return readPreviewNumber(value);
}

export function normalizeMeasurementFaceSign(value: unknown): number | null {
  const n = readMeasurementNumber(value);
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

export function normalizeMeasurementSurfacePlane(value: unknown): MeasurementSurfacePlane {
  return value === 'yz' || value === 'xz' ? value : 'xy';
}

export function mapMeasurementPointToSurface(args: {
  plane: MeasurementSurfacePlane;
  x: number;
  y: number;
  z: number;
}): { x: number; y: number; z: number } {
  if (args.plane === 'yz') return { x: args.z, y: args.y, z: args.x };
  if (args.plane === 'xz') return { x: args.x, y: args.z, z: args.y };
  return { x: args.x, y: args.y, z: args.z };
}
