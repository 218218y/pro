import {
  isRecord,
  readNumber,
  readRecordNumber,
  readRecordValue,
} from './canvas_picking_sketch_module_vertical_content_records.js';

export type SketchModuleVerticalItemMatch = {
  index: number;
  yAbs: number;
  dy: number;
};

export type SketchModuleShelfMatch = SketchModuleVerticalItemMatch & {
  variant: string | null;
  depthM: number | null;
};

export type SketchModuleStorageBarrierMatch = SketchModuleVerticalItemMatch & {
  heightM: number | null;
};

function readVerticalItemYAbs(record: unknown, bottomY: number, totalHeight: number): number | null {
  const yNorm = readRecordNumber(record, 'yNorm');
  if (!Number.isFinite(yNorm)) return null;
  return bottomY + Math.max(0, Math.min(1, Number(yNorm))) * totalHeight;
}

function findNearestVerticalItem<TMatch extends SketchModuleVerticalItemMatch>(args: {
  items: unknown[];
  bottomY: number;
  totalHeight: number;
  pointerY: number;
  createMatch: (entry: { index: number; yAbs: number; dy: number; item: Record<string, unknown> }) => TMatch;
}): TMatch | null {
  const { items, bottomY, totalHeight, pointerY, createMatch } = args;
  let best: TMatch | null = null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!isRecord(item)) continue;
    const yAbs = readVerticalItemYAbs(item, bottomY, totalHeight);
    if (yAbs == null) continue;
    const dy = Math.abs(pointerY - yAbs);
    if (best && dy >= best.dy) continue;
    best = createMatch({ index: i, yAbs, dy, item });
  }
  return best;
}

export function findNearestSketchModuleShelf(args: {
  shelves: unknown[];
  bottomY: number;
  totalHeight: number;
  pointerY: number;
}): SketchModuleShelfMatch | null {
  return findNearestVerticalItem({
    items: args.shelves,
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
    pointerY: args.pointerY,
    createMatch: ({ index, yAbs, dy, item }) => {
      const variant = readRecordValue(item, 'variant');
      const depthM = readNumber(readRecordValue(item, 'depthM'));
      return {
        index,
        yAbs,
        dy,
        variant: typeof variant === 'string' ? variant : null,
        depthM: depthM != null && depthM > 0 ? depthM : null,
      };
    },
  });
}

export function findNearestSketchModuleRod(args: {
  rods: unknown[];
  bottomY: number;
  totalHeight: number;
  pointerY: number;
}): SketchModuleVerticalItemMatch | null {
  return findNearestVerticalItem({
    items: args.rods,
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
    pointerY: args.pointerY,
    createMatch: ({ index, yAbs, dy }) => ({ index, yAbs, dy }),
  });
}

export function findNearestSketchModuleStorageBarrier(args: {
  storageBarriers: unknown[];
  bottomY: number;
  totalHeight: number;
  pointerY: number;
}): SketchModuleStorageBarrierMatch | null {
  return findNearestVerticalItem({
    items: args.storageBarriers,
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
    pointerY: args.pointerY,
    createMatch: ({ index, yAbs, dy, item }) => {
      const heightM = readRecordNumber(item, 'heightM');
      return {
        index,
        yAbs,
        dy,
        heightM: heightM != null && heightM > 0 ? heightM : null,
      };
    },
  });
}

export function clampSketchModuleStorageCenterY(args: {
  bottomY: number;
  topY: number;
  pad: number;
  heightM: number;
  pointerY: number;
}): number {
  const { bottomY, topY, pad, heightM, pointerY } = args;
  const half = Math.max(0.0001, heightM / 2);
  const lo = bottomY + pad + half;
  const hi = topY - pad - half;
  const yCenter = Math.max(bottomY + pad, Math.min(topY - pad, pointerY));
  return hi > lo ? Math.max(lo, Math.min(hi, yCenter)) : yCenter;
}
