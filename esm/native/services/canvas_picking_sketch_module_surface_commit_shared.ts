import {
  cmToM,
  INTERIOR_FITTINGS_DIMENSIONS,
  SKETCH_BOX_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  SketchBoxGeometryArgs,
  SketchBoxGeometry,
} from './canvas_picking_manual_layout_sketch_contracts.js';

export type RecordMap = Record<string, unknown>;
export type SketchBoxToolSpec = RecordMap & {
  heightCm?: number;
  widthCm?: number | null;
  depthCm?: number | null;
};
export type SketchBoxPlacementMetrics = RecordMap & {
  innerW?: number;
  internalCenterX?: number;
  internalDepth?: number;
  internalZ?: number;
  hitLocalX?: number | null;
};

export type ResolveSketchBoxGeometryFn = (args: SketchBoxGeometryArgs) => SketchBoxGeometry;

export type CommitSketchModuleSurfaceToolArgs = {
  cfg: RecordMap;
  tool: string;
  hoverOk: boolean;
  hoverRec: RecordMap;
  bottomY: number;
  topY: number;
  totalHeight: number;
  hitY0: number;
  hitYClamped: number;
  yNorm: number;
  pad: number;
  woodThick: number;
  resolveSketchBoxPlacementMetrics: () => SketchBoxPlacementMetrics;
  parseSketchBoxToolSpec: (tool: string) => SketchBoxToolSpec | null;
  resolveSketchBoxGeometry: ResolveSketchBoxGeometryFn;
  sketchBoxToolPrefix: string;
};

export function isRecord(value: unknown): value is RecordMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): RecordMap | null {
  return isRecord(value) ? value : null;
}

export function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readRecordValue(record: unknown, key: string): unknown {
  const rec = asRecord(record);
  return rec ? rec[key] : null;
}

export function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readRecordValue(record, key));
}

export function ensureRecord(record: RecordMap, key: string): RecordMap {
  const current = asRecord(record[key]);
  if (current) return current;
  const next: RecordMap = {};
  record[key] = next;
  return next;
}

export function ensureRecordList(record: RecordMap, key: string): RecordMap[] {
  const current = record[key];
  if (Array.isArray(current) && current.every(isRecord)) return current;
  const next = Array.isArray(current) ? current.filter(isRecord) : [];
  record[key] = next;
  return next;
}

export function createRandomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}

export function parseSketchShelfTool(tool: string): { variant: string; shelfDepthM: number | null } {
  if (!tool.startsWith('sketch_shelf:')) return { variant: '', shelfDepthM: null };
  const raw = tool.slice('sketch_shelf:'.length).trim();
  const at = raw.indexOf('@');
  const variant = (at >= 0 ? raw.slice(0, at) : raw).trim();
  if (at < 0) return { variant, shelfDepthM: null };
  const n = Number(raw.slice(at + 1).trim());
  return {
    variant,
    shelfDepthM: Number.isFinite(n) && n > 0 ? cmToM(n) : null,
  };
}

export function parseSketchStorageHeight(tool: string): number {
  const storageDims = INTERIOR_FITTINGS_DIMENSIONS.storage;
  if (!tool.startsWith('sketch_storage:')) return storageDims.barrierHeightM;
  const raw = tool.slice('sketch_storage:'.length).trim();
  const n = Number(raw);
  return Number.isFinite(n)
    ? Math.max(storageDims.barrierHeightMinM, Math.min(storageDims.barrierHeightMaxM, cmToM(n)))
    : storageDims.barrierHeightM;
}

export function parseSketchModuleBoxTool(args: {
  tool: string;
  parseSketchBoxToolSpec: (tool: string) => SketchBoxToolSpec | null;
}): { boxH: number; boxWM: number | null; boxDM: number | null } {
  const spec = args.parseSketchBoxToolSpec(args.tool);
  const heightCm = readNumber(spec ? spec.heightCm : null);
  const widthCm = readNumber(spec ? spec.widthCm : null);
  const depthCm = readNumber(spec ? spec.depthCm : null);
  return {
    boxH:
      heightCm != null
        ? Math.max(
            SKETCH_BOX_DIMENSIONS.geometry.minOuterHeightM,
            Math.min(SKETCH_BOX_DIMENSIONS.geometry.maxOuterHeightM, cmToM(heightCm))
          )
        : SKETCH_BOX_DIMENSIONS.geometry.defaultOuterHeightM,
    boxWM: widthCm != null && widthCm > 0 ? cmToM(widthCm) : null,
    boxDM: depthCm != null && depthCm > 0 ? cmToM(depthCm) : null,
  };
}
