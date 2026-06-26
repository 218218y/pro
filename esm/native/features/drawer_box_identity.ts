// Drawer box paint identity helpers.
//
// Drawer fronts already have stable paint part ids (for example d1_draw_1 or
// chest_drawer_0). The physical drawer box must be a separate paint target so
// that front/global cabinet paint does not leak into it.

export const DRAWER_BOX_PART_ID_PREFIX = 'drawer_box__';

function normalizeDrawerBoxSourcePartId(partId: unknown): string {
  const raw = typeof partId === 'string' ? partId.trim() : String(partId ?? '').trim();
  const normalized = raw.replace(/[^A-Za-z0-9_-]+/g, '_');
  return normalized || 'unknown';
}

export function makeDrawerBoxPartId(drawerPartId: unknown): string {
  return `${DRAWER_BOX_PART_ID_PREFIX}${normalizeDrawerBoxSourcePartId(drawerPartId)}`;
}

export function isDrawerBoxPartId(partId: unknown): boolean {
  return typeof partId === 'string' && partId.startsWith(DRAWER_BOX_PART_ID_PREFIX);
}

export type DrawerBoxOwnerUserDataLike = {
  __wpDrawerOwnerPartId?: unknown;
  __wpDrawerId?: unknown;
  drawerId?: unknown;
  partId?: unknown;
};

export function resolveDrawerBoxOwnerPartId(
  userData: DrawerBoxOwnerUserDataLike | null | undefined
): string | null {
  const candidates = [userData?.__wpDrawerOwnerPartId, userData?.__wpDrawerId, userData?.drawerId];
  for (const value of candidates) {
    if (value == null) continue;
    const sid = String(value).trim();
    if (sid) return sid;
  }

  const partId = userData?.partId;
  if (!isDrawerBoxPartId(partId)) return null;
  const rawOwner = String(partId).slice(DRAWER_BOX_PART_ID_PREFIX.length).trim();
  return rawOwner || null;
}

export function hasExplicitDrawerBoxPaint(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return !!value && value !== 'mirror' && value !== 'glass';
}

export function resolveDrawerBoxPaintMaterial(args: {
  drawerBoxPartId: string;
  fallbackMaterial: unknown;
  getPartColorValue?: ((partId: string) => unknown) | null;
  getPartMaterial?: ((partId: string) => unknown) | null;
}): unknown {
  const value =
    typeof args.getPartColorValue === 'function' ? args.getPartColorValue(args.drawerBoxPartId) : undefined;
  if (!hasExplicitDrawerBoxPaint(value)) return args.fallbackMaterial;
  const material =
    typeof args.getPartMaterial === 'function' ? args.getPartMaterial(args.drawerBoxPartId) : null;
  return material || args.fallbackMaterial;
}
