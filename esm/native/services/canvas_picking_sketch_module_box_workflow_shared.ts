import type {
  SketchBoxGeometryArgs,
  SketchBoxGeometry,
} from './canvas_picking_manual_layout_sketch_contracts.js';

export type RecordMap = Record<string, unknown>;

export type ResolveSketchBoxGeometryFn = (args: SketchBoxGeometryArgs) => SketchBoxGeometry;

export type SketchModuleBoxActionState = {
  op: 'add' | 'remove' | 'blocked';
  centerX: number;
  centerY: number;
  centerZ: number;
  outerW: number;
  outerD: number;
  boxH: number;
  xNorm: number | null;
  centered: boolean;
  removeId: string;
  widthM: number | null;
  depthM: number | null;
  sourceBox: RecordMap | null;
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

export function readRecordString(record: unknown, key: string): string {
  const value = readRecordValue(record, key);
  return typeof value === 'string' ? value : '';
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return value;
  return Math.max(min, Math.min(max, value));
}

export function clampSketchModuleBoxCenterY(args: {
  centerY: number;
  boxH: number;
  bottomY: number;
  topY: number;
  pad: number;
}): number {
  const centerY = Number(args.centerY);
  const boxH = Number(args.boxH);
  const bottomY = Number(args.bottomY);
  const topY = Number(args.topY);
  const pad = Number(args.pad);
  if (!Number.isFinite(centerY) || !Number.isFinite(boxH) || !(boxH > 0)) return centerY;
  if (!Number.isFinite(bottomY) || !Number.isFinite(topY) || !(topY > bottomY)) return centerY;
  const half = boxH / 2;
  const lo = bottomY + pad + half;
  const hi = topY - pad - half;
  if (!(hi > lo)) return clamp(centerY, bottomY + pad, topY - pad);
  return clamp(centerY, lo, hi);
}

export function resolveSketchModuleBoxStateFromRecord(args: {
  box: RecordMap;
  boxId: string;
  bottomY: number;
  spanH: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  resolveSketchBoxGeometry: ResolveSketchBoxGeometryFn;
}): SketchModuleBoxActionState | null {
  const { box, boxId, bottomY, spanH, innerW, internalCenterX, internalDepth, internalZ, woodThick } = args;
  const heightM = readRecordNumber(box, 'heightM');
  const yNorm = readRecordNumber(box, 'yNorm');
  if (heightM == null || !(heightM > 0) || yNorm == null) return null;
  const widthM = readRecordNumber(box, 'widthM');
  const depthM = readRecordNumber(box, 'depthM');
  const xNorm = readRecordNumber(box, 'xNorm');
  const geo = args.resolveSketchBoxGeometry({
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    woodThick,
    widthM: widthM != null && widthM > 0 ? widthM : null,
    depthM: depthM != null && depthM > 0 ? depthM : null,
    xNorm,
  });
  return {
    op: 'remove',
    centerX: geo.centerX,
    centerY: bottomY + Math.max(0, Math.min(1, yNorm)) * spanH,
    centerZ: geo.centerZ,
    outerW: geo.outerW,
    outerD: geo.outerD,
    boxH: heightM,
    xNorm,
    centered: !!geo.centered,
    removeId: boxId,
    widthM: widthM != null && widthM > 0 ? widthM : null,
    depthM: depthM != null && depthM > 0 ? depthM : null,
    sourceBox: box,
  };
}

export function findSketchModuleBoxStateById(args: {
  boxes: unknown[];
  removeId: string;
  bottomY: number;
  spanH: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  resolveSketchBoxGeometry: ResolveSketchBoxGeometryFn;
}): SketchModuleBoxActionState | null {
  if (!args.removeId) return null;
  const boxes = Array.isArray(args.boxes) ? args.boxes : [];
  for (let i = 0; i < boxes.length; i++) {
    const box = asRecord(boxes[i]);
    if (!box || box.freePlacement === true) continue;
    const boxId = readRecordString(box, 'id') || String(i);
    if (boxId !== args.removeId) continue;
    return resolveSketchModuleBoxStateFromRecord({
      box,
      boxId,
      bottomY: args.bottomY,
      spanH: args.spanH,
      innerW: args.innerW,
      internalCenterX: args.internalCenterX,
      internalDepth: args.internalDepth,
      internalZ: args.internalZ,
      woodThick: args.woodThick,
      resolveSketchBoxGeometry: args.resolveSketchBoxGeometry,
    });
  }
  return null;
}

export function createSketchModuleBoxConfigItem(args: {
  idFactory: () => string;
  state: SketchModuleBoxActionState;
  bottomY: number;
  spanH: number;
}): RecordMap {
  const yNorm =
    Number(args.spanH) > 0
      ? Math.max(0, Math.min(1, (Number(args.state.centerY) - Number(args.bottomY)) / Number(args.spanH)))
      : 0.5;
  const item: RecordMap = {
    id: args.idFactory(),
    yNorm,
    heightM: Number(args.state.boxH),
  };
  if (args.state.widthM != null && Number.isFinite(args.state.widthM) && args.state.widthM > 0) {
    item.widthM = args.state.widthM;
  }
  if (args.state.depthM != null && Number.isFinite(args.state.depthM) && args.state.depthM > 0) {
    item.depthM = args.state.depthM;
  }
  if (args.state.xNorm != null && Number.isFinite(args.state.xNorm)) item.xNorm = args.state.xNorm;
  return item;
}
