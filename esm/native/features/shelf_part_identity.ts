export const SHELF_GROUP_PART_ID = 'all_shelves';
export const CORNER_SHELF_GROUP_PART_ID = 'corner_shelves';

const MODULE_SHELF_PART_PREFIX = 'module_shelf_';
const SKETCH_SHELF_PART_PREFIX = 'sketch_shelf_';
const CORNER_SHELF_PART_PREFIX = 'corner_shelf_';
const EXTERNAL_DRAWER_BRACE_SHELF_KEY = 'external_drawers';
const DEFAULT_SCOPE_KEY = 'main';

type ShelfMaterialResolver = ((partId: string) => unknown) | null | undefined;

type ShelfUserDataLike = {
  partId?: unknown;
  __wpShelfGroupPartId?: unknown;
  __wpShelfIndex?: unknown;
  __wpShelfVariant?: unknown;
  __wpShelfIsBrace?: unknown;
  __wpShelfRoundedSide?: unknown;
};

function normalizeShelfScopeKey(value: unknown): string {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  if (!raw) return DEFAULT_SCOPE_KEY;
  const normalized = raw.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized || DEFAULT_SCOPE_KEY;
}

function normalizeShelfIndex(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(n)) return String(Math.max(0, Math.round(n)));
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw.replace(/[^a-zA-Z0-9_-]+/g, '_') || '0';
}

export function createModuleShelfPartId(moduleKey: unknown, gridIndex: unknown): string {
  return `${MODULE_SHELF_PART_PREFIX}${normalizeShelfScopeKey(moduleKey)}_g${normalizeShelfIndex(gridIndex)}`;
}

export function createSketchShelfPartId(moduleKey: unknown, shelfOrdinal: unknown): string {
  return `${SKETCH_SHELF_PART_PREFIX}${normalizeShelfScopeKey(moduleKey)}_${normalizeShelfIndex(shelfOrdinal)}`;
}

export function createCornerShelfPartId(cellKey: unknown, gridIndex: unknown): string {
  return `${CORNER_SHELF_PART_PREFIX}${normalizeShelfScopeKey(cellKey)}_g${normalizeShelfIndex(gridIndex)}`;
}

export function createModuleExternalDrawerBraceShelfPartId(moduleKey: unknown): string {
  return createModuleShelfPartId(moduleKey, EXTERNAL_DRAWER_BRACE_SHELF_KEY);
}

export function createSketchExternalDrawerBraceShelfPartId(
  moduleKey: unknown,
  drawerId: unknown,
  boxId?: unknown
): string {
  const moduleScope = normalizeShelfScopeKey(moduleKey);
  const scopeKey =
    boxId == null || String(boxId).trim() === ''
      ? moduleScope
      : `${moduleScope}_box_${normalizeShelfScopeKey(boxId)}`;
  const drawerKey = `${EXTERNAL_DRAWER_BRACE_SHELF_KEY}_${normalizeShelfScopeKey(drawerId)}`;
  return createSketchShelfPartId(scopeKey, drawerKey);
}

function withoutLowerStackPrefix(partId: string): string {
  return partId.startsWith('lower_') ? partId.slice('lower_'.length) : partId;
}

function isCornerPentagonInteriorShelfPartId(partId: string): boolean {
  return (
    /^corner_pent_int_left_shelf_\d+$/.test(partId) || /^corner_pent_int_shelf_[a-zA-Z0-9_-]+$/.test(partId)
  );
}

export function isIndividualShelfPartId(partId: unknown): boolean {
  const pid = withoutLowerStackPrefix(typeof partId === 'string' ? partId : String(partId ?? ''));
  return (
    pid.startsWith(MODULE_SHELF_PART_PREFIX) ||
    pid.startsWith(SKETCH_SHELF_PART_PREFIX) ||
    pid.startsWith(CORNER_SHELF_PART_PREFIX) ||
    isCornerPentagonInteriorShelfPartId(pid)
  );
}

export function resolveShelfGroupPartId(partId: unknown): string | null {
  const pid = withoutLowerStackPrefix(typeof partId === 'string' ? partId : String(partId ?? ''));
  if (pid.startsWith(CORNER_SHELF_PART_PREFIX) || isCornerPentagonInteriorShelfPartId(pid)) {
    return CORNER_SHELF_GROUP_PART_ID;
  }
  if (pid.startsWith(MODULE_SHELF_PART_PREFIX) || pid.startsWith(SKETCH_SHELF_PART_PREFIX)) {
    return SHELF_GROUP_PART_ID;
  }
  return null;
}

export function isShelfBoardPartId(partId: unknown): boolean {
  const pid = typeof partId === 'string' ? partId : String(partId ?? '');
  return pid === SHELF_GROUP_PART_ID || pid === CORNER_SHELF_GROUP_PART_ID || isIndividualShelfPartId(pid);
}

export function markShelfBoardUserData(
  userData: ShelfUserDataLike | null | undefined,
  args: {
    groupPartId?: string;
    shelfIndex?: unknown;
    variant?: unknown;
    isBrace?: unknown;
    roundedSide?: unknown;
  }
): void {
  if (!userData || typeof userData !== 'object') return;
  userData.__wpShelfGroupPartId = args.groupPartId || SHELF_GROUP_PART_ID;
  if (typeof args.shelfIndex !== 'undefined') userData.__wpShelfIndex = args.shelfIndex;
  if (typeof args.variant !== 'undefined') userData.__wpShelfVariant = args.variant;
  if (typeof args.isBrace !== 'undefined') userData.__wpShelfIsBrace = !!args.isBrace;
  if (typeof args.roundedSide !== 'undefined') userData.__wpShelfRoundedSide = args.roundedSide;
}

export function resolveShelfPartMaterial(args: {
  partId: string;
  groupPartId?: string;
  currentShelfMat: unknown;
  getPartColorValue?: ShelfMaterialResolver;
  getPartMaterial?: ShelfMaterialResolver;
}): unknown {
  const { partId, currentShelfMat, getPartColorValue, getPartMaterial } = args;
  const groupPartId = args.groupPartId || resolveShelfGroupPartId(partId) || SHELF_GROUP_PART_ID;
  if (typeof getPartColorValue !== 'function' || typeof getPartMaterial !== 'function') {
    return currentShelfMat;
  }

  try {
    if (partId && getPartColorValue(partId)) return getPartMaterial(partId) || currentShelfMat;
    if (groupPartId && getPartColorValue(groupPartId)) return getPartMaterial(groupPartId) || currentShelfMat;
  } catch {
    return currentShelfMat;
  }
  return currentShelfMat;
}
