import type { AppContainer } from '../../../types';
import {
  asSketchCommitRecord,
  ensureSketchCommitRecord,
  ensureSketchCommitRecordList,
  isSketchCommitRecord,
  readSketchCommitNumber,
} from './canvas_picking_sketch_commit_geometry.js';
import { INTERIOR_STORAGE_BARRIER_POLICY } from '../../shared/dimensions/interior_storage_policy.js';
import { SKETCH_BOX_SHELL_GEOMETRY_POLICY } from '../../shared/dimensions/sketch_box_geometry_policy.js';
import { cmToM } from '../../shared/dimensions/units.js';
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
  App?: AppContainer;
  cfg: RecordMap;
  moduleKey?: unknown;
  isBottomStack?: boolean;
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

export const isRecord = isSketchCommitRecord;
export const asRecord = asSketchCommitRecord;
export const readNumber = readSketchCommitNumber;

export function readRecordValue(record: unknown, key: string): unknown {
  const rec = asRecord(record);
  return rec ? rec[key] : null;
}

export function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readRecordValue(record, key));
}

export const ensureRecord = ensureSketchCommitRecord;
export const ensureRecordList = ensureSketchCommitRecordList;

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
  if (!tool.startsWith('sketch_storage:')) return INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM;
  const raw = tool.slice('sketch_storage:'.length).trim();
  const n = Number(raw);
  return Number.isFinite(n)
    ? Math.max(
        INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightMinM,
        Math.min(INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightMaxM, cmToM(n))
      )
    : INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM;
}

export function parseSketchModuleBoxTool(args: {
  tool: string;
  parseSketchBoxToolSpec: (tool: string) => SketchBoxToolSpec | null;
  maxHeightM?: number | null;
}): { boxH: number; boxWM: number | null; boxDM: number | null } {
  const spec = args.parseSketchBoxToolSpec(args.tool);
  const heightCm = readNumber(spec ? spec.heightCm : null);
  const widthCm = readNumber(spec ? spec.widthCm : null);
  const depthCm = readNumber(spec ? spec.depthCm : null);
  const maxHeightM = readNumber(args.maxHeightM);
  const heightCeiling =
    maxHeightM != null && maxHeightM > 0 ? maxHeightM : SKETCH_BOX_SHELL_GEOMETRY_POLICY.maxOuterHeightM;
  return {
    boxH:
      heightCm != null
        ? Math.max(SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterHeightM, Math.min(heightCeiling, cmToM(heightCm)))
        : SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterHeightM,
    boxWM: widthCm != null && widthCm > 0 ? cmToM(widthCm) : null,
    boxDM: depthCm != null && depthCm > 0 ? cmToM(depthCm) : null,
  };
}
