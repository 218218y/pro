import { MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { buildSketchModuleDrawerVerticalBlockers } from './canvas_picking_sketch_module_vertical_content_collision.js';
import { buildManualLayoutVerticalContentBlockers } from './canvas_picking_manual_layout_vertical_blockers.js';
import type { VerticalOccupancyRange } from './canvas_picking_manual_layout_sketch_vertical_stack.js';

type RecordMap = Record<string, unknown>;

function readRecordValue(record: unknown, key: string): unknown {
  return record && typeof record === 'object' && !Array.isArray(record) ? (record as RecordMap)[key] : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readRecordArray(record: unknown, key: string): RecordMap[] {
  const value = readRecordValue(record, key);
  return Array.isArray(value)
    ? value.filter((item): item is RecordMap => !!item && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function readSketchExtrasRecord(value: unknown): RecordMap | null {
  const extras = readRecordValue(value, 'sketchExtras');
  return extras && typeof extras === 'object' && !Array.isArray(extras) ? (extras as RecordMap) : null;
}

export function buildSketchModuleBoxVerticalBlockers(args: {
  cfgRef?: RecordMap | null;
  boxes?: RecordMap[] | null;
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
  woodThick?: number;
}): VerticalOccupancyRange[] {
  if (!(args.topY > args.bottomY) || !(args.totalHeight > 0)) return [];
  const woodThick =
    typeof args.woodThick === 'number' && Number.isFinite(args.woodThick) && args.woodThick > 0
      ? args.woodThick
      : MATERIAL_DIMENSIONS.wood.thicknessM;
  const extras = readSketchExtrasRecord(args.cfgRef ?? null);
  const boxes = Array.isArray(args.boxes) ? args.boxes : readRecordArray(extras, 'boxes');
  if (!boxes.length) return [];

  return boxes
    .map((box, index): VerticalOccupancyRange | null => {
      if (box.freePlacement === true) return null;
      const yNorm = readNumber(box.yNorm);
      const heightM = readNumber(box.heightM);
      if (yNorm == null || heightM == null || !(heightM > 0)) return null;
      const clampedHeight = Math.max(woodThick * 2 + 0.02, Math.min(args.totalHeight, heightM));
      const centerY = args.bottomY + Math.max(0, Math.min(1, yNorm)) * args.totalHeight;
      const id = box.id != null && box.id !== '' ? String(box.id) : String(index);
      return {
        id: `box:${id}`,
        centerY,
        minY: centerY - clampedHeight / 2,
        maxY: centerY + clampedHeight / 2,
        stackH: clampedHeight,
        kind: 'sketch_box',
        hardCollision: true,
      } satisfies VerticalOccupancyRange;
    })
    .filter((item): item is VerticalOccupancyRange => !!item)
    .sort((a, b) => Math.min(a.minY, a.maxY) - Math.min(b.minY, b.maxY));
}

export function buildSketchModuleBoxPlacementBlockers(args: {
  cfgRef?: RecordMap | null;
  info?: RecordMap | null;
  shelves?: RecordMap[] | null;
  rods?: RecordMap[] | null;
  storageBarriers?: RecordMap[] | null;
  drawers?: RecordMap[] | null;
  extDrawers?: RecordMap[] | null;
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
  woodThick: number;
}): VerticalOccupancyRange[] {
  if (!(args.topY > args.bottomY) || !(args.totalHeight > 0)) return [];

  return [
    ...buildManualLayoutVerticalContentBlockers({
      cfgRef: args.cfgRef ?? null,
      info: args.info ?? null,
      shelves: args.shelves ?? null,
      rods: args.rods ?? null,
      storageBarriers: args.storageBarriers ?? null,
      bottomY: args.bottomY,
      topY: args.topY,
      totalHeight: args.totalHeight,
      pad: args.pad,
      woodThick: args.woodThick,
    }),
    ...buildSketchModuleDrawerVerticalBlockers({
      cfgRef: args.cfgRef ?? null,
      drawers: args.drawers ?? null,
      extDrawers: args.extDrawers ?? null,
      bottomY: args.bottomY,
      topY: args.topY,
      totalHeight: args.totalHeight,
      pad: args.pad,
    }),
  ].sort((a, b) => Math.min(a.minY, a.maxY) - Math.min(b.minY, b.maxY));
}
