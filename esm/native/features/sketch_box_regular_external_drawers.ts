import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

export const SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY = 'regularExtDrawers';
export const SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_CONTENT_KIND = 'regular_ext_drawers';

export type RecordMap = Record<string, unknown>;

const CELL_NORM_EPSILON = 0.002;

function asRecord(value: unknown): RecordMap | null {
  return value && typeof value === 'object' ? (value as RecordMap) : null;
}

function readArray(value: unknown): RecordMap[] {
  return Array.isArray(value)
    ? value.map(item => asRecord(item)).filter((item): item is RecordMap => !!item)
    : [];
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clampUnit(value: unknown, defaultValue: number): number {
  const n = readNumber(value);
  if (n == null) return defaultValue;
  return Math.max(0, Math.min(1, n));
}

export function normalizeSketchBoxRegularExternalDrawerCount(value: unknown): number {
  const n = readNumber(value);
  if (n == null) return DRAWER_DIMENSIONS.sketch.externalCountMin;
  return Math.max(
    DRAWER_DIMENSIONS.sketch.externalCountMin,
    Math.min(DRAWER_DIMENSIONS.sketch.externalCountMax, Math.floor(n))
  );
}

export function normalizeStoredSketchBoxRegularExternalDrawerCount(value: unknown): number {
  const n = readNumber(value);
  if (n == null) return 0;
  return Math.max(0, Math.min(DRAWER_DIMENSIONS.sketch.externalCountMax, Math.floor(n)));
}

export function sketchBoxRegularExternalDrawerHasShoe(item: unknown): boolean {
  const rec = asRecord(item);
  return rec?.hasShoeDrawer === true || rec?.hasShoe === true || rec?.shoeDrawer === true;
}

export function getSketchBoxRegularExternalDrawerStackHeight(value: unknown): number {
  const rec = asRecord(value);
  const countSource = rec ? rec.count : value;
  const regularCount = rec
    ? normalizeStoredSketchBoxRegularExternalDrawerCount(countSource)
    : normalizeSketchBoxRegularExternalDrawerCount(countSource);
  const shoeHeight =
    rec && sketchBoxRegularExternalDrawerHasShoe(rec) ? DRAWER_DIMENSIONS.external.shoeHeightM : 0;
  return shoeHeight + regularCount * DRAWER_DIMENSIONS.external.regularHeightM;
}

export function readSketchBoxRegularExternalDrawers(box: unknown): RecordMap[] {
  const rec = asRecord(box);
  return readArray(rec?.[SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY]);
}

export function readSketchBoxRegularExternalDrawersForRender(box: unknown): RecordMap[] {
  return readSketchBoxRegularExternalDrawers(box)
    .map((item, index): RecordMap | null => {
      const count = normalizeStoredSketchBoxRegularExternalDrawerCount(item.count);
      const hasShoeDrawer = sketchBoxRegularExternalDrawerHasShoe(item);
      if (!hasShoeDrawer && count <= 0) return null;
      const normalized: RecordMap = {
        ...item,
        id: item.id != null && String(item.id) ? item.id : `sbrd_${index}`,
        count,
        hasShoeDrawer,
        drawerHeightM: DRAWER_DIMENSIONS.external.regularHeightM,
        shoeDrawerHeightM: DRAWER_DIMENSIONS.external.shoeHeightM,
        yAnchor: 'bottom',
        __wpRegularExternalDrawer: true,
      };
      return normalized;
    })
    .filter((item): item is RecordMap => item != null);
}

export function readSketchBoxExternalDrawersForRender(box: unknown): RecordMap[] {
  const rec = asRecord(box);
  const sketchExtDrawers = readArray(rec?.extDrawers);
  return sketchExtDrawers.concat(readSketchBoxRegularExternalDrawersForRender(box));
}

export function createSketchBoxRegularExternalDrawerItem(args: {
  id: string;
  xNorm?: number | null;
  yNormC?: number | null;
  yNorm?: number | null;
  count: number;
  hasShoeDrawer?: boolean | null;
}): RecordMap {
  const yNormC = clampUnit(args.yNormC, 0.5);
  const yNorm = clampUnit(args.yNorm ?? args.yNormC, yNormC);
  return {
    id: args.id,
    xNorm: clampUnit(args.xNorm, 0.5),
    yNormC,
    yNorm,
    yAnchor: 'bottom',
    count: normalizeStoredSketchBoxRegularExternalDrawerCount(args.count),
    hasShoeDrawer: args.hasShoeDrawer === true,
    drawerHeightM: DRAWER_DIMENSIONS.external.regularHeightM,
    shoeDrawerHeightM: DRAWER_DIMENSIONS.external.shoeHeightM,
    __wpRegularExternalDrawer: true,
  };
}

export function sketchBoxRegularExternalDrawerMatchesCell(
  item: unknown,
  cell: { xNorm?: number | null; yNormC?: number | null }
): boolean {
  const rec = asRecord(item);
  if (!rec) return false;
  const itemXNorm = clampUnit(rec.xNorm, 0.5);
  const cellXNorm = clampUnit(cell.xNorm, 0.5);
  if (Math.abs(itemXNorm - cellXNorm) > CELL_NORM_EPSILON) return false;
  const itemYNorm = clampUnit(rec.yNormC ?? rec.yNorm, 0.5);
  const cellYNorm = clampUnit(cell.yNormC, 0.5);
  return Math.abs(itemYNorm - cellYNorm) <= CELL_NORM_EPSILON;
}

export function findSketchBoxRegularExternalDrawerInCell(
  box: unknown,
  cell: { xNorm?: number | null; yNormC?: number | null }
): RecordMap | null {
  return (
    readSketchBoxRegularExternalDrawers(box).find(item =>
      sketchBoxRegularExternalDrawerMatchesCell(item, cell)
    ) || null
  );
}

export function removeSketchBoxRegularExternalDrawersInCell(
  box: RecordMap,
  cell: { xNorm?: number | null; yNormC?: number | null },
  excludeId?: string | null
): void {
  const list = readSketchBoxRegularExternalDrawers(box);
  if (!list.length) {
    box[SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY] = [];
    return;
  }
  box[SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY] = list.filter(item => {
    if (excludeId && item.id != null && String(item.id) === excludeId) return true;
    return !sketchBoxRegularExternalDrawerMatchesCell(item, cell);
  });
}
